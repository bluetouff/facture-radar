import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const activationScript = readFileSync(resolve(root, "deploy/activate-pa-check-site.sh"), "utf8");
const mcpSetupScript = readFileSync(resolve(root, "deploy/setup-pa-check-mcp.sh"), "utf8");
const sourceCount = JSON.parse(readFileSync(resolve(root, "src/data/sources.json"), "utf8")).length;

test("le déploiement statique exige le corpus public des vingt-cinq questions", () => {
  assert.match(activationScript, /"api\/questions\.json",/);
  assert.match(activationScript, /if counts\.get\("questions"\) != 25:\n    raise SystemExit\("Nombre de questions inattendu"\)/);
});

test("le smoke live vérifie les trois dimensions stables du corpus", () => {
  const smokeStart = activationScript.indexOf('LIVE_CORPUS="$(curl');
  const smokeEnd = activationScript.indexOf("\n\ntrap - ERR INT TERM", smokeStart);
  assert.ok(smokeStart > 0 && smokeEnd > smokeStart);

  const liveSmoke = activationScript.slice(smokeStart, smokeEnd);
  assert.match(liveSmoke, /counts\.get\("enrichedPlatforms"\) != 149/);
  assert.match(liveSmoke, /counts\.get\("questions"\) != 25/);
  assert.ok(liveSmoke.includes(`counts.get("sources") != ${sourceCount}:`));
});

test("les contrôles de sources avant et après activation suivent le corpus réel", () => {
  const checks = [...activationScript.matchAll(/if counts\.get\("sources"\) != (\d+):/g)];
  assert.equal(checks.length, 2);
  assert.ok(checks.every((check) => Number(check[1]) === sourceCount));
});

test("Apache sert la page PA Check avec un véritable statut 404", () => {
  assert.match(mcpSetupScript, /ErrorDocument 404 \/404\.html/);
  assert.match(mcpSetupScript, /if \[\[ "\$\{NOT_FOUND_STATUS\}" != "404" \]\]/);
  assert.match(mcpSetupScript, /Cette page a changé d'adresse\./);
  assert.match(activationScript, /"404\.html",/);
});

test("la release statique contient les images sociales attendues", () => {
  assert.match(activationScript, /"apple-touch-icon\.png",/);
  assert.match(activationScript, /"og\/pa-check-facturation-electronique-v3\.png",/);
  assert.match(activationScript, /allowed_suffixes = \{[^\n]*"\.png"/);
});

test("la release statique exige les surfaces publiques de conformité", () => {
  assert.match(activationScript, /"\.well-known\/security\.txt",/);
  assert.match(activationScript, /"conditions-utilisation\/index\.html",/);
  assert.match(activationScript, /"confidentialite\/index\.html",/);
  assert.match(activationScript, /"securite\/index\.html",/);
});


test("l'archive accepte les images WebP et refuse les chemins et types dangereux", () => {
  const validator = activationScript.match(/python3 - "\$\{ARCHIVE\}" <<'PY'\n([\s\S]*?)\nPY/);
  assert.ok(validator);
  // Exercise the actual embedded deployment validator against real tar archives.
  const result = spawnSync("python3", ["-c", `
import ast, io, pathlib, subprocess, sys, tarfile, tempfile
validator = sys.stdin.read()
required = next(ast.literal_eval(n.value) for n in ast.parse(validator).body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "required" for t in n.targets))
cases = [
    ("webp", "_astro/hero.webp", False, None, True),
    ("active-file", "_astro/hero.php", False, None, False),
    ("traversal", "../hero.webp", False, None, False),
    ("symlink", "_astro/hero.webp", True, None, False),
    ("hidden", "_astro/.env.webp", False, None, False),
    ("missing-social", "_astro/hero.webp", False, "og/pa-check-facturation-electronique-v3.png", False),
]
with tempfile.TemporaryDirectory(prefix="pa-archive-test-") as tmp:
    for name, extra, symlink, omit, allowed in cases:
        path = pathlib.Path(tmp) / (name + ".tar.gz")
        with tarfile.open(path, "w:gz", format=tarfile.USTAR_FORMAT) as archive:
            for entry in sorted(required - {omit}) + [f"_astro/asset-{i}.css" for i in range(80)] + [extra]:
                info = tarfile.TarInfo(entry)
                if symlink and entry == extra:
                    info.type = tarfile.SYMTYPE
                    info.linkname = "../outside"
                    archive.addfile(info)
                else:
                    data = b"public asset fixture"
                    info.size = len(data)
                    archive.addfile(info, io.BytesIO(data))
        result = subprocess.run([sys.executable, "-c", validator, str(path)], capture_output=True, text=True)
        if (result.returncode == 0) != allowed:
            raise SystemExit(f"Unexpected archive result for {name}: {result.stdout} {result.stderr}")
print("ARCHIVE_BOUNDARIES_OK")
`], { input: validator[1], encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /ARCHIVE_BOUNDARIES_OK/);
});
