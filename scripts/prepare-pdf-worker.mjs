#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { buildBoundedPdfWorkerSource, MAX_PDF_ATTACHMENT_BYTES } from "./lib/bounded-pdf-worker.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "node_modules/pdfjs-dist/build/pdf.worker.mjs");
const outputPath = resolve(root, "public/assets/pdf.worker.bounded-v1.mjs");
const temporaryPath = `${outputPath}.${process.pid}.tmp`;

if (process.argv.includes("--clean")) {
  await rm(outputPath, { force: true });
  process.stdout.write("PDF_WORKER_CLEAN\n");
  process.exit(0);
}

const source = (await readFile(sourcePath, "utf8"))
  .replace(/\n\/\/# sourceMappingURL=pdf\.worker\.mjs\.map\s*$/, "\n");
const bounded = [
  `/* Generated from the locked pdfjs-dist worker. Embedded-file reads are capped at ${MAX_PDF_ATTACHMENT_BYTES} bytes. */`,
  buildBoundedPdfWorkerSource(source),
].join("\n");

await mkdir(dirname(outputPath), { recursive: true });
try {
  await writeFile(temporaryPath, bounded, { encoding: "utf8", mode: 0o644 });
  await rename(temporaryPath, outputPath);
} finally {
  await rm(temporaryPath, { force: true });
}

process.stdout.write(`PDF_WORKER_OK max_attachment_bytes=${MAX_PDF_ATTACHMENT_BYTES}\n`);
