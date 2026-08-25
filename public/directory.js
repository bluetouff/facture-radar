const searchInput = /** @type {HTMLInputElement | null} */ (document.querySelector("#directory-search"));
const statusSelect = /** @type {HTMLSelectElement | null} */ (document.querySelector("#directory-status"));
const count = document.querySelector("#directory-count");
const rows = [...document.querySelectorAll(".directory-row")];

const filter = () => {
  const query = searchInput?.value.trim().toLocaleLowerCase("fr") || "";
  const selectedStatus = statusSelect?.value || "all";
  let visible = 0;
  for (const row of rows) {
    const matchesQuery = !query || row.dataset.search?.includes(query);
    const matchesStatus = selectedStatus === "all" || row.dataset.status === selectedStatus;
    row.hidden = !(matchesQuery && matchesStatus);
    if (!row.hidden) visible += 1;
  }
  if (count) count.textContent = `${visible} résultat${visible > 1 ? "s" : ""}`;
};

searchInput?.addEventListener("input", filter);
statusSelect?.addEventListener("change", filter);
filter();
