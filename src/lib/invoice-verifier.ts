import { XMLParser } from "fast-xml-parser";
import { SaxesParser } from "saxes";

export const INVOICE_RULESET_VERSION = "FE-FR 3.2 · Factur-X CII D22B (prévol)";
export const INVOICE_RULESET_CHECKED_AT = "2026-08-25";
export const MAX_INVOICE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FACTURX_XML_BYTES = 2 * 1024 * 1024;
export const invoiceVerifierSourceIds = ["dgfip-specs-v3-2-2026", "dgfip-electronic-invoice-guide-2026", "fnfe-facturx-1-09-2-2026"] as const;

export type InvoiceContainer = "pdf" | "xml";
export type InvoiceAnalysisStatus = "usable" | "action" | "unsupported";
export type InvoiceCheckStatus = "pass" | "fail" | "warning";

export interface InvoiceCheck {
  id: string;
  label: string;
  status: InvoiceCheckStatus;
  detail: string;
  action?: string;
  sourceIds: string[];
}

export interface InvoiceMetadata {
  container: InvoiceContainer;
  profile: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  seller: string | null;
  buyer: string | null;
  currency: string | null;
  grandTotal: number | null;
  lineCount: number;
}

export interface InvoiceAnalysis {
  status: InvoiceAnalysisStatus;
  headline: string;
  summary: string;
  metadata: InvoiceMetadata;
  checks: InvoiceCheck[];
  actions: string[];
  ruleVersion: string;
  checkedAt: string;
  sourceIds: string[];
}

type XmlRecord = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  removeNSPrefix: true,
  allowBooleanAttributes: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  maxNestedTags: 80,
  onDangerousProperty: () => {
    throw new Error("Nom de propriété XML refusé");
  },
});

function asRecord(value: unknown): XmlRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as XmlRecord;
}

function asList(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function at(value: unknown, ...path: string[]): unknown {
  let current = first(value);
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = first(record[key]);
  }
  return current;
}

function textOf(value: unknown): string | null {
  const selected = first(value);
  if (typeof selected === "string" || typeof selected === "number") {
    const normalized = String(selected).trim();
    return normalized ? normalized.slice(0, 240) : null;
  }
  const record = asRecord(selected);
  if (!record) return null;
  return textOf(record["#text"]);
}

function amountOf(value: unknown): number | null {
  const raw = textOf(value)?.replace(/\s+/g, "").replace(",", ".");
  if (!raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasText(value: unknown): boolean {
  return textOf(value) !== null;
}

function partyIdentifiers(party: unknown): string[] {
  const identifiers = [
    textOf(at(party, "ID")),
    textOf(at(party, "GlobalID")),
    textOf(at(party, "SpecifiedLegalOrganization", "ID")),
    ...asList(at(party, "SpecifiedTaxRegistration")).map((registration) => textOf(at(registration, "ID"))),
  ];
  return [...new Set(identifiers.filter((value): value is string => Boolean(value)))];
}

function vatIdentifier(party: unknown): string | null {
  for (const registration of asList(at(party, "SpecifiedTaxRegistration"))) {
    const id = at(registration, "ID");
    const scheme = textOf(at(id, "@_schemeID")) ?? textOf(at(registration, "@_schemeID"));
    if (scheme?.toUpperCase() === "VA") return textOf(id);
  }
  return null;
}

function profileLabel(guideline: string | null): string | null {
  if (!guideline) return null;
  const normalized = guideline.toLowerCase();
  if (normalized === "urn:cen.eu:en16931:2017") return "EN 16931";
  if (!normalized.includes("factur-x.eu") && !normalized.includes("zugferd.de")) return null;
  if (normalized.includes("extended")) return "EXTENDED";
  if (normalized.includes("en16931")) return "EN 16931";
  if (normalized.includes("basicwl")) return "BASIC WL";
  if (normalized.includes("basic")) return "BASIC";
  if (normalized.includes("minimum")) return "MINIMUM";
  return "Factur-X, profil non identifié";
}

function emptyMetadata(container: InvoiceContainer): InvoiceMetadata {
  return {
    container,
    profile: null,
    invoiceNumber: null,
    issueDate: null,
    seller: null,
    buyer: null,
    currency: null,
    grandTotal: null,
    lineCount: 0,
  };
}

function unsupported(container: InvoiceContainer, headline: string, summary: string, detail: string): InvoiceAnalysis {
  return {
    status: "unsupported",
    headline,
    summary,
    metadata: emptyMetadata(container),
    checks: [{
      id: "structure",
      label: "Structure du fichier",
      status: "fail",
      detail,
      action: "Exportez une facture test au format Factur-X depuis votre outil, puis recommencez.",
      sourceIds: [...invoiceVerifierSourceIds],
    }],
    actions: ["Exportez une facture test au format Factur-X depuis votre outil, puis recommencez."],
    ruleVersion: INVOICE_RULESET_VERSION,
    checkedAt: INVOICE_RULESET_CHECKED_AT,
    sourceIds: [...invoiceVerifierSourceIds],
  };
}

export function analyzeFacturXXml(xml: string, container: InvoiceContainer = "xml"): InvoiceAnalysis {
  const xmlBytes = new TextEncoder().encode(xml).byteLength;
  if (xmlBytes === 0) return unsupported(container, "Le fichier est vide", "Aucune donnée structurée n'a été trouvée.", "Le fichier XML ne contient aucune donnée.");
  if (xmlBytes > MAX_FACTURX_XML_BYTES) {
    return unsupported(container, "Le XML est trop volumineux", "Le contrôle local s'arrête avant l'analyse.", "Le XML embarqué dépasse la limite défensive de 2 Mo.");
  }
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
    return unsupported(container, "Le XML contient une déclaration refusée", "Le fichier n'a pas été interprété.", "Les déclarations DOCTYPE et ENTITY sont refusées par sécurité.");
  }

  try {
    new SaxesParser({ xmlns: true }).write(xml).close();
  } catch {
    return unsupported(container, "Le XML est illisible", "La structure XML doit être corrigée avant tout contrôle métier.", "Le document XML est mal formé ou dépasse les limites acceptées.");
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    return unsupported(container, "Le XML est illisible", "La structure XML doit être corrigée avant tout contrôle métier.", "Le document XML est mal formé ou dépasse les limites acceptées.");
  }

  const root = at(parsed, "CrossIndustryInvoice");
  if (!root) {
    return unsupported(container, "Ce fichier n'est pas un Factur-X reconnu", "Cette première version contrôle uniquement le XML CII embarqué dans Factur-X.", "La racine CrossIndustryInvoice est absente.");
  }

  const context = at(root, "ExchangedDocumentContext");
  const document = at(root, "ExchangedDocument");
  const transaction = at(root, "SupplyChainTradeTransaction");
  const agreement = at(transaction, "ApplicableHeaderTradeAgreement");
  const delivery = at(transaction, "ApplicableHeaderTradeDelivery");
  const settlement = at(transaction, "ApplicableHeaderTradeSettlement");
  const seller = at(agreement, "SellerTradeParty");
  const buyer = at(agreement, "BuyerTradeParty");
  const monetary = at(settlement, "SpecifiedTradeSettlementHeaderMonetarySummation");
  const lines = asList(asRecord(first(transaction))?.IncludedSupplyChainTradeLineItem);
  const taxes = asList(asRecord(first(settlement))?.ApplicableTradeTax);
  const taxBreakdownComplete = taxes.some((tax) => hasText(at(tax, "CategoryCode")) && hasText(at(tax, "RateApplicablePercent")));

  const guideline = textOf(at(context, "GuidelineSpecifiedDocumentContextParameter", "ID"));
  const profile = profileLabel(guideline);
  const invoiceNumber = textOf(at(document, "ID"));
  const issueDate = textOf(at(document, "IssueDateTime", "DateTimeString"));
  const sellerName = textOf(at(seller, "Name"));
  const buyerName = textOf(at(buyer, "Name"));
  const sellerIds = partyIdentifiers(seller);
  const buyerIds = partyIdentifiers(buyer);
  const sellerVat = vatIdentifier(seller);
  const buyerVat = vatIdentifier(buyer);
  const currency = textOf(at(settlement, "InvoiceCurrencyCode"));
  const lineTotal = amountOf(at(monetary, "LineTotalAmount"));
  const taxBasis = amountOf(at(monetary, "TaxBasisTotalAmount"));
  const taxTotal = amountOf(at(monetary, "TaxTotalAmount"));
  const grandTotal = amountOf(at(monetary, "GrandTotalAmount"));
  const dueDate = textOf(at(settlement, "SpecifiedTradePaymentTerms", "DueDateDateTime", "DateTimeString"));
  const deliveryDate = textOf(at(delivery, "ActualDeliverySupplyChainEvent", "OccurrenceDateTime", "DateTimeString"));
  const totalsCoherent = taxBasis !== null && taxTotal !== null && grandTotal !== null
    ? Math.abs((taxBasis + taxTotal) - grandTotal) <= 0.02
    : false;

  const checks: InvoiceCheck[] = [];
  const add = (check: Omit<InvoiceCheck, "sourceIds">) => checks.push({ ...check, sourceIds: [...invoiceVerifierSourceIds] });
  const required = (id: string, label: string, present: boolean, detail: string, action: string) => add({
    id,
    label,
    status: present ? "pass" : "fail",
    detail: present ? detail : `Champ structuré absent : ${detail}`,
    action: present ? undefined : action,
  });

  required("profile", "Profil Factur-X", profile !== null && profile !== "Factur-X, profil non identifié", profile ?? "identifiant de profil", "Demandez à votre outil d'exporter un profil Factur-X explicite.");
  required("invoice-number", "Numéro de facture", invoiceNumber !== null, invoiceNumber ?? "numéro de facture", "Ajoutez un numéro de facture dans les données structurées.");
  required("issue-date", "Date d'émission", issueDate !== null, issueDate ?? "date d'émission", "Renseignez la date d'émission structurée.");
  required("seller", "Vendeur", sellerName !== null && sellerIds.length > 0, sellerName ? `${sellerName}, identifiant trouvé` : "nom et identifiant du vendeur", "Complétez le nom et l'identifiant structuré du vendeur.");
  required("buyer", "Acheteur", buyerName !== null && buyerIds.length > 0, buyerName ? `${buyerName}, identifiant trouvé` : "nom et identifiant de l'acheteur", "Complétez le nom et l'identifiant structuré de l'acheteur.");
  required("currency", "Devise", currency !== null, currency ?? "devise de facturation", "Renseignez la devise dans le XML Factur-X.");
  required("lines", "Lignes de facture", lines.length > 0, `${lines.length} ligne${lines.length > 1 ? "s" : ""} structurée${lines.length > 1 ? "s" : ""}`, "Ajoutez au moins une ligne de facture structurée.");
  required("totals", "Totaux", lineTotal !== null && taxBasis !== null && taxTotal !== null && grandTotal !== null, "totaux HT, base TVA, TVA et TTC", "Complétez les quatre totaux structurés.");
  required("arithmetic", "Cohérence des totaux", totalsCoherent, totalsCoherent ? "Base TVA + TVA correspond au total TTC" : "base TVA + TVA = total TTC", "Corrigez l'écart entre base TVA, TVA et total TTC.");

  add({
    id: "tax-identifiers",
    label: "Identifiants TVA",
    status: sellerVat && buyerVat ? "pass" : "warning",
    detail: sellerVat && buyerVat ? "Identifiants TVA vendeur et acheteur présents" : "Au moins un identifiant TVA n'a pas été trouvé dans les données structurées.",
    action: sellerVat && buyerVat ? undefined : "Vérifiez les identifiants TVA lorsque l'opération y est soumise.",
  });
  add({
    id: "tax-breakdown",
    label: "Ventilation TVA",
    status: taxBreakdownComplete ? "pass" : "warning",
    detail: taxBreakdownComplete ? `${taxes.length} ventilation${taxes.length > 1 ? "s" : ""} TVA complète${taxes.length > 1 ? "s" : ""}` : "Aucune ventilation TVA complète n'a été trouvée.",
    action: taxBreakdownComplete ? undefined : "Vérifiez les catégories, taux et montants de TVA dans l'export.",
  });
  add({
    id: "dates",
    label: "Dates d'exécution et de paiement",
    status: dueDate || deliveryDate ? "pass" : "warning",
    detail: dueDate || deliveryDate ? "Une date de livraison, d'exécution ou d'échéance est structurée." : "Aucune date de livraison, d'exécution ou d'échéance n'a été trouvée.",
    action: dueDate || deliveryDate ? undefined : "Ajoutez les dates applicables à l'opération et au paiement.",
  });

  const blocking = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warning");
  const actions = [...blocking, ...warnings]
    .map((check) => check.action)
    .filter((action): action is string => Boolean(action))
    .slice(0, 3);
  const status: InvoiceAnalysisStatus = blocking.length > 0 ? "action" : "usable";

  return {
    status,
    headline: status === "usable"
      ? "La structure principale est exploitable"
      : `${blocking.length} point${blocking.length > 1 ? "s" : ""} bloquant${blocking.length > 1 ? "s" : ""} à corriger`,
    summary: status === "usable"
      ? `${checks.filter((check) => check.status === "pass").length} contrôles réussis${warnings.length ? `, ${warnings.length} point${warnings.length > 1 ? "s" : ""} à vérifier` : ""}.`
      : `Le fichier a été lu, mais il ne devrait pas être utilisé comme test concluant avant correction.`,
    metadata: {
      container,
      profile,
      invoiceNumber,
      issueDate,
      seller: sellerName,
      buyer: buyerName,
      currency,
      grandTotal,
      lineCount: lines.length,
    },
    checks,
    actions: actions.length > 0 ? actions : ["Testez ensuite ce même fichier dans votre plateforme agréée avant votre échéance."],
    ruleVersion: INVOICE_RULESET_VERSION,
    checkedAt: INVOICE_RULESET_CHECKED_AT,
    sourceIds: [...invoiceVerifierSourceIds],
  };
}
