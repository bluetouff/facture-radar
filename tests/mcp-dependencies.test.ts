import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, { version?: string }>;
};

test("le verrou et le SDK MCP chargé excluent les versions affectées d’octobre", () => {
  const servers = Object.entries(lock.packages).filter(([path]) => /(?:^|\/)node_modules\/@modelcontextprotocol\/server$/.test(path));
  assert.ok(servers.length > 0);
  const installed = JSON.parse(readFileSync(new URL("../node_modules/@modelcontextprotocol/server/package.json", import.meta.url), "utf8"));
  for (const version of [...servers.map(([, entry]) => entry.version), installed.version]) {
    assert.match(version, /^2\.\d+\.\d+$/);
    const [, minor, patch] = version.split(".").map(Number);
    assert.ok(minor > 3 || (minor === 3 && patch >= 1), `SDK MCP vulnérable ou antérieur au verrou retenu : ${version}`);
  }
});

test("Astro charge Vite 8.2.4 et toutes les copies suivent le correctif éditeur", () => {
  const copies = Object.entries(lock.packages).filter(([path]) => /(?:^|\/)node_modules\/vite$/.test(path));
  assert.ok(copies.length > 0);
  for (const [path, entry] of copies) assert.equal(entry.version, "8.2.4", path);
  const astroRequire = createRequire(require.resolve("astro/package.json"));
  assert.equal(astroRequire("vite/package.json").version, "8.2.4");
});
