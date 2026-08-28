const usageRoot = document.querySelector("[data-mcp-usage]");
const usageStatus = usageRoot?.querySelector("[data-usage-status]");
const usageTools = usageRoot?.querySelector("[data-usage-tools]");
const usageDaily = usageRoot?.querySelector("[data-usage-daily]");
const countFormat = new Intl.NumberFormat("fr-FR");

function addUsageRow(target, label, value) {
  if (!target) return;
  const row = document.createElement("tr");
  const name = document.createElement("td");
  const measure = document.createElement("td");
  name.textContent = label;
  measure.textContent = value;
  row.append(name, measure);
  target.append(row);
}

function addUsageEmpty(target, message) {
  if (!target || target.children.length > 0) return;
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 2;
  cell.className = "usage-empty";
  cell.textContent = message;
  row.append(cell);
  target.append(row);
}

try {
  const response = await fetch("/api/mcp/usage", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("usage_report_unavailable");
  const report = await response.json();
  if (!report.enabled) throw new Error("usage_collection_disabled");

  const values = {
    tool_calls: report.totals?.tool_calls,
    active_days: report.recurring_usage?.active_days,
    repeat_active_days: report.recurring_usage?.repeat_active_days,
    latency_p95: report.totals?.latency_ms?.p95,
  };
  for (const element of usageRoot?.querySelectorAll("[data-usage-stat]") ?? []) {
    const key = element.dataset.usageStat ?? "";
    const value = values[key];
    element.textContent = key === "latency_p95"
      ? (typeof value === "number" ? `${countFormat.format(value)} ms` : "À mesurer")
      : (typeof value === "number" ? countFormat.format(value) : "n.d.");
  }

  for (const row of (report.tools ?? []).slice(0, 8)) {
    addUsageRow(usageTools, row.name, countFormat.format(row.count));
  }
  for (const row of (report.daily ?? []).slice(-14).reverse()) {
    addUsageRow(usageDaily, row.date, `${countFormat.format(row.requests)} · ${countFormat.format(row.tool_calls)}`);
  }
  addUsageEmpty(usageTools, "Aucun appel d’outil agrégé pour le moment.");
  addUsageEmpty(usageDaily, "Aucun jour n’atteint encore le seuil public k=5.");

  if (usageStatus) {
    const freshness = report.updated_at
      ? `Dernier jour publiable : ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(report.updated_at))}.`
      : "Instrumentation active, aucun appel externe agrégé à ce stade.";
    usageStatus.textContent = report.storage_healthy === false
      ? `${freshness} La dernière écriture de l’agrégat a échoué.`
      : freshness;
  }
} catch {
  for (const element of usageRoot?.querySelectorAll("[data-usage-stat]") ?? []) element.textContent = "n.d.";
  if (usageStatus) usageStatus.textContent = "Le rapport d’usage est momentanément indisponible. Aucun chiffre de remplacement n’est estimé.";
  addUsageEmpty(usageTools, "Rapport indisponible.");
  addUsageEmpty(usageDaily, "Rapport indisponible.");
}
