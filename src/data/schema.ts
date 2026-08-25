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

export const platformsSchema = z.array(platformSchema).length(12);
export const sourcesSchema = z.array(sourceSchema).min(12);
