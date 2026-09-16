import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const scripts = ["activate-pa-check-site.sh", "setup-pa-check-mcp.sh"]
  .map(name => readFileSync(resolve(root, "deploy", name), "utf8"));
const verifiers = scripts.map(script => {
  const match = script.match(/python3 - "\$\{(?:STAGING|SCRIPT_DIR\}\/mcp)\}?" "\$\{TARGET\}" <<'PY'\n([\s\S]*?)\nPY/);
  assert.ok(match, "Le contrôle des releases existantes doit rester testable");
  return match[1];
});

test("une relance accepte uniquement le même artefact protégé, statique ou MCP", () => {
  assert.equal(verifiers[0], verifiers[1]);
  const result = spawnSync("python3", ["-c", `
import hashlib, os, pathlib, shutil, subprocess, sys, tempfile
validator = sys.stdin.read()
with tempfile.TemporaryDirectory(prefix="pa-resume-test-") as directory:
    root = pathlib.Path(directory)
    source = root / "source"
    source.mkdir()
    (source / "index.html").write_text("public artifact")
    (source / "DEPLOYED_SHA").write_text("a" * 40 + "\\n")
    (source / "assets").mkdir()
    (source / "assets/app.js").write_text("public JavaScript")
    for path in [source, *source.rglob("*")]:
        path.chmod(0o755 if path.is_dir() else 0o644)
    cases = ["identical", "content", "missing", "extra", "marker", "link", "directory-link", "root-link", "dangling-link", "writable", "hardlink", "special"]
    for name in cases:
        target = root / name
        shutil.copytree(source, target)
        if name == "content": (target / "index.html").write_text("different artifact")
        if name == "missing": (target / "assets/app.js").unlink()
        if name == "extra": (target / "extra.txt").write_text("unexpected")
        if name == "marker": (target / "DEPLOYED_SHA").write_text("b" * 40 + "\\n")
        if name in ("link", "hardlink"):
            (target / "index.html").unlink()
            if name == "link": (target / "index.html").symlink_to(source / "index.html")
            else: os.link(source / "index.html", target / "index.html")
        if name == "directory-link":
            shutil.rmtree(target / "assets")
            (target / "assets").symlink_to(source / "assets", target_is_directory=True)
        if name in ("root-link", "dangling-link"):
            shutil.rmtree(target)
            target.symlink_to(source if name == "root-link" else root / "absent", target_is_directory=True)
        if name == "writable": (target / "index.html").chmod(0o666)
        if name == "special": os.mkfifo(target / "pipe")
        before = (source / "index.html").read_bytes()
        checked = subprocess.run([sys.executable, "-c", validator, str(source), str(target)], capture_output=True, text=True, timeout=5)
        if (checked.returncode == 0) != (name == "identical"):
            raise SystemExit(f"Unexpected result for {name}: {checked.stdout} {checked.stderr}")
        assert target.exists() or target.is_symlink(), "Existing release must be retained"
        assert (source / "index.html").read_bytes() == before
        if name == "content": assert (target / "index.html").read_text() == "different artifact"
        # Remove the hardlink before the next case to restore the fixture's link count.
        if name == "hardlink": (target / "index.html").unlink()
    shutil.rmtree(source)
    source.mkdir()
    for name in ["server.mjs", "manifest.json", "server.mjs.sha256"]:
        (source / name).write_text("MCP artifact: " + name)
        (source / name).chmod(0o644)
    target = root / "mcp"
    shutil.copytree(source, target)
    for name in ["server.mjs", "manifest.json", "server.mjs.sha256"]:
        (target / name).chmod(0o555 if name == "server.mjs" else 0o444)
    checked = subprocess.run([sys.executable, "-c", validator, str(source), str(target)], capture_output=True, text=True)
    assert checked.returncode == 0, checked.stderr
print("RELEASE_REUSE_BOUNDARIES_OK")
`], { input: verifiers[0], encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /RELEASE_REUSE_BOUNDARIES_OK/);
});

test("la réutilisation ne donne jamais au rollback le droit de supprimer la release existante", () => {
  for (const script of scripts) {
    const branch = script.slice(script.indexOf('if [[ -e "${TARGET}" || -L "${TARGET}" ]]; then'));
    const reuse = branch.slice(0, branch.indexOf("\nelse\n"));
    assert.match(reuse, /EXISTING_RELEASE_VERIFIED/);
    assert.doesNotMatch(reuse, /TARGET_CREATED=1|rm -rf -- "\$\{TARGET\}"/);
    assert.match(branch, /else\n[\s\S]*?TARGET_CREATED=1/);
  }
  assert.match(scripts[0]!, /if \[\[ "\$\{OLD_TARGET\}" != "\$\{TARGET\}" \]\]; then/);
  assert.match(scripts[0]!, /aucune bascule de la release statique effectuee/);
});
