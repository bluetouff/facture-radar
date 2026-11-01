import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normalizePublicHttpUrl } from "../src/lib/urls.ts";

const approvedUrl = "https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/listes_plateformes_agreees/liste_pa_attente_rapport_audit.xlsx";
const pendingUrl = "https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/listes_plateformes_agreees/liste_pa_attente_test_interop.xlsx";

async function loadBuffer(localPath, url) {
  if (localPath) return readFile(localPath);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Téléchargement impossible ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function parseWorkbook(buffer, includeDate) {
  const result = spawnSync("python3", [fileURLToPath(new URL("./lib/read-official-xlsx.py", import.meta.url))], {
    input: buffer, encoding: "utf8", maxBuffer: 2 * 1024 * 1024, timeout: 20_000,
  });
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.error?.message || "Lecture XLSX impossible");
  const rows = JSON.parse(result.stdout);
  return rows.map(row => {
    const [name, street, postalCode, city, website, contact, registeredAt] = row;
    const entry = {
      name,
      street, postalCode, city,
      website: normalizePublicHttpUrl(website, `site de ${name}`),
      contact,
    };
    if (includeDate) entry.registeredAt = registeredAt;
    return entry;
  });
}

const approvedBuffer = await loadBuffer(process.env.APPROVED_XLSX, approvedUrl);
const pendingBuffer = await loadBuffer(process.env.PENDING_XLSX, pendingUrl);
const snapshotDate = process.env.OFFICIAL_SNAPSHOT_DATE || new Date().toISOString().slice(0, 10);
const payload = {
  snapshotDate,
  sourcePage: "https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees",
  approvedSource: approvedUrl,
  pendingSource: pendingUrl,
  approvedSha256: createHash("sha256").update(approvedBuffer).digest("hex"),
  pendingSha256: createHash("sha256").update(pendingBuffer).digest("hex"),
  approved: await parseWorkbook(approvedBuffer, true),
  pending: await parseWorkbook(pendingBuffer, false),
};

await writeFile(new URL("../src/data/official-directory.json", import.meta.url), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Annuaire écrit : ${payload.approved.length} approuvées, ${payload.pending.length} en attente.`);
