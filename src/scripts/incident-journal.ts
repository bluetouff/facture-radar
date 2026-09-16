import { paginate } from "../lib/pagination";

const form = document.querySelector<HTMLFormElement>("#watch-filters")!;
const cards = [...document.querySelectorAll<HTMLElement>(".incident-card")];
const sources = [...document.querySelectorAll<HTMLElement>(".source-card")];
const coverage = document.querySelector<HTMLElement>("#filter-coverage")!;
const coverageNotes = [...document.querySelectorAll<HTMLElement>("#coverage-data [data-slug]")];
const filters = ["plateforme", "nature", "perimetre", "statut"] as const;
const inputs = filters.map(key => form.elements.namedItem(key) as HTMLSelectElement);
const incidentNav = document.querySelector<HTMLElement>("#incident-pagination")!;
const sourceNav = document.querySelector<HTMLElement>("#source-pagination")!;
const incidentPageSize = Number(incidentNav.dataset.pageSize);
const sourcePageSize = Number(sourceNav.dataset.pageSize);
let incidentPage = 1;
let sourcePage = 1;

function matches(card: HTMLElement) {
  const [platform, kind, scope, status] = inputs.map(input => input.value);
  return (!platform || card.dataset.platforms?.split(" ").includes(platform))
    && (!kind || card.dataset.kind === kind)
    && (!scope || card.dataset.scope === scope)
    && (!status || (status === "open" ? card.dataset.status !== "resolved" : card.dataset.status === "resolved"));
}
function currentAnchor() {
  try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
  catch { return null; }
}
function revealAnchor() {
  const target = currentAnchor();
  if (target && cards.includes(target)) {
    // A shared incident link takes precedence over stale, incompatible filters.
    if (!matches(target)) inputs.forEach(input => input.value = "");
    incidentPage = Math.floor(cards.filter(matches).indexOf(target) / incidentPageSize) + 1;
  }
  if (target && sources.includes(target)) sourcePage = Math.floor(sources.indexOf(target) / sourcePageSize) + 1;
  return target;
}
function updateNav(nav: HTMLElement, page: number, pages: number, total: number) {
  nav.hidden = total === 0 || pages <= 1;
  nav.querySelectorAll<HTMLButtonElement>("[data-page]").forEach(button => {
    const value = Number(button.dataset.page);
    button.hidden = value > pages;
    if (value === page) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  nav.querySelector<HTMLButtonElement>('[data-step="-1"]')!.disabled = page <= 1;
  nav.querySelector<HTMLButtonElement>('[data-step="1"]')!.disabled = page >= pages;
}
function render() {
  const selected = cards.filter(matches);
  const incidents = paginate(selected, incidentPage, incidentPageSize);
  const publications = paginate(sources, sourcePage, sourcePageSize);
  incidentPage = incidents.page;
  sourcePage = publications.page;
  const visibleCards = new Set(incidents.items);
  const visibleSources = new Set(publications.items);
  cards.forEach(card => card.hidden = !visibleCards.has(card));
  sources.forEach(source => source.hidden = !visibleSources.has(source));
  document.querySelector("#incident-count")!.textContent = incidents.total
    ? `Avis ${incidents.start + 1} à ${incidents.start + incidents.items.length} sur ${incidents.total} · page ${incidents.page} sur ${incidents.totalPages} · mise à jour ou consultation récente en premier`
    : "0 avis pour cette sélection";
  document.querySelector<HTMLElement>("#no-incidents")!.hidden = incidents.total !== 0;
  document.querySelector("#source-count")!.textContent = publications.total
    ? `Sources ${publications.start + 1} à ${publications.start + publications.items.length} sur ${publications.total} · page ${publications.page} sur ${publications.totalPages}`
    : "Sources en cours de revue";
  coverage.textContent = coverageNotes.find(item => item.dataset.slug === inputs[0]!.value)?.textContent ?? "";
  coverage.hidden = !inputs[0]!.value;
  updateNav(incidentNav, incidentPage, incidents.totalPages, incidents.total);
  updateNav(sourceNav, sourcePage, publications.totalPages, publications.total);
}
function syncUrl(mode: "push" | "replace", anchor?: string) {
  const url = new URL(location.href);
  inputs.forEach((input, index) => {
    if (input.value) url.searchParams.set(filters[index]!, input.value);
    else url.searchParams.delete(filters[index]!);
  });
  for (const [key, value] of [["page", incidentPage], ["sources", sourcePage]] as const) {
    if (value > 1) url.searchParams.set(key, String(value));
    else url.searchParams.delete(key);
  }
  if (anchor !== undefined) url.hash = anchor;
  if (url.href !== location.href) {
    if (mode === "push") history.pushState(null, "", url);
    else history.replaceState(null, "", url);
  }
}
function readUrl() {
  const query = new URLSearchParams(location.search);
  inputs.forEach((input, index) => {
    const value = query.get(filters[index]!);
    input.value = value && [...input.options].some(option => option.value === value) ? value : "";
  });
  incidentPage = paginate(cards, query.get("page"), incidentPageSize).page;
  sourcePage = paginate(sources, query.get("sources"), sourcePageSize).page;
  const anchor = revealAnchor();
  render();
  syncUrl("replace");
  if (anchor) requestAnimationFrame(() => anchor.scrollIntoView());
}
function navigate(nav: HTMLElement, kind: "incidents" | "sources") {
  nav.addEventListener("click", event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
    if (!button || button.disabled) return;
    const current = kind === "incidents" ? incidentPage : sourcePage;
    const next = button.dataset.page ? Number(button.dataset.page) : current + Number(button.dataset.step);
    if (next === current) return;
    if (kind === "incidents") incidentPage = next;
    else sourcePage = next;
    render();
    syncUrl("push", kind === "incidents" ? "journal" : "sources");
    const heading = document.querySelector<HTMLElement>(kind === "incidents" ? "#journal-title" : "#sources-title")!;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView();
  });
}
form.hidden = false;
form.addEventListener("change", () => {
  incidentPage = 1;
  render();
  syncUrl("push", "journal");
});
form.addEventListener("submit", event => event.preventDefault());
form.addEventListener("reset", event => {
  event.preventDefault();
  inputs.forEach(input => input.value = "");
  incidentPage = 1;
  render();
  syncUrl("push", "journal");
});
navigate(incidentNav, "incidents");
navigate(sourceNav, "sources");
window.addEventListener("popstate", readUrl);
window.addEventListener("hashchange", () => {
  const anchor = revealAnchor();
  render();
  syncUrl("replace");
  if (anchor) requestAnimationFrame(() => anchor.scrollIntoView());
});
readUrl();
