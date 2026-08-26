import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { lab } from "../src/data/lab.ts";
import {
  B2BrouterLabError,
  importB2BrouterSandboxInvoice,
  readB2BrouterSandboxCredentials,
  SandboxRequestBudget,
} from "../src/lib/b2brouter-lab.ts";

const allowedArguments = new Set(["--execute-import"]);
const argumentsReceived = process.argv.slice(2);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function loadFixtures(): Promise<Array<{ id: string; title: string; bytes: Uint8Array }>> {
  const fixtures = [];
  for (const testCase of lab.cases) {
    const usesFacturX = "facturXHref" in testCase;
    const fixtureHref = usesFacturX ? testCase.facturXHref : testCase.fileHref;
    const expectedBytes = usesFacturX ? testCase.facturXBytes : testCase.bytes;
    const expectedDigest = usesFacturX ? testCase.facturXSha256 : testCase.sha256;
    const bytes = await readFile(new URL(`../public${fixtureHref}`, import.meta.url));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== expectedBytes || digest !== expectedDigest) {
      fail(`Le fichier ${testCase.id} ne correspond plus à la version publiée. Aucun appel réseau n’a été envoyé.`);
    }
    fixtures.push({ id: testCase.id, title: testCase.title, bytes });
  }
  return fixtures;
}

async function main(): Promise<void> {
  if (argumentsReceived.some((argument) => !allowedArguments.has(argument)) || new Set(argumentsReceived).size !== argumentsReceived.length) {
    fail("Option refusée. Utilisez la commande sans option pour le contrôle local, ou --execute-import pour la sandbox.");
  }

  const fixtures = await loadFixtures();
  if (!argumentsReceived.includes("--execute-import")) {
    console.log(`CONTROLE_LOCAL_OK ${fixtures.length} fichiers synthétiques. Aucun appel réseau envoyé.`);
    return;
  }

  const credentials = readB2BrouterSandboxCredentials(process.env);
  const campaignFixtures = fixtures.filter((fixture) => fixture.id === "service-simple");
  if (campaignFixtures.length !== 1) fail("Le premier cas Factur-X local est introuvable. Aucun appel réseau n’a été envoyé.");
  const requestBudget = new SandboxRequestBudget(1);

  for (const fixture of campaignFixtures) {
    const result = await importB2BrouterSandboxInvoice({
      credentials,
      invoiceFile: fixture.bytes,
      requestBudget,
    });
    const state = result.state ?? "état non précisé";
    console.log(`${fixture.title}: import accepté (${state}).`);
  }

  console.log("IMPORT_SANDBOX_OK Le premier Factur-X a été importé. Aucun envoi n’a été demandé.");
}

main().catch((error: unknown) => {
  if (error instanceof B2BrouterLabError) fail(error.publicMessage);
  fail("Le contrôle local a échoué. Aucun nouvel essai automatique n’a été lancé.");
});
