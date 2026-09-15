import { sanitizeSelection } from "../lib/explorer";

const storageKey = "pa-check-comparison-v1";
let ids: string[] | undefined;
let allowed = new Set<string>();
export const selectionEvent = "pa-check-selection";

export function selectionIds(): string[] {
  if (ids) return [...ids];
  const root = document.querySelector<HTMLElement>("[data-selection-catalog]");
  const catalog: { slug: string }[] = JSON.parse(root?.dataset.selectionCatalog || "[]");
  allowed = new Set(catalog.map(item => item.slug));
  let stored: unknown = [];
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw && raw.length < 2000) stored = JSON.parse(raw);
  } catch { /* The comparison also works when browser storage is disabled. */ }
  const query = new URLSearchParams(location.search);
  if (location.pathname === "/comparer/" && query.has("ids")) stored = (query.get("ids") || "").slice(0, 2000).split(",");
  ids = sanitizeSelection(stored, allowed);
  try { sessionStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* In-memory fallback. */ }
  return [...ids];
}

export function restoreSelection(): void {
  selectionIds();
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw && raw.length < 2000) ids = sanitizeSelection(JSON.parse(raw), allowed);
  } catch { /* Keep the current selection if storage is unavailable. */ }
  document.dispatchEvent(new CustomEvent(selectionEvent));
}

export function setSelection(value: string[]): void {
  selectionIds();
  ids = sanitizeSelection(value, allowed);
  try { sessionStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* In-memory fallback. */ }
  document.dispatchEvent(new CustomEvent(selectionEvent));
}

export function comparisonHref(value = selectionIds()): string {
  return `/comparer/${value.length ? `?${new URLSearchParams({ ids: value.join(",") })}` : ""}`;
}
