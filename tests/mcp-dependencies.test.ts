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

test("le transport MCP et son adaptateur HTTP excluent les versions vulnérables", () => {
  for (const [name, minimum] of [["@modelcontextprotocol/node", [2, 1, 2]], ["@hono/node-server", [2, 1, 3]]] as const) {
    const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith(`node_modules/${name}`));
    assert.ok(copies.length > 0, name);
    for (const [path, entry] of copies) {
      assert.match(entry.version!, /^\d+\.\d+\.\d+$/);
      const version = entry.version!.split(".").map(Number) as [number, number, number];
      assert.equal(version[0], minimum[0], path);
      assert.ok(version[1] > minimum[1] || (version[1] === minimum[1] && version[2] >= minimum[2]), path);
    }
  }
  assert.ok(!Object.keys(lock.packages).some(path => /node_modules\/(?:exceljs|minimatch|archiver)$/.test(path)));
});
