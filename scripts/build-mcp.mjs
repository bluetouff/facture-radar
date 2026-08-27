import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "dist-mcp");
const outputFile = resolve(outputDirectory, "server.mjs");
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error("Révision Git invalide");

const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH;
const buildTime = sourceDateEpoch && /^\d+$/.test(sourceDateEpoch)
  ? new Date(Number(sourceDateEpoch) * 1000).toISOString()
  : new Date().toISOString();

await mkdir(outputDirectory, { recursive: true });
await build({
  entryPoints: [resolve(root, "src/mcp/http.ts")],
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "bundle",
  minify: false,
  sourcemap: false,
  legalComments: "none",
  define: {
    __PA_CHECK_BUILD_SHA__: JSON.stringify(revision),
    __PA_CHECK_BUILD_TIME__: JSON.stringify(buildTime),
  },
});
await chmod(outputFile, 0o755);

const bundle = await readFile(outputFile);
const sha256 = createHash("sha256").update(bundle).digest("hex");
const manifest = {
  schemaVersion: "0.2.0",
  revision,
  builtAt: buildTime,
  entrypoint: "server.mjs",
  sha256,
  bytes: bundle.byteLength,
  endpoint: "https://pa.l0g.fr/api/mcp",
  bind: "127.0.0.1",
  port: 3747,
  readOnly: true,
};
await writeFile(resolve(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
await writeFile(resolve(outputDirectory, "server.mjs.sha256"), `${sha256}  server.mjs\n`, { mode: 0o644 });
process.stdout.write(`MCP_BUILD_OK ${revision} ${bundle.byteLength} bytes ${sha256}\n`);
