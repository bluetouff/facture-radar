import { z } from "zod";
import { isPublicHttpUrl } from "../lib/urls.ts";

const evidenceStatus = z.enum(["official", "documented", "declared", "non_documented"]);
const companySize = z.enum(["micro", "tpe", "pme", "eti", "ge"]);

const evidence = <T extends z.ZodType>(value: T) => z.object({
  value: value.nullable(),
  status: evidenceStatus,
  sourceIds: z.array(z.string()),
  checkedAt: z.iso.date(),
  note: z.string().optional(),
});

const pricing = z.object({
  kind: z.enum(["free", "paid", "included", "quote"]),
  monthlyFrom: z.number().nonnegative().nullable(),
  unit: z.enum(["company", "user", "subscription", "quote"]),
  freeFor: z.array(companySize),
  promotionalPriceExcluded: z.boolean(),
  label: z.string().min(1),
});

const allowance = z.object({
  monthlyInvoices: z.number().int().nonnegative().nullable(),
  annualInvoices: z.number().int().nonnegative().nullable(),
  unlimited: z.boolean(),
  label: z.string().min(1),
});

export const platformSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  officialName: z.string().min(1),
  summary: z.string().min(1),
  targets: z.array(companySize).min(1),
  ecosystem: z.array(z.string()),
  officialStatus: evidence(z.literal("registered")),
  registeredAt: evidence(z.union([z.iso.date(), z.literal("à venir")])),
  pricing: evidence(pricing),
  allowance: evidence(allowance),
  sendsInvoices: evidence(z.boolean()),
  receivesInvoices: evidence(z.boolean()),
  eReporting: evidence(z.boolean()),
  bankAccountRequired: evidence(z.boolean()),
  accountantAccess: evidence(z.boolean()),
  publicApi: evidence(z.object({ available: z.boolean(), includedInFree: z.boolean().nullable() })),
  exportDocumented: evidence(z.boolean()),
  integrations: evidence(z.array(z.string())),
  formats: evidence(z.array(z.string())),
  hostingCountries: evidence(z.array(z.string())),
  iso27001: evidence(z.boolean()),
  commitmentMonths: evidence(z.number().int().nonnegative()),
  importantUnknowns: z.array(z.string()),
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url().refine(isPublicHttpUrl, "Seules les URL HTTP et HTTPS sont autorisées"),
  type: z.enum(["official-list", "institutional", "pricing", "documentation", "contract", "security"]),
  accessedAt: z.iso.date(),
});

export const platformsSchema = z.array(platformSchema).length(148);
export const sourcesSchema = z.array(sourceSchema).min(12);

const capabilityAvailability = z.object({
  stage: z.enum(["available", "limited", "beta", "announced"]),
  scope: z.string().min(1),
}).strict();

export const platformResearchSchema = z.object({
  platformSlug: z.string().regex(/^[a-z0-9-]+$/),
  availability: z.object({
    sendsInvoices: evidence(capabilityAvailability),
    receivesInvoices: evidence(capabilityAvailability),
    eReporting: evidence(capabilityAvailability),
  }).strict(),
  directImport: evidence(z.object({
    acceptsThirdPartyFile: z.boolean(),
    formats: z.array(z.string().min(1)),
    preservesEmbeddedXml: z.boolean().nullable(),
    requiresReentry: z.boolean().nullable(),
  }).strict()),
  overagePricing: evidence(z.string().min(1)),
  exitTerms: evidence(z.object({
    bulkExport: z.boolean().nullable(),
    formats: z.array(z.string().min(1)),
    postTerminationAccess: z.string().min(1).nullable(),
    fees: z.string().min(1).nullable(),
  }).strict()),
  terminationTerms: evidence(z.string().min(1)),
  hostingProviders: evidence(z.array(z.string().min(1))),
  declaredSubprocessors: evidence(z.array(z.string().min(1))),
}).strict();

export const platformResearchProfilesSchema = z.array(platformResearchSchema).length(148);

export const publicSiteObservationSchema = z.object({
  platformSlug: z.string().regex(/^[a-z0-9-]+$/),
  status: z.enum(["observed", "blocked", "not_scanned"]),
  scanUrl: z.url().refine(isPublicHttpUrl, "Seules les URL HTTP et HTTPS sont autorisées").nullable(),
  finalUrl: z.url().refine(isPublicHttpUrl, "Seules les URL HTTP et HTTPS sont autorisées").nullable(),
  checkedAt: z.iso.date().nullable(),
  consentState: z.literal("before-choice"),
  methodologyVersion: z.literal("1.0"),
  trackers: z.array(z.object({
    domain: z.string().min(1),
    entity: z.string().min(1),
    categories: z.array(z.string().min(1)),
    source: z.literal("DuckDuckGo Tracker Radar"),
  }).strict()),
  thirdPartyDomains: z.array(z.string().min(1)),
  note: z.string().min(1),
}).strict();

export const publicSiteObservationsSchema = z.array(publicSiteObservationSchema).length(148);

const passportFactSchema = z.object({
  id: z.enum(["entry", "format", "transmission", "integrity"]),
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(120),
  detail: z.string().min(1).max(420),
  state: z.enum(["documented", "confirm", "not_published"]),
  sourceIds: z.array(z.string().min(1)),
}).strict();

export const passportRoutesSchema = z.array(z.object({
  slug: z.enum(["qonto", "pennylane", "b2brouter", "superpdp", "tiime", "abby"]),
  name: z.string().min(1).max(80),
  officialName: z.string().min(1).max(120),
  routeState: z.enum(["documented", "constrained", "unknown"]),
  routeLabel: z.string().min(1).max(120),
  channel: z.string().min(1).max(120),
  summary: z.string().min(1).max(420),
  facts: z.array(passportFactSchema).length(4),
  cost: z.object({
    value: z.string().min(1).max(120),
    detail: z.string().min(1).max(420),
    sourceIds: z.array(z.string().min(1)).min(1),
  }).strict(),
  decisiveTest: z.string().min(1).max(420),
  nextStep: z.string().min(1).max(420),
  profileHref: z.string().regex(/^\/plateformes\/[a-z0-9-]+\/$/).nullable(),
  checkedAt: z.iso.date(),
}).strict()).length(6);
