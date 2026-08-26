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
  registeredAt: evidence(z.iso.date()),
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

export const platformsSchema = z.array(platformSchema).length(25);
export const sourcesSchema = z.array(sourceSchema).min(12);

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

const labCaseId = z.enum(["service-simple", "multi-tva", "avoir"]);
const labStepId = z.enum(["import", "lecture", "integrite", "emission", "statut"]);
const labResultStatus = z.enum(["tested", "failed", "partial", "not_tested"]);

export const labSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  checkedAt: z.iso.date(),
  sourceIds: z.array(z.string().min(1)).min(1),
  cases: z.array(z.object({
    id: labCaseId,
    title: z.string().min(1).max(90),
    purpose: z.string().min(1).max(280),
    fileHref: z.string().regex(/^\/lab\/fixtures\/[a-z0-9-]+\.xml$/),
    fileVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().positive(),
    facturXHref: z.string().regex(/^\/lab\/fixtures\/[a-z0-9-]+\.pdf$/).optional(),
    facturXSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    facturXBytes: z.number().int().positive().optional(),
    facturXValidation: z.literal("passed").optional(),
    documentTypeCode: z.enum(["380", "381"]),
    expected: z.object({
      invoiceNumber: z.string().min(1).max(80),
      lineCount: z.number().int().positive(),
      vatRates: z.array(z.number().nonnegative()).min(1),
      grandTotal: z.number().positive(),
      currency: z.literal("EUR"),
    }).strict(),
    preflightStatus: z.literal("passed"),
    limitations: z.array(z.string().min(1).max(240)).min(1),
  }).strict()).length(3),
  protocol: z.array(z.object({
    id: labStepId,
    number: z.number().int().min(1).max(5),
    label: z.string().min(1).max(80),
    question: z.string().min(1).max(220),
    successDefinition: z.string().min(1).max(280),
  }).strict()).length(5),
  platforms: z.array(z.object({
    slug: z.enum(["qonto", "pennylane", "b2brouter"]),
    name: z.string().min(1).max(80),
    officialName: z.string().min(1).max(120),
    status: labResultStatus,
    evidenceLevel: z.enum(["observed", "documentation_only"]),
    summary: z.string().min(1).max(320),
    sourceIds: z.array(z.string().min(1)).min(1),
    testedAt: z.iso.datetime().nullable(),
    environment: z.string().min(1).max(120).nullable(),
    caseResults: z.array(z.object({
      caseId: labCaseId,
      status: labResultStatus,
      note: z.string().min(1).max(180),
    }).strict()).length(3),
    observations: z.array(z.object({
      stepId: labStepId,
      status: labResultStatus,
      evidenceIds: z.array(z.string().min(1)),
    }).strict()).length(5),
    sealAwarded: z.boolean(),
    nextAction: z.string().min(1).max(280),
  }).strict()).length(3),
}).strict();
