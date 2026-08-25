export type EvidenceStatus = "official" | "documented" | "declared" | "non_documented";
export type CompanySize = "micro" | "tpe" | "pme" | "eti" | "ge";
export type PricingKind = "free" | "paid" | "included" | "quote";

export interface Evidence<T> {
  value: T | null;
  status: EvidenceStatus;
  sourceIds: string[];
  checkedAt: string;
  note?: string;
}

export interface Pricing {
  kind: PricingKind;
  monthlyFrom: number | null;
  unit: "company" | "user" | "subscription" | "quote";
  freeFor: CompanySize[];
  promotionalPriceExcluded: boolean;
  label: string;
}

export interface Allowance {
  monthlyInvoices: number | null;
  annualInvoices: number | null;
  unlimited: boolean;
  label: string;
}

export interface Platform {
  slug: string;
  displayName: string;
  officialName: string;
  summary: string;
  targets: CompanySize[];
  ecosystem: string[];
  officialStatus: Evidence<"registered">;
  registeredAt: Evidence<string>;
  pricing: Evidence<Pricing>;
  allowance: Evidence<Allowance>;
  sendsInvoices: Evidence<boolean>;
  receivesInvoices: Evidence<boolean>;
  eReporting: Evidence<boolean>;
  bankAccountRequired: Evidence<boolean>;
  accountantAccess: Evidence<boolean>;
  publicApi: Evidence<{ available: boolean; includedInFree: boolean | null }>;
  exportDocumented: Evidence<boolean>;
  integrations: Evidence<string[]>;
  formats: Evidence<string[]>;
  hostingCountries: Evidence<string[]>;
  iso27001: Evidence<boolean>;
  commitmentMonths: Evidence<number>;
  importantUnknowns: string[];
}

export interface SourceRecord {
  id: string;
  title: string;
  publisher: string;
  url: string;
  type: "official-list" | "institutional" | "pricing" | "documentation" | "contract" | "security";
  accessedAt: string;
}

export interface DiagnosticInput {
  size: CompanySize;
  monthlyInvoices: number;
  freeOnly: boolean;
  noBankAccount: boolean;
  needsAccountantAccess: boolean;
  needsApi: boolean;
  needsInternationalReporting: boolean;
  priorities: Array<"simplicity" | "ecosystem" | "documentation" | "reversibility">;
}

export interface MatchResult {
  platform: Platform;
  eligible: boolean;
  compatibility: number;
  reasons: string[];
  blockers: string[];
  unknowns: string[];
  annualCost: number | null;
}
