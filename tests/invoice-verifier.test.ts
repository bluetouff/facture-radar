import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFacturXXml, MAX_FACTURX_XML_BYTES } from "../src/lib/invoice-verifier.ts";

function validInvoice(overrides: { grandTotal?: string; buyerId?: string; buyerVat?: string; taxes?: string } = {}): string {
  const grandTotal = overrides.grandTotal ?? "120.00";
  const buyerId = overrides.buyerId === undefined ? "987654321" : overrides.buyerId;
  const buyerVat = overrides.buyerVat === undefined ? "FR34987654321" : overrides.buyerVat;
  const taxes = overrides.taxes ?? `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>20.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>100.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:factur-x.eu:1p0:en16931</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>FA-2026-0042</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">20260825</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Entreprise Test</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID>123456789</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">FR12123456789</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Client Test</ram:Name>
        ${buyerId ? `<ram:SpecifiedLegalOrganization><ram:ID>${buyerId}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}
        ${buyerVat ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${buyerVat}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">20260824</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${taxes}
      <ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">20260924</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>100.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>100.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">20.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${grandTotal}</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

test("un Factur-X CII cohérent produit un prévol exploitable", () => {
  const analysis = analyzeFacturXXml(validInvoice(), "pdf");
  assert.equal(analysis.status, "usable");
  assert.equal(analysis.metadata.container, "pdf");
  assert.equal(analysis.metadata.profile, "EN 16931");
  assert.equal(analysis.metadata.invoiceNumber, "FA-2026-0042");
  assert.equal(analysis.metadata.lineCount, 1);
  assert.equal(analysis.metadata.grandTotal, 120);
  assert.equal(analysis.checks.find((check) => check.id === "arithmetic")?.status, "pass");
  assert.ok(analysis.actions.length <= 3);
});

test("l’identifiant officiel du profil EN16931 est reconnu", () => {
  const analysis = analyzeFacturXXml(validInvoice().replace("urn:factur-x.eu:1p0:en16931", "urn:cen.eu:en16931:2017"));
  assert.equal(analysis.status, "usable");
  assert.equal(analysis.metadata.profile, "EN 16931");
});

test("les données manquantes et un total incohérent deviennent des actions prioritaires", () => {
  const analysis = analyzeFacturXXml(validInvoice({ grandTotal: "121.00", buyerId: "", buyerVat: "" }));
  assert.equal(analysis.status, "action");
  assert.equal(analysis.checks.find((check) => check.id === "buyer")?.status, "fail");
  assert.equal(analysis.checks.find((check) => check.id === "arithmetic")?.status, "fail");
  assert.ok(analysis.actions.length <= 3);
});

test("une ventilation TVA incomplète reste explicitement à vérifier", () => {
  const analysis = analyzeFacturXXml(validInvoice({ taxes: "<ram:ApplicableTradeTax><ram:CalculatedAmount>20.00</ram:CalculatedAmount></ram:ApplicableTradeTax>" }));
  const taxCheck = analysis.checks.find((check) => check.id === "tax-breakdown");
  assert.equal(taxCheck?.status, "warning");
  assert.match(taxCheck?.action ?? "", /catégories, taux et montants/);
});

test("les documents mal formés ou hors CII échouent sans interprétation permissive", () => {
  assert.equal(analyzeFacturXXml("<CrossIndustryInvoice>").status, "unsupported");
  assert.equal(analyzeFacturXXml("<Invoice><ID>1</ID></Invoice>").status, "unsupported");
});

test("DOCTYPE, ENTITY et XML surdimensionné sont refusés avant analyse", () => {
  const dangerous = `<!DOCTYPE x [<!ENTITY payload "test">]><CrossIndustryInvoice>&payload;</CrossIndustryInvoice>`;
  const rejected = analyzeFacturXXml(dangerous);
  assert.equal(rejected.status, "unsupported");
  assert.match(rejected.checks[0]?.detail ?? "", /DOCTYPE et ENTITY/);
  assert.equal(analyzeFacturXXml(" ".repeat(MAX_FACTURX_XML_BYTES + 1)).status, "unsupported");
});
