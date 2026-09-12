import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve("astro/package.json"));
const sharp = astroRequire("sharp");
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, { version?: string }>;
};

function assertMinimum(version: string, minimum: readonly number[], name: string): void {
  assert.match(version, /^\d+\.\d+\.\d+$/, `${name} doit utiliser une version stable`);
  const parts = version.split(".").map(Number);
  for (let index = 0; index < minimum.length; index += 1) {
    if (parts[index]! > minimum[index]!) return;
    assert.ok(parts[index]! >= minimum[index]!, `${name} ${version} est antérieur au correctif ${minimum.join(".")}`);
  }
}

test("le lock exclut les versions Astro et Sharp affectées par les alertes AVIF", () => {
  // GHSA-26w7-cxv4-gfx2 and GHSA-rgj7-g3m4-5g8c; include nested/platform copies.
  const requirements = [
    { path: /(?:^|\/)node_modules\/astro$/, minimum: [7, 2, 8] },
    { path: /(?:^|\/)node_modules\/sharp$/, minimum: [0, 35, 4] },
    { path: /(?:^|\/)node_modules\/@img\/sharp-(?!libvips-)/, minimum: [0, 35, 4] },
    { path: /(?:^|\/)node_modules\/@img\/sharp-libvips-/, minimum: [1, 3, 3] },
  ];
  for (const { path, minimum } of requirements) {
    const entries = Object.entries(lock.packages).filter(([name]) => path.test(name));
    assert.ok(entries.length > 0, `Dépendance attendue absente : ${path}`);
    for (const [name, entry] of entries) {
      assert.equal(typeof entry.version, "string");
      assertMinimum(entry.version!, minimum, name);
    }
  }
});

test("le service image charge Sharp et libheif corrigés", () => {
  assertMinimum(sharp.versions.sharp, [0, 35, 4], "Sharp chargé par Astro");
  assertMinimum(sharp.versions.heif, [1, 23, 2], "libheif chargé par Sharp");
});

test("le décodage AVIF normal fonctionne et les images invalides sont refusées", async () => {
  const png = await sharp({ create: { width: 16, height: 12, channels: 3, background: "#226e5d" } }).png().toBuffer();
  const avif = await sharp(png).avif().toBuffer();
  const decoded = await sharp(avif).png().toBuffer();
  const metadata = await sharp(decoded).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 16);
  assert.equal(metadata.height, 12);
  await assert.rejects(sharp(avif.subarray(0, 12)).png().toBuffer());
  await assert.rejects(sharp(Buffer.from("not an image")).png().toBuffer());
});
