import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const reader = fileURLToPath(new URL("../scripts/lib/read-official-xlsx.py", import.meta.url));
const fixture = `import io, zipfile, base64, json, sys
options=json.loads(sys.stdin.read()); data=io.BytesIO()
main='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
with zipfile.ZipFile(data,'w',compression=zipfile.ZIP_DEFLATED) as z:
 z.writestr('xl/workbook.xml',f'<workbook xmlns="{main}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="{options.get("epoch",0)}"/><sheets><sheet name="PA" r:id="sheet"/></sheets></workbook>')
 z.writestr('xl/_rels/workbook.xml.rels',f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="sheet" Target="{options.get("target","worksheets/custom.xml")}"/></Relationships>')
 z.writestr('xl/sharedStrings.xml',f'<sst xmlns="{main}"><si><r><t>Entreprise </t></r><r><t>Test</t></r></si></sst>')
 z.writestr('xl/styles.xml',f'<styleSheet xmlns="{main}"><numFmts><numFmt numFmtId="164" formatCode="dd/mm/yy"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>')
 body=f'<worksheet xmlns="{main}"><sheetData><row r="3"><c r="A3" t="s"><v>{options.get("stringIndex",0)}</v></c><c r="B3" t="inlineStr"><is><r><t>Rue </t></r><r><t>des tests</t></r></is></c><c r="E3" t="inlineStr"><is><t>https://example.org/</t></is></c><c r="G3" s="1">{options.get("formula","")}<v>{options.get("date",46325)}</v></c></row></sheetData></worksheet>'
 z.writestr('xl/worksheets/custom.xml',options.get('body',body).encode(options.get('encoding','utf-8')))
 if options.get('traversal'):z.writestr('../outside','ignored')
print(base64.b64encode(data.getvalue()).decode())`;
function makeWorkbook(options: Record<string, unknown> = {}): Buffer {
  const result = spawnSync("python3", ["-c", fixture], { input: JSON.stringify(options), encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return Buffer.from(result.stdout.trim(), "base64");
}
function read(input: Buffer) {
  return spawnSync("python3", [reader], { input, encoding: "utf8", timeout: 20_000 });
}
test("XLSX DGFiP : première relation, chaînes riches et dates 1900/1904", () => {
  const current = read(makeWorkbook());
  assert.equal(current.status, 0, current.stderr);
  assert.deepEqual(JSON.parse(current.stdout), [["Entreprise Test", "Rue des tests", "", "", "https://example.org/", "", "2026-10-30"]]);
  const epoch = read(makeWorkbook({ epoch: 1, date: 0 }));
  assert.equal(epoch.status, 0, epoch.stderr);
  assert.equal(JSON.parse(epoch.stdout)[0][6], "1904-01-01");
});
test("XLSX DGFiP : format invalide, chemins, formules et références sont refusés", () => {
  for (const body of [Buffer.from('<html>Maintenance</html>'), makeWorkbook({ target: '../../outside.xml' }), makeWorkbook({ formula: '<f>1+1</f>' }), makeWorkbook({ stringIndex: -1 }), makeWorkbook({ traversal: true })]) {
    assert.notEqual(read(body).status, 0);
  }
});
test("XLSX DGFiP : XML externe et parties trop volumineuses sont refusés", () => {
  for (const body of ['<!DOCTYPE x [<!ENTITY x "test">]><x/>', 'a'.repeat(4 * 1024 * 1024 + 1)]) {
    assert.notEqual(read(makeWorkbook({ body })).status, 0);
  }
  assert.notEqual(read(Buffer.alloc(6 * 1024 * 1024 + 1)).status, 0);
  const dtd = '<?xml version="1.0" encoding="UTF-16"?><!DOCTYPE worksheet [<!ENTITY test "Company">]><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="3"><c r="A3" t="inlineStr"><is><t>&test;</t></is></c></row></sheetData></worksheet>';
  assert.notEqual(read(makeWorkbook({ body: dtd, encoding: "utf-16" })).status, 0);
});
test("XLSX DGFiP : coordonnées implicites conservées et annuaire vide refusé", () => {
  const body = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row><c t="inlineStr"><is><t>Titre</t></is></c></row><row/><row><c t="inlineStr"><is><t>Entreprise</t></is></c><c t="inlineStr"><is><t>Rue des tests</t></is></c></row></sheetData></worksheet>';
  const result = read(makeWorkbook({ body }));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [["Entreprise", "Rue des tests", "", "", "", "", ""]]);
  assert.notEqual(read(makeWorkbook({ body: '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>' })).status, 0);
});
