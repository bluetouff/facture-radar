import test from "node:test";
import assert from "node:assert/strict";
import {
  B2BROUTER_REVIEWED_API_VERSION,
  B2BROUTER_SANDBOX_ORIGIN,
  B2BrouterLabError,
  buildB2BrouterImportUrl,
  importB2BrouterSandboxInvoice,
  readB2BrouterSandboxCredentials,
  SandboxRequestBudget,
} from "../src/lib/b2brouter-lab.ts";

const sandboxCredentials = {
  apiKey: ["test", "fixture", "only", "not", "a", "secret"].join("_"),
  accountId: "sandbox-account-123",
};
const fixture = new TextEncoder().encode("<xml>Données fictives</xml>");

test("seule une clé explicitement réservée à la sandbox est acceptée", () => {
  assert.deepEqual(readB2BrouterSandboxCredentials({
    B2BROUTER_SANDBOX_API_KEY: sandboxCredentials.apiKey,
    B2BROUTER_SANDBOX_ACCOUNT_ID: sandboxCredentials.accountId,
  }), sandboxCredentials);

  for (const apiKey of [undefined, "live_example-key-123456789", "example-key-123456789", "test_trop-court", "test_bad key-123456789"]) {
    assert.throws(
      () => readB2BrouterSandboxCredentials({
        B2BROUTER_SANDBOX_API_KEY: apiKey,
        B2BROUTER_SANDBOX_ACCOUNT_ID: sandboxCredentials.accountId,
      }),
      (error: unknown) => error instanceof B2BrouterLabError && error.code === "SANDBOX_KEY_REQUIRED",
    );
  }
});

test("l’URL d’import est fixe et désactive toujours l’envoi", () => {
  const url = buildB2BrouterImportUrl(sandboxCredentials.accountId);
  assert.equal(url.origin, B2BROUTER_SANDBOX_ORIGIN);
  assert.equal(url.pathname, `/accounts/${sandboxCredentials.accountId}/invoices/import`);
  assert.equal(url.searchParams.get("send_after_import"), "false");
  assert.equal(url.searchParams.get("issued"), "true");
  assert.throws(() => buildB2BrouterImportUrl("../../autre-hote"), B2BrouterLabError);
});

test("un import utilise un seul appel, refuse les redirections et ne demande aucun envoi", async () => {
  let calls = 0;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    calls += 1;
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ invoice: { id: 12345, state: "draft" } }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };

  const budget = new SandboxRequestBudget(1);
  const result = await importB2BrouterSandboxInvoice({
    credentials: sandboxCredentials,
    invoiceFile: fixture,
    requestBudget: budget,
    fetchImpl,
    timeoutMs: 1_000,
  });

  assert.deepEqual(result, { invoiceId: "12345", state: "draft" });
  assert.equal(calls, 1);
  assert.equal(budget.remaining, 0);
  const url = new URL(capturedUrl);
  assert.equal(url.origin, B2BROUTER_SANDBOX_ORIGIN);
  assert.equal(url.searchParams.get("send_after_import"), "false");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(capturedInit?.redirect, "error");
  const headers = new Headers(capturedInit?.headers);
  assert.equal(headers.get("X-B2B-API-Key"), sandboxCredentials.apiKey);
  assert.equal(headers.get("X-B2B-API-Version"), B2BROUTER_REVIEWED_API_VERSION);
  assert.equal(headers.get("Content-Type"), "application/octet-stream");
});

test("la limite locale bloque tout appel supplémentaire", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ invoice: { id: calls, state: "draft" } }), { status: 201 });
  };
  const budget = new SandboxRequestBudget(1);

  await importB2BrouterSandboxInvoice({ credentials: sandboxCredentials, invoiceFile: fixture, requestBudget: budget, fetchImpl });
  await assert.rejects(
    importB2BrouterSandboxInvoice({ credentials: sandboxCredentials, invoiceFile: fixture, requestBudget: budget, fetchImpl }),
    (error: unknown) => error instanceof B2BrouterLabError && error.code === "REQUEST_BUDGET_EXHAUSTED",
  );
  assert.equal(calls, 1);
});

test("une erreur réseau ne révèle jamais la clé", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error(`provider leaked ${sandboxCredentials.apiKey}`);
  };

  await assert.rejects(
    importB2BrouterSandboxInvoice({
      credentials: sandboxCredentials,
      invoiceFile: fixture,
      requestBudget: new SandboxRequestBudget(1),
      fetchImpl,
    }),
    (error: unknown) => {
      assert.ok(error instanceof B2BrouterLabError);
      assert.equal(error.code, "NETWORK_FAILURE");
      assert.doesNotMatch(error.publicMessage, new RegExp(sandboxCredentials.apiKey));
      return true;
    },
  );
});
