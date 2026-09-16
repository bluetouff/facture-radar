// A calendar date preserves the source's precision; it is not a midnight notice.
export const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
export function incidentCalendarDate(value: string): string {
  if (isDateOnly(value)) return value;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function incidentDateAfter(a: string, b: string): boolean {
  return isDateOnly(a) || isDateOnly(b) ? incidentCalendarDate(a) > incidentCalendarDate(b) : Date.parse(a) > Date.parse(b);
}
export function formatIncidentDate(value: string | null): string {
  if (value === null) return "Date non publiée";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", ...(isDateOnly(value) ? {} : { timeStyle: "short" as const }), timeZone: "Europe/Paris" }).format(new Date(value));
}
