const form = document.querySelector("#contribution-form");
const copyButton = document.querySelector("#copy-contribution");
const formStatus = document.querySelector("#form-status");
const recipient = "olivier@l0g.fr";

const publicSources = (value) => {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > 8) return null;
  try {
    return lines.every((line) => ["http:", "https:"].includes(new URL(line).protocol)) ? lines : null;
  } catch {
    return null;
  }
};

const buildMessage = () => {
  if (!form || !form.reportValidity()) return null;
  const data = new FormData(form);
  const sources = publicSources(String(data.get("sources") ?? ""));
  if (!sources) {
    if (formStatus) formStatus.textContent = "Ajoutez entre un et huit liens publics valides, un par ligne.";
    form.querySelector("[name='sources']")?.focus();
    return null;
  }
  const scopes = data.getAll("scope").map(String);
  const platform = String(data.get("platform") ?? "").replace(/[\r\n]+/g, " ").slice(0, 120);
  const lines = [
    `Plateforme : ${platform}`,
    `Lien avec la plateforme : ${String(data.get("relationship") ?? "")}`,
    `Points concernés : ${scopes.length ? scopes.join(", ") : "Non précisé"}`,
    "",
    "Information proposée :",
    String(data.get("details") ?? "").slice(0, 5000),
    "",
    "Sources publiques :",
    ...sources.map((source) => `- ${source}`),
    "",
    `Contact : ${String(data.get("contactName") ?? "").slice(0, 100)}`,
    `Email : ${String(data.get("contactEmail") ?? "").slice(0, 180)}`,
  ];
  return { platform, body: lines.join("\n") };
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = buildMessage();
  if (!message) return;
  if (formStatus) formStatus.textContent = "Votre logiciel de messagerie va s’ouvrir. Vérifiez le message avant de l’envoyer.";
  location.href = `mailto:${recipient}?subject=${encodeURIComponent(`PA Check · mise à jour ${message.platform}`)}&body=${encodeURIComponent(message.body)}`;
});

copyButton?.addEventListener("click", async () => {
  const message = buildMessage();
  if (!message) return;
  try {
    await navigator.clipboard.writeText(message.body);
    if (formStatus) formStatus.textContent = "Dossier copié. Vous pouvez l’envoyer à olivier@l0g.fr.";
  } catch {
    if (formStatus) formStatus.textContent = "La copie a été refusée par le navigateur. Utilisez le bouton Préparer mon message.";
  }
});

const requestedPlatform = new URLSearchParams(location.search).get("plateforme");
const platformSelect = form?.elements.namedItem("platform");
if (requestedPlatform && platformSelect instanceof HTMLSelectElement) {
  const matchingOption = Array.from(platformSelect.options).find(
    (option) => option.value.toLocaleLowerCase("fr") === requestedPlatform.toLocaleLowerCase("fr"),
  );
  if (matchingOption) platformSelect.value = matchingOption.value;
}
