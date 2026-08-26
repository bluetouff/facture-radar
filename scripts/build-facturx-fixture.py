#!/usr/bin/env python3
"""Build the human-readable base PDF for the synthetic PA Check Factur-X fixture."""

from __future__ import annotations

import argparse
import hashlib
from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from pypdf import PdfWriter
from pypdf.generic import (
    ArrayObject,
    BooleanObject,
    ByteStringObject,
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
    NumberObject,
    TextStringObject,
)


PAGE_WIDTH, PAGE_HEIGHT = A4
INK = colors.HexColor("#10243A")
BLUE = colors.HexColor("#4865D8")
GREEN = colors.HexColor("#17856F")
MINT = colors.HexColor("#EAF8F4")
PALE = colors.HexColor("#F4F7FB")
LINE = colors.HexColor("#DDE4EC")
MUTED = colors.HexColor("#66778A")


def register_fonts() -> None:
    regular = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    bold = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
    if not regular.is_file() or not bold.is_file():
        raise SystemExit("Arial TTF fonts are required to build this fixture")
    pdfmetrics.registerFont(TTFont("PARegular", regular))
    pdfmetrics.registerFont(TTFont("PABold", bold))


def text(pdf: canvas.Canvas, x: float, y: float, value: str, *, size: float = 9, font: str = "PARegular", color=INK) -> None:
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    pdf.drawString(x, y, value)


def right_text(pdf: canvas.Canvas, x: float, y: float, value: str, *, size: float = 9, font: str = "PARegular", color=INK) -> None:
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    pdf.drawRightString(x, y, value)


def rounded_box(pdf: canvas.Canvas, x: float, y: float, width: float, height: float, *, fill, stroke=LINE, radius: float = 10) -> None:
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke)
    pdf.roundRect(x, y, width, height, radius, fill=1, stroke=1)


def build_base(output: Path) -> None:
    register_fonts()
    output.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(output), pagesize=A4, pageCompression=1, invariant=1, pdfVersion=(1, 7))
    pdf.setTitle("Facture de test PA Check - Factur-X EN16931")
    pdf.setAuthor("PA Check")
    pdf.setSubject("Donnees entierement fictives pour environnement de test")

    margin = 42
    content_width = PAGE_WIDTH - 2 * margin

    # Brand mark and invoice identity.
    pdf.setFillColor(INK)
    pdf.roundRect(margin, PAGE_HEIGHT - 91, 36, 36, 10, fill=1, stroke=0)
    text(pdf, margin + 9, PAGE_HEIGHT - 78, "PA", size=13, font="PABold", color=colors.white)
    text(pdf, margin + 48, PAGE_HEIGHT - 68, "PA CHECK", size=8, font="PABold", color=BLUE)
    text(pdf, margin + 48, PAGE_HEIGHT - 84, "Facture de test", size=14, font="PABold")
    right_text(pdf, PAGE_WIDTH - margin, PAGE_HEIGHT - 67, "FACTURE", size=24, font="PABold")
    right_text(pdf, PAGE_WIDTH - margin, PAGE_HEIGHT - 84, "LAB-FX-EN16931-001", size=9, font="PABold", color=BLUE)

    rounded_box(pdf, margin, PAGE_HEIGHT - 132, content_width, 25, fill=MINT, stroke=MINT, radius=8)
    text(pdf, margin + 12, PAGE_HEIGHT - 123, "DOCUMENT 100 % FICTIF - A UTILISER UNIQUEMENT DANS UN ESPACE DE TEST", size=7.4, font="PABold", color=GREEN)

    # Dates.
    meta_y = PAGE_HEIGHT - 171
    text(pdf, margin, meta_y, "Date d'emission", size=7.2, font="PABold", color=MUTED)
    text(pdf, margin, meta_y - 15, "26/08/2026", size=10, font="PABold")
    text(pdf, margin + 132, meta_y, "Date de livraison", size=7.2, font="PABold", color=MUTED)
    text(pdf, margin + 132, meta_y - 15, "26/08/2026", size=10, font="PABold")
    text(pdf, margin + 278, meta_y, "Echeance", size=7.2, font="PABold", color=MUTED)
    text(pdf, margin + 278, meta_y - 15, "25/09/2026", size=10, font="PABold")
    right_text(pdf, PAGE_WIDTH - margin, meta_y, "Devise", size=7.2, font="PABold", color=MUTED)
    right_text(pdf, PAGE_WIDTH - margin, meta_y - 15, "EUR", size=10, font="PABold")

    # Parties.
    party_y = PAGE_HEIGHT - 315
    gap = 12
    party_width = (content_width - gap) / 2
    rounded_box(pdf, margin, party_y, party_width, 101, fill=PALE)
    rounded_box(pdf, margin + party_width + gap, party_y, party_width, 101, fill=colors.white)
    text(pdf, margin + 14, party_y + 80, "EMETTEUR FICTIF", size=7.3, font="PABold", color=BLUE)
    text(pdf, margin + 14, party_y + 60, "ATELIER TEST PA CHECK", size=11, font="PABold")
    text(pdf, margin + 14, party_y + 44, "1 RUE EXEMPLE - 75000 PARIS - FR", size=8.2, color=MUTED)
    text(pdf, margin + 14, party_y + 28, "SIREN 000000000", size=8.2, color=MUTED)
    text(pdf, margin + 14, party_y + 13, "TVA FR00000000000", size=8.2, color=MUTED)
    buyer_x = margin + party_width + gap + 14
    text(pdf, buyer_x, party_y + 80, "CLIENT FICTIF", size=7.3, font="PABold", color=GREEN)
    text(pdf, buyer_x, party_y + 60, "ENTREPRISE DEMO HORIZON", size=11, font="PABold")
    text(pdf, buyer_x, party_y + 44, "2 AVENUE FICTIVE - 69000 LYON - FR", size=8.2, color=MUTED)
    text(pdf, buyer_x, party_y + 28, "SIREN 111111111", size=8.2, color=MUTED)
    text(pdf, buyer_x, party_y + 13, "Reference LAB-BUYER-REF", size=8.2, color=MUTED)

    # Line item table.
    table_top = party_y - 33
    pdf.setFillColor(INK)
    pdf.roundRect(margin, table_top - 25, content_width, 25, 7, fill=1, stroke=0)
    text(pdf, margin + 12, table_top - 17, "DESCRIPTION", size=7.2, font="PABold", color=colors.white)
    right_text(pdf, margin + 369, table_top - 17, "QTE", size=7.2, font="PABold", color=colors.white)
    right_text(pdf, margin + 446, table_top - 17, "PRIX HT", size=7.2, font="PABold", color=colors.white)
    right_text(pdf, PAGE_WIDTH - margin - 12, table_top - 17, "TOTAL HT", size=7.2, font="PABold", color=colors.white)
    rounded_box(pdf, margin, table_top - 78, content_width, 46, fill=colors.white, radius=7)
    text(pdf, margin + 12, table_top - 54, "Prestation de test Factur-X EN16931", size=9.2, font="PABold")
    text(pdf, margin + 12, table_top - 68, "Cas simple - TVA 20 %", size=7.5, color=MUTED)
    right_text(pdf, margin + 369, table_top - 57, "1", size=9)
    right_text(pdf, margin + 446, table_top - 57, "100,00 EUR", size=9)
    right_text(pdf, PAGE_WIDTH - margin - 12, table_top - 57, "100,00 EUR", size=9, font="PABold")

    # Payment and totals.
    payment_y = table_top - 203
    rounded_box(pdf, margin, payment_y, 281, 93, fill=PALE)
    text(pdf, margin + 14, payment_y + 72, "REGLEMENT", size=7.3, font="PABold", color=BLUE)
    text(pdf, margin + 14, payment_y + 52, "Virement - 30 jours", size=10, font="PABold")
    text(pdf, margin + 14, payment_y + 35, "Compte : COMPTE-TEST-PA-CHECK", size=8.2, color=MUTED)
    text(pdf, margin + 14, payment_y + 18, "Ne correspond a aucun compte bancaire reel.", size=8.2, color=MUTED)

    totals_x = PAGE_WIDTH - margin - 202
    text(pdf, totals_x, payment_y + 77, "Total HT", size=8.4, color=MUTED)
    right_text(pdf, PAGE_WIDTH - margin, payment_y + 77, "100,00 EUR", size=9, font="PABold")
    text(pdf, totals_x, payment_y + 55, "TVA 20 %", size=8.4, color=MUTED)
    right_text(pdf, PAGE_WIDTH - margin, payment_y + 55, "20,00 EUR", size=9, font="PABold")
    pdf.setStrokeColor(LINE)
    pdf.line(totals_x, payment_y + 43, PAGE_WIDTH - margin, payment_y + 43)
    text(pdf, totals_x, payment_y + 20, "A payer", size=10, font="PABold")
    right_text(pdf, PAGE_WIDTH - margin, payment_y + 18, "120,00 EUR", size=15, font="PABold", color=GREEN)

    # Hybrid-document explanation.
    expl_y = 99
    pdf.setStrokeColor(LINE)
    pdf.line(margin, expl_y + 38, PAGE_WIDTH - margin, expl_y + 38)
    text(pdf, margin, expl_y + 18, "FACTUR-X", size=7.2, font="PABold", color=BLUE)
    text(pdf, margin + 59, expl_y + 18, "Cette page lisible contient aussi les memes donnees en XML EN16931.", size=8.2, color=MUTED)
    text(pdf, margin, expl_y - 1, "Le fichier joint se nomme factur-x.xml. Montants et identites correspondent a cette page.", size=8.2, color=MUTED)
    text(pdf, margin, 45, "PA Check - fixture locale v2.0.0 - aucune valeur ne doit etre utilisee en production", size=7.1, color=MUTED)
    right_text(pdf, PAGE_WIDTH - margin, 45, "1 / 1", size=7.1, color=MUTED)

    pdf.showPage()
    pdf.save()


def xmp_packet() -> bytes:
    return b'''<?xpacket begin="\xef\xbb\xbf" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="PA Check fixture builder">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" pdfaid:part="3" pdfaid:conformance="B"/>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Facture de test PA Check - Factur-X EN16931</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>PA Check</rdf:li></rdf:Seq></dc:creator>
      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">Donnees entierement fictives pour environnement de test</rdf:li></rdf:Alt></dc:description>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" pdf:Producer="PA Check fixture builder"/>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmp:CreatorTool="PA Check fixture builder" xmp:CreateDate="2026-08-26T00:00:00Z" xmp:ModifyDate="2026-08-26T00:00:00Z" xmp:MetadataDate="2026-08-26T00:00:00Z"/>
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#" fx:DocumentType="INVOICE" fx:DocumentFileName="factur-x.xml" fx:Version="1.0" fx:ConformanceLevel="EN 16931"/>
    <rdf:Description rdf:about=""
      xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
      xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
      xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
                <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentFileName</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Name of the embedded XML invoice</pdfaProperty:description></rdf:li>
                <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentType</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Type of the hybrid document</pdfaProperty:description></rdf:li>
                <rdf:li rdf:parseType="Resource"><pdfaProperty:name>Version</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Factur-X version</pdfaProperty:description></rdf:li>
                <rdf:li rdf:parseType="Resource"><pdfaProperty:name>ConformanceLevel</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Factur-X conformance level</pdfaProperty:description></rdf:li>
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''


def build_facturx(base_pdf: Path, xml_path: Path, icc_path: Path, output: Path) -> None:
    xml = xml_path.read_bytes()
    writer = PdfWriter(clone_from=str(base_pdf))
    writer.pdf_header = "%PDF-1.7"
    writer.add_metadata({
        "/Title": "Facture de test PA Check - Factur-X EN16931",
        "/Author": "PA Check",
        "/Subject": "Donnees entierement fictives pour environnement de test",
        "/Creator": "PA Check fixture builder",
        "/Producer": "PA Check fixture builder",
        "/CreationDate": "D:20260826000000Z",
        "/ModDate": "D:20260826000000Z",
    })

    root = writer.root_object
    root[NameObject("/Lang")] = TextStringObject("fr-FR")
    root[NameObject("/MarkInfo")] = DictionaryObject({NameObject("/Marked"): BooleanObject(False)})

    metadata = DecodedStreamObject()
    metadata.set_data(xmp_packet())
    metadata.update({NameObject("/Type"): NameObject("/Metadata"), NameObject("/Subtype"): NameObject("/XML")})
    root[NameObject("/Metadata")] = writer._add_object(metadata)

    icc = DecodedStreamObject()
    icc.set_data(icc_path.read_bytes())
    icc[NameObject("/N")] = NumberObject(3)
    icc_reference = writer._add_object(icc)
    output_intent = DictionaryObject({
        NameObject("/Type"): NameObject("/OutputIntent"),
        NameObject("/S"): NameObject("/GTS_PDFA1"),
        NameObject("/OutputConditionIdentifier"): TextStringObject("sRGB IEC61966-2.1"),
        NameObject("/OutputCondition"): TextStringObject("sRGB IEC61966-2.1"),
        NameObject("/RegistryName"): TextStringObject("http://www.color.org"),
        NameObject("/Info"): TextStringObject("sRGB IEC61966-2.1"),
        NameObject("/DestOutputProfile"): icc_reference,
    })
    root[NameObject("/OutputIntents")] = ArrayObject([writer._add_object(output_intent)])

    attachment = writer.add_attachment("factur-x.xml", xml)
    attachment.alternative_name = TextStringObject("factur-x.xml")
    attachment.description = TextStringObject("Factur-X EN16931 invoice data")
    attachment.associated_file_relationship = NameObject("/Alternative")
    attachment.subtype = NameObject("/text/xml")
    attachment.size = NumberObject(len(xml))
    attachment.checksum = ByteStringObject(hashlib.md5(xml, usedforsecurity=False).digest())
    fixed_date = datetime(2026, 8, 26, tzinfo=timezone.utc)
    attachment.creation_date = fixed_date
    attachment.modification_date = fixed_date
    root[NameObject("/AF")] = ArrayObject([attachment.pdf_object.indirect_reference])

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as handle:
        writer.write(handle)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--xml", type=Path, required=True)
    parser.add_argument("--icc", type=Path, default=Path("/System/Library/ColorSync/Profiles/sRGB Profile.icc"))
    args = parser.parse_args()
    output = args.output.resolve()
    xml = args.xml.resolve()
    icc = args.icc.resolve()
    if not xml.is_file() or not icc.is_file():
        raise SystemExit("The XML fixture and sRGB ICC profile are required")
    base_pdf = Path("tmp/pdfs") / f"{output.stem}.base.pdf"
    build_base(base_pdf)
    build_facturx(base_pdf, xml, icc, output)
    print(f"FACTURX_FIXTURE_OK {output} {output.stat().st_size} bytes sha256={hashlib.sha256(output.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()
