export const B2BROUTER_SANDBOX_ORIGIN = "https://api.b2brouter.net";
export const B2BROUTER_REVIEWED_API_VERSION = "2026-04-20";
export const B2BROUTER_MAX_IMPORT_BYTES = 1_000_000;
export const B2BROUTER_MAX_RESPONSE_BYTES = 64_000;

export interface B2BrouterSandboxCredentials {
  apiKey: string;
  accountId: string;
}

export interface B2BrouterImportResult {
  invoiceId: string;
  state: string | null;
}

export class B2BrouterLabError extends Error {
  readonly code: string;
  readonly publicMessage: string;

  constructor(code: string, publicMessage: string) {
    super(code);
    this.name = "B2BrouterLabError";
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

export class SandboxRequestBudget {
  private used = 0;
  readonly maximum: number;

  constructor(maximum: number = 3) {
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 10) {
      throw new B2BrouterLabError("INVALID_REQUEST_BUDGET", "Limite de requêtes locale invalide.");
    }
    this.maximum = maximum;
  }

  consume(): void {
    if (this.used >= this.maximum) {
      throw new B2BrouterLabError("REQUEST_BUDGET_EXHAUSTED", "Limite de requêtes atteinte. Aucun nouvel appel n’a été envoyé.");
    }
    this.used += 1;
  }

  get remaining(): number {
    return this.maximum - this.used;
  }
}

export function readB2BrouterSandboxCredentials(env: NodeJS.ProcessEnv): B2BrouterSandboxCredentials {
  const apiKey = env.B2BROUTER_SANDBOX_API_KEY ?? "";
  const accountId = env.B2BROUTER_SANDBOX_ACCOUNT_ID ?? "";

  if (!apiKey.startsWith("test_") || apiKey.length < 16 || apiKey.length > 256 || /\s|[\u0000-\u001f\u007f]/u.test(apiKey)) {
    throw new B2BrouterLabError("SANDBOX_KEY_REQUIRED", "Clé de sandbox absente ou refusée. Aucune requête n’a été envoyée.");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(accountId)) {
    throw new B2BrouterLabError("INVALID_ACCOUNT_ID", "Identifiant du compte de sandbox absent ou invalide. Aucune requête n’a été envoyée.");
  }

  return { apiKey, accountId };
}

export function buildB2BrouterImportUrl(accountId: string): URL {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(accountId)) {
    throw new B2BrouterLabError("INVALID_ACCOUNT_ID", "Identifiant du compte de sandbox invalide.");
  }
  const url = new URL(`/accounts/${encodeURIComponent(accountId)}/invoices/import`, B2BROUTER_SANDBOX_ORIGIN);
  url.searchParams.set("send_after_import", "false");
  url.searchParams.set("issued", "true");
  return url;
}

async function readResponseBody(response: Response): Promise<string> {
  const announcedLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(announcedLength) && announcedLength > B2BROUTER_MAX_RESPONSE_BYTES) {
    throw new B2BrouterLabError("RESPONSE_TOO_LARGE", "La réponse de la sandbox dépasse la limite locale.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > B2BROUTER_MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new B2BrouterLabError("RESPONSE_TOO_LARGE", "La réponse de la sandbox dépasse la limite locale.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function safeResponseValue(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value);
  if (normalized.length === 0 || normalized.length > maximumLength || /[\u0000-\u001f\u007f]/u.test(normalized)) return null;
  return normalized;
}

export async function importB2BrouterSandboxInvoice(options: {
  credentials: B2BrouterSandboxCredentials;
  invoiceFile: Uint8Array;
  requestBudget: SandboxRequestBudget;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<B2BrouterImportResult> {
  const { credentials, invoiceFile, requestBudget } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  readB2BrouterSandboxCredentials({
    B2BROUTER_SANDBOX_API_KEY: credentials.apiKey,
    B2BROUTER_SANDBOX_ACCOUNT_ID: credentials.accountId,
  });
  if (invoiceFile.byteLength < 1 || invoiceFile.byteLength > B2BROUTER_MAX_IMPORT_BYTES) {
    throw new B2BrouterLabError("INVALID_INVOICE_SIZE", "Le fichier est vide ou dépasse la limite locale.");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 30_000) {
    throw new B2BrouterLabError("INVALID_TIMEOUT", "Délai réseau local invalide.");
  }

  requestBudget.consume();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestBody = Uint8Array.from(invoiceFile).buffer;

  try {
    const response = await fetchImpl(buildB2BrouterImportUrl(credentials.accountId), {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/octet-stream",
        "X-B2B-API-Key": credentials.apiKey,
        "X-B2B-API-Version": B2BROUTER_REVIEWED_API_VERSION,
      },
      body: requestBody,
    });

    if (response.status !== 201) {
      throw new B2BrouterLabError("IMPORT_REJECTED", `La sandbox a refusé l’import (HTTP ${response.status}).`);
    }

    const rawBody = await readResponseBody(response);
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new B2BrouterLabError("INVALID_RESPONSE", "La sandbox a renvoyé une réponse illisible.");
    }

    if (!body || typeof body !== "object" || !("invoice" in body) || !body.invoice || typeof body.invoice !== "object") {
      throw new B2BrouterLabError("INVALID_RESPONSE", "La sandbox n’a pas renvoyé la facture importée.");
    }
    const invoice = body.invoice as Record<string, unknown>;
    const invoiceId = safeResponseValue(invoice.id, 80);
    if (!invoiceId) {
      throw new B2BrouterLabError("INVALID_RESPONSE", "La sandbox n’a pas renvoyé d’identifiant de facture exploitable.");
    }

    return { invoiceId, state: safeResponseValue(invoice.state, 60) };
  } catch (error) {
    if (error instanceof B2BrouterLabError) throw error;
    if (controller.signal.aborted) {
      throw new B2BrouterLabError("REQUEST_TIMEOUT", "La sandbox n’a pas répondu dans le délai prévu.");
    }
    throw new B2BrouterLabError("NETWORK_FAILURE", "Connexion à la sandbox impossible. Aucun nouvel essai automatique n’a été lancé.");
  } finally {
    clearTimeout(timeout);
  }
}
