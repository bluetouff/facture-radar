export function normalizePublicHttpUrl(value: string, label = "URL"): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} invalide`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} : protocole interdit`);
  }
  return parsed.href;
}

export function isPublicHttpUrl(value: string): boolean {
  try {
    normalizePublicHttpUrl(value);
    return true;
  } catch {
    return false;
  }
}
