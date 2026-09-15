const searchInput = /** @type {HTMLInputElement | null} */ (document.querySelector("#directory-search"));
const statusSelect = /** @type {HTMLSelectElement | null} */ (document.querySelector("#directory-status"));
const count = document.querySelector("#directory-count");
const section = document.querySelector(".directory-section");
const empty = document.querySelector(".directory-empty");
const reset = document.querySelector(".directory-toolbar [data-directory-reset]");
const letters = [...document.querySelectorAll("[data-directory-letter]")];
const views = [...document.querySelectorAll("[data-directory-view]")];
const normalize = (value) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr");
const rows = [...document.querySelectorAll(".directory-row")].map(row => ({ row, search: normalize(row.dataset.search ?? "") }));
let selectedLetter = "all";

const filter = () => {
  const query = normalize(searchInput?.value.trim() || "");
  const selectedStatus = statusSelect?.value || "all";
  let visible = 0;
  for (const { row, search } of rows) {
    const matchesQuery = !query || search.includes(query);
    const matchesStatus = selectedStatus === "all" || row.dataset.status === selectedStatus;
    const matchesLetter = selectedLetter === "all" || row.dataset.letter === selectedLetter;
    row.hidden = !(matchesQuery && matchesStatus && matchesLetter);
    if (!row.hidden) visible += 1;
  }
  if (count) count.textContent = `${visible} résultat${visible > 1 ? "s" : ""}`;
  if (empty) empty.hidden = visible !== 0;
  if (reset) reset.hidden = !query && selectedStatus === "all" && selectedLetter === "all";
  letters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.directoryLetter === selectedLetter)));
};
searchInput?.addEventListener("input", filter);
statusSelect?.addEventListener("change", filter);
letters.forEach(button => button.addEventListener("click", () => {
  selectedLetter = button.dataset.directoryLetter ?? "all";
  filter();
}));
views.forEach(button => button.addEventListener("click", () => {
  if (!section) return;
  const view = button.dataset.directoryView;
  if (view !== "cards" && view !== "list") return;
  section.dataset.view = view;
  views.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
}));
document.querySelectorAll("[data-directory-reset]").forEach(button => button.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  if (statusSelect) statusSelect.value = "all";
  selectedLetter = "all";
  filter();
  searchInput?.focus();
}));
document.querySelectorAll(".directory-alphabet, .directory-views").forEach(element => { element.hidden = false; });
filter();
