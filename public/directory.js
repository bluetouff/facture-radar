const searchInput = /** @type {HTMLInputElement | null} */ (document.querySelector("#directory-search"));
const statusSelect = /** @type {HTMLSelectElement | null} */ (document.querySelector("#directory-status"));
const count = document.querySelector("#directory-count");
const section = document.querySelector(".directory-section");
const empty = document.querySelector(".directory-empty");
const reset = document.querySelector(".directory-toolbar [data-directory-reset]");
const chips = document.querySelector(".directory-active-filters");
const letters = [...document.querySelectorAll("[data-directory-letter]")];
const views = [...document.querySelectorAll("[data-directory-view]")];
const facets = [...document.querySelectorAll("[data-directory-facet]")];
const normalize = value => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr");
const rows = [...document.querySelectorAll(".directory-row")].map(row => ({ row, search: normalize(row.dataset.search ?? "") }));
let selectedLetter = "all";

const filter = () => {
  const query = normalize(searchInput?.value.trim() || "");
  const selectedStatus = statusSelect?.value || "all";
  const matches = ({ row, search }, except) => (!query || search.includes(query))
    && (selectedStatus === "all" || row.dataset.status === selectedStatus)
    && (selectedLetter === "all" || row.dataset.letter === selectedLetter)
    && facets.every(facet => facet === except || facet.value === "all" || (row.dataset.status === "approved" && (row.dataset[facet.dataset.directoryFacet] || "").split(" ").includes(facet.value)));
  let visible = 0;
  for (const item of rows) {
    item.row.hidden = !matches(item);
    if (!item.row.hidden) visible++;
  }
  for (const facet of facets) {
    const candidates = rows.filter(item => matches(item, facet));
    for (const option of facet.options) {
      const n = option.value === "all" ? candidates.length : candidates.filter(({ row }) => row.dataset.status === "approved" && (row.dataset[facet.dataset.directoryFacet] || "").split(" ").includes(option.value)).length;
      option.textContent = `${option.dataset.label || "Tous"} (${n})`;
      option.disabled = n === 0 && option.value !== facet.value && option.value !== "all";
    }
  }
  const active = facets.filter(facet => facet.value !== "all");
  if (count) count.textContent = `${visible} résultat${visible > 1 ? "s" : ""}`;
  if (empty) empty.hidden = visible !== 0;
  if (reset) reset.hidden = !query && selectedStatus === "all" && selectedLetter === "all" && !active.length;
  const total = document.querySelector("[data-facet-total]");
  if (total) total.textContent = active.length ? `· ${active.length} actif${active.length > 1 ? "s" : ""}` : "";
  letters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.directoryLetter === selectedLetter)));
  if (chips) {
    const button = (label, action) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = `${label} ×`;
      item.setAttribute("aria-label", `Retirer le filtre ${label}`);
      item.addEventListener("click", action);
      return item;
    };
    const items = active.map(facet => button(`${facet.closest("label").querySelector("span").textContent} : ${facet.selectedOptions[0].dataset.label}`, () => { facet.value = "all"; filter(); facet.focus(); }));
    if (query) items.unshift(button(searchInput.value, () => { searchInput.value = ""; filter(); searchInput.focus(); }));
    if (selectedLetter !== "all") items.push(button(`Initiale ${selectedLetter}`, () => { selectedLetter = "all"; filter(); letters[0]?.focus(); }));
    if (selectedStatus !== "all") items.push(button(statusSelect.selectedOptions[0].textContent, () => { statusSelect.value = "all"; filter(); statusSelect.focus(); }));
    chips.replaceChildren(...items);
    chips.hidden = items.length === 0;
  }
  const params = new URLSearchParams();
  if (query) params.set("q", searchInput.value.trim());
  if (selectedStatus !== "all") params.set("status", selectedStatus);
  if (selectedLetter !== "all") params.set("letter", selectedLetter);
  for (const facet of active) params.set(facet.dataset.directoryFacet, facet.value);
  if (section?.dataset.view === "list") params.set("view", "list");
  history.replaceState(null, "", `${location.pathname}${params.size ? `#${params}` : ""}`);
};
const restore = () => {
  const params = new URLSearchParams(location.hash.slice(1, 2000));
  if (searchInput) searchInput.value = (params.get("q") || "").slice(0, 120);
  if (statusSelect) statusSelect.value = ["approved", "pending"].includes(params.get("status")) ? params.get("status") : "all";
  selectedLetter = letters.some(button => button.dataset.directoryLetter === params.get("letter") && !button.disabled) ? params.get("letter") : "all";
  for (const facet of facets) facet.value = [...facet.options].some(option => option.value === params.get(facet.dataset.directoryFacet)) ? params.get(facet.dataset.directoryFacet) : "all";
  if (section) section.dataset.view = params.get("view") === "list" ? "list" : "cards";
  views.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.directoryView === section?.dataset.view)));
  if (facets.some(facet => facet.value !== "all")) document.querySelector(".directory-facets").open = true;
  filter();
};
searchInput?.addEventListener("input", filter);
statusSelect?.addEventListener("change", filter);
facets.forEach(facet => facet.addEventListener("change", filter));
letters.forEach(button => button.addEventListener("click", () => { selectedLetter = button.dataset.directoryLetter ?? "all"; filter(); }));
views.forEach(button => button.addEventListener("click", () => {
  if (!section || !["cards", "list"].includes(button.dataset.directoryView)) return;
  section.dataset.view = button.dataset.directoryView;
  views.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  filter();
}));
document.querySelectorAll("[data-directory-reset]").forEach(button => button.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  if (statusSelect) statusSelect.value = "all";
  facets.forEach(facet => { facet.value = "all"; });
  selectedLetter = "all";
  filter();
  searchInput?.focus();
}));
document.querySelectorAll(".directory-alphabet, .directory-views, .directory-facets").forEach(element => { element.hidden = false; });
window.addEventListener("hashchange", restore);
restore();
