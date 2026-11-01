"""Read the first DGFiP worksheet without extracting or executing workbook content."""
import datetime
import io
import json
import posixpath
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
MAX_INPUT = 6 * 1024 * 1024
MAX_PART = 4 * 1024 * 1024


class NoDoctype(ET.TreeBuilder):
    def doctype(self, *_):
        raise ValueError("Declaration XML externe refusee")


def read_rows(data):
    if len(data) > MAX_INPUT or not data.startswith(b"PK\x03\x04"):
        raise ValueError("Classeur XLSX attendu (ZIP de 6 Mio maximum)")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        if len(entries) > 1000 or sum(e.file_size for e in entries) > 20 * 1024 * 1024:
            raise ValueError("Classeur trop volumineux")
        names = [e.filename for e in entries]
        if len(set(names)) != len(names) or any(n.startswith("/") or ".." in n.split("/") or "\\" in n for n in names):
            raise ValueError("Chemins ou doublons ZIP invalides")

        def xml(name):
            info = archive.getinfo(name)
            if info.file_size > MAX_PART:
                raise ValueError("Partie XLSX trop volumineuse")
            body = archive.read(info)
            return ET.fromstring(body, parser=ET.XMLParser(target=NoDoctype()))

        workbook = xml("xl/workbook.xml")
        sheets = workbook.find(MAIN + "sheets")
        if sheets is None or not len(sheets):
            raise ValueError("Classeur sans feuille")
        relationship_id = sheets[0].get(REL + "id")
        relationships = xml("xl/_rels/workbook.xml.rels")
        matches = [r for r in relationships if r.get("Id") == relationship_id]
        if len(matches) != 1 or matches[0].get("TargetMode") == "External":
            raise ValueError("Relation de feuille invalide")
        target = matches[0].get("Target", "")
        sheet_path = posixpath.normpath(target.lstrip("/") if target.startswith("/") else posixpath.join("xl", target))
        if not sheet_path.startswith("xl/worksheets/") or not sheet_path.endswith(".xml"):
            raise ValueError("Feuille hors perimetre")
        props = workbook.find(MAIN + "workbookPr")
        epoch = datetime.datetime(1904, 1, 1) if props is not None and props.get("date1904") in ("1", "true") else datetime.datetime(1899, 12, 30)
        strings = []
        if "xl/sharedStrings.xml" in names:
            strings = ["".join(t.text or "" for t in e.iter(MAIN + "t")) for e in xml("xl/sharedStrings.xml")]
        if len(strings) > 50000:
            raise ValueError("Trop de chaines XLSX")
        date_styles = set()
        if "xl/styles.xml" in names:
            styles = xml("xl/styles.xml")
            formats = {e.get("numFmtId"): e.get("formatCode", "") for e in styles.findall(MAIN + "numFmts/" + MAIN + "numFmt")}
            for index, style in enumerate(styles.findall(MAIN + "cellXfs/" + MAIN + "xf")):
                number = int(style.get("numFmtId", "0"))
                pattern = formats.get(str(number), "").lower()
                if number in {*range(14, 23), *range(27, 37), *range(45, 48), *range(50, 59)} or ("d" in pattern and ("m" in pattern or "y" in pattern)):
                    date_styles.add(index)
        result = []
        rows = xml(sheet_path).findall(MAIN + "sheetData/" + MAIN + "row")
        if len(rows) > 1000:
            raise ValueError("Trop de lignes XLSX")
        row_index = 0
        for row in rows:
            current_row = int(row.get("r", str(row_index + 1)))
            if current_row <= row_index or current_row > 10000:
                raise ValueError("Coordonnees de ligne invalides")
            row_index = current_row
            if row_index <= 2:
                continue
            values = [""] * 7
            seen = set()
            column_index = 0
            for cell in row:
                if cell.tag != MAIN + "c":
                    continue
                reference = cell.get("r", "")
                if reference:
                    match = re.fullmatch(r"([A-Z]+)([1-9][0-9]*)", reference)
                    if not match or int(match[2]) != row_index:
                        raise ValueError("Coordonnees de cellule invalides")
                    next_column = 0
                    for letter in match[1]:
                        next_column = next_column * 26 + ord(letter) - ord("A") + 1
                else:
                    next_column = column_index + 1
                if next_column <= column_index:
                    raise ValueError("Colonnes non ordonnees")
                column_index = next_column
                if column_index > 7:
                    continue
                column = chr(ord("A") + column_index - 1)
                if column in seen or cell.find(MAIN + "f") is not None:
                    raise ValueError("Cellule dupliquee ou formule inattendue")
                seen.add(column)
                kind = cell.get("t")
                value = cell.findtext(MAIN + "v", "")
                if kind == "s":
                    offset = int(value)
                    if offset < 0 or offset >= len(strings):
                        raise ValueError("Chaine partagee invalide")
                    value = strings[offset]
                elif kind == "inlineStr":
                    value = "".join(t.text or "" for t in cell.iter(MAIN + "t"))
                elif kind == "d":
                    value = datetime.date.fromisoformat(value.split("T")[0]).isoformat()
                elif value and int(cell.get("s", "0")) in date_styles:
                    value = (epoch + datetime.timedelta(days=float(value))).date().isoformat()
                values[ord(column) - ord("A")] = value.strip()
            if values[0]:
                result.append(values)
        if not result:
            raise ValueError("Annuaire sans operateur")
        return result


if __name__ == "__main__":
    try:
        print(json.dumps(read_rows(sys.stdin.buffer.read(MAX_INPUT + 1)), ensure_ascii=False))
    except (ValueError, KeyError, OverflowError, zipfile.BadZipFile, ET.ParseError) as error:
        sys.exit(f"Lecture XLSX impossible : {error}")
