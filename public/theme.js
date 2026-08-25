const key = "facture-radar-theme";
const button = document.querySelector(".theme-toggle");
const saved = localStorage.getItem(key);

if (saved === "light") document.documentElement.dataset.theme = "light";
button?.setAttribute("aria-pressed", String(document.documentElement.dataset.theme === "light"));
button?.addEventListener("click", () => {
  const light = document.documentElement.dataset.theme !== "light";
  document.documentElement.dataset.theme = light ? "light" : "dark";
  localStorage.setItem(key, light ? "light" : "dark");
  button.setAttribute("aria-pressed", String(light));
});
