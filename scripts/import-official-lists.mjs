import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { normalizePublicHttpUrl } from "../src/lib/urls.ts";

const approvedUrl = "https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/listes_plateformes_agreees/liste_pa_attente_rapport_audit.xlsx";
const pendingUrl = "https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/listes_plateformes_agreees/liste_pa_attente_test_interop.xlsx";

async function loadBuffer(localPath, url) {
  if (localPath) return readFile(localPath);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Téléchargement impossible ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function plainCell(cell) {
  const value = cell.value;
  if (value && typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text || "").join("").trim();
  }
  if (value && typeof value === "object" && "text" in value) {
    const text = value.text;
    if (typeof text === "string") return text.trim();
    if (text && typeof text === "object" && "richText" in text && Array.isArray(text.richText)) {
      return text.richText.map((part) => part.text || "").join("").trim();
    }
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value === null || value === undefined ? "" : String(value).trim();
}

async function parseWorkbook(buffer, includeDate) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Classeur sans feuille");
  const entries = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    const name = plainCell(row.getCell(1));
    if (!name) return;
    const entry = {
      name,
      street: plainCell(row.getCell(2)),
      postalCode: plainCell(row.getCell(3)),
      city: plainCell(row.getCell(4)),
      website: normalizePublicHttpUrl(plainCell(row.getCell(5)), `site de ${name}`),
      contact: plainCell(row.getCell(6)),
    };
    if (includeDate) entry.registeredAt = plainCell(row.getCell(7));
    entries.push(entry);
  });
  return entries;
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
