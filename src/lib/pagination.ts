/** Clamp untrusted URL state and return a slice of the filtered collection. */
export function paginate<T>(items: readonly T[], requestedPage: string | number | null, pageSize: number) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new RangeError("Taille de page invalide");
  const parsed = typeof requestedPage === "number" ? requestedPage : Number(requestedPage);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, totalPages) : 1;
  const start = (page - 1) * pageSize;
  return { page, totalPages, total: items.length, start, items: items.slice(start, start + pageSize) };
}
