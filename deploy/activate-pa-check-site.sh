#!/usr/bin/env bash
set -Eeuo pipefail

SITE_HOST="pa.l0g.fr"
SITE_ROOT="/var/www/html/pa-check"
RELEASES_ROOT="${SITE_ROOT}/releases"
CURRENT="${SITE_ROOT}/current"
BACKUPS_ROOT="/var/backups/pa-check"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ARCHIVE="${SCRIPT_DIR}/site.tar.gz"
CHECKSUM="${SCRIPT_DIR}/site.tar.gz.sha256"
EXPECTED_SHA="$(basename -- "${SCRIPT_DIR}")"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${RELEASES_ROOT}/${EXPECTED_SHA}"
BACKUP_DIR="${BACKUPS_ROOT}/${STAMP}-before-${EXPECTED_SHA}"
OLD_TARGET=""
STAGING=""
TARGET_CREATED=0
SWAPPED=0

if [[ "${EUID}" -ne 0 ]]; then
  echo "Echec: ce script doit etre execute avec sudo." >&2
  exit 1
fi
for dependency in apache2ctl curl flock python3 sha256sum tar; do
  command -v "${dependency}" >/dev/null
done
if [[ ! "${EXPECTED_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Echec: revision de release invalide." >&2
  exit 1
fi
if [[ "${TARGET}" != "/var/www/html/pa-check/releases/${EXPECTED_SHA}" ]]; then
  echo "Echec: cible de release inattendue." >&2
  exit 1
fi
test -f "${ARCHIVE}"
test -f "${CHECKSUM}"

exec 9> /run/lock/pa-check-deploy.lock
if ! flock -n 9; then
  echo "Echec: un autre deploiement PA Check est en cours." >&2
  exit 1
fi

install -d -m 0750 -- "${BACKUPS_ROOT}" "${BACKUP_DIR}"
install -d -m 0755 -- "${SITE_ROOT}" "${RELEASES_ROOT}"
if [[ -L "${CURRENT}" ]]; then
  OLD_TARGET="$(readlink -f -- "${CURRENT}")"
  if [[ ! "${OLD_TARGET}" =~ ^${RELEASES_ROOT}/[0-9a-f]{40}$ ]]; then
    echo "Echec: cible statique courante inattendue." >&2
    exit 1
  fi
  printf '%s\n' "${OLD_TARGET}" > "${BACKUP_DIR}/current-target.txt"
elif [[ -e "${CURRENT}" ]]; then
  echo "Echec: ${CURRENT} existe mais n'est pas un lien symbolique." >&2
  exit 1
fi

rollback() {
  local exit_code="$1"
  set +e
  trap - ERR INT TERM
  if [[ "${SWAPPED}" -eq 1 ]]; then
    if [[ -n "${OLD_TARGET}" && -d "${OLD_TARGET}" ]]; then
      local rollback_link="${SITE_ROOT}/.current.rollback.${EXPECTED_SHA}.$$"
      ln -s -- "${OLD_TARGET}" "${rollback_link}"
      mv -Tf -- "${rollback_link}" "${CURRENT}"
    else
      rm -f -- "${CURRENT}"
    fi
  fi
  if [[ -n "${STAGING}" && "${STAGING}" =~ ^${RELEASES_ROOT}/\.${EXPECTED_SHA}\.staging\.[A-Za-z0-9]+$ && -d "${STAGING}" ]]; then
    rm -rf -- "${STAGING}"
  fi
  if [[ "${TARGET_CREATED}" -eq 1 && "${TARGET}" == "${RELEASES_ROOT}/${EXPECTED_SHA}" && -d "${TARGET}" ]]; then
    rm -rf -- "${TARGET}"
  fi
  echo "Echec: restauration de la release statique precedente." >&2
  echo "Sauvegarde et etat d'echec: ${BACKUP_DIR}" >&2
  exit "${exit_code}"
}
trap 'rollback $?' ERR INT TERM

python3 - "${CHECKSUM}" <<'PY'
import re
import sys

with open(sys.argv[1], encoding="ascii") as handle:
    lines = handle.read().splitlines()
if len(lines) != 1 or not re.fullmatch(r"[0-9a-f]{64}  site\.tar\.gz", lines[0]):
    raise SystemExit("Checksum statique invalide")
PY
(cd -- "${SCRIPT_DIR}" && sha256sum -c -- "$(basename -- "${CHECKSUM}")")
python3 - "${ARCHIVE}" <<'PY'
import pathlib
import re
import sys
import tarfile

archive_path = pathlib.Path(sys.argv[1])
if archive_path.stat().st_size > 16 * 1024 * 1024:
    raise SystemExit("Archive statique anormalement volumineuse")

required = {
    "index.html",
    "agents/index.html",
    "api/corpus.json",
    "api/platforms.json",
    "api/questions.json",
    "llms.txt",
    "llms-full.txt",
    "server.json",
    "verifier-mon-outil/index.html",
    "verifier-une-facture/index.html",
}
blocked_names = re.compile(r"(^|/)(\.env(?:\..*)?|id_(?:rsa|ed25519)(?:\..*)?|[^/]+\.(?:key|pem))$", re.I)
allowed_suffixes = {".css", ".html", ".js", ".json", ".mjs", ".svg", ".txt", ".woff2", ".xml"}
seen = set()
total = 0

with tarfile.open(archive_path, mode="r:gz") as archive:
    members = archive.getmembers()
    if not 80 <= len(members) <= 500:
        raise SystemExit("Nombre d'entrees inattendu dans l'archive")
    for member in members:
        raw_name = member.name
        if "\x00" in raw_name:
            raise SystemExit("Nom d'archive invalide")
        normalized = raw_name[2:] if raw_name.startswith("./") else raw_name
        path = pathlib.PurePosixPath(normalized)
        if path.is_absolute() or ".." in path.parts:
            raise SystemExit(f"Chemin d'archive refuse: {raw_name}")
        canonical = path.as_posix()
        if canonical in {"", "."}:
            if not member.isdir():
                raise SystemExit("Racine d'archive invalide")
            continue
        if canonical in seen:
            raise SystemExit(f"Entree dupliquee: {canonical}")
        seen.add(canonical)
        if not (member.isfile() or member.isdir()):
            raise SystemExit(f"Type d'entree refuse: {canonical}")
        if blocked_names.search(canonical):
            raise SystemExit(f"Fichier sensible refuse: {canonical}")
        if any("xattr" in key.lower() or "com.apple" in key.lower() for key in member.pax_headers):
            raise SystemExit(f"Metadonnee etendue refusee: {canonical}")
        if member.isfile():
            if pathlib.PurePosixPath(canonical).name.startswith("."):
                raise SystemExit(f"Fichier cache refuse: {canonical}")
            if canonical != "_headers" and pathlib.PurePosixPath(canonical).suffix.lower() not in allowed_suffixes:
                raise SystemExit(f"Type de fichier public refuse: {canonical}")
            if member.size > 16 * 1024 * 1024:
                raise SystemExit(f"Fichier anormalement volumineux: {canonical}")
            total += member.size
    if total > 32 * 1024 * 1024:
        raise SystemExit("Contenu statique anormalement volumineux")
    missing = sorted(required - seen)
    if missing:
        raise SystemExit(f"Fichiers publics manquants: {', '.join(missing)}")

print(f"ARCHIVE_OK entries={len(members)} bytes={total}")
PY

if [[ -e "${TARGET}" ]]; then
  echo "Echec: la release statique existe deja: ${TARGET}" >&2
  false
fi
STAGING="$(mktemp -d "${RELEASES_ROOT}/.${EXPECTED_SHA}.staging.XXXXXX")"
tar --extract --gzip --file "${ARCHIVE}" --directory "${STAGING}" --no-same-owner --no-same-permissions

if find "${STAGING}" ! -type f ! -type d -print -quit | grep -q .; then
  echo "Echec: type de fichier inattendu apres extraction." >&2
  false
fi
if find "${STAGING}" -type f \( -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' -o -name 'id_ed25519*' \) -print -quit | grep -q .; then
  echo "Echec: fichier sensible inattendu apres extraction." >&2
  false
fi

python3 - "${STAGING}/api/corpus.json" "${STAGING}/server.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    corpus = json.load(handle)
counts = corpus["manifest"]["counts"]
if counts.get("enrichedPlatforms") != 148:
    raise SystemExit("Nombre de fiches enrichies inattendu")
if counts.get("questions") != 25:
    raise SystemExit("Nombre de questions inattendu")
if counts.get("sources") != 273:
    raise SystemExit("Nombre de sources inattendu")
if len(corpus["officialDirectory"]["approved"]) != counts.get("approvedPlatforms"):
    raise SystemExit("Annuaire approuve incoherent")
if len(corpus["officialDirectory"]["pending"]) != counts.get("pendingPlatforms"):
    raise SystemExit("Annuaire en attente incoherent")

with open(sys.argv[2], encoding="utf-8") as handle:
    server = json.load(handle)
if server.get("name") != "io.github.bluetouff/pa-check":
    raise SystemExit("Identite MCP publique inattendue")
if server.get("remotes") != [{"type": "streamable-http", "url": "https://pa.l0g.fr/api/mcp"}]:
    raise SystemExit("Endpoint MCP public inattendu")
print("PUBLIC_CORPUS_OK")
PY

printf '%s\n' "${EXPECTED_SHA}" > "${STAGING}/DEPLOYED_SHA"
find "${STAGING}" -type d -exec chmod 0755 {} +
find "${STAGING}" -type f -exec chmod 0644 {} +
chown -R root:root -- "${STAGING}"
mv -- "${STAGING}" "${TARGET}"
STAGING=""
TARGET_CREATED=1

apache2ctl configtest
NEXT_LINK="${SITE_ROOT}/.current.${EXPECTED_SHA}.$$"
ln -s -- "${TARGET}" "${NEXT_LINK}"
mv -Tf -- "${NEXT_LINK}" "${CURRENT}"
SWAPPED=1

LIVE_SHA="$(curl --max-time 10 -fsS --resolve "${SITE_HOST}:443:127.0.0.1" "https://${SITE_HOST}/DEPLOYED_SHA")"
if [[ "${LIVE_SHA}" != "${EXPECTED_SHA}" ]]; then
  echo "Echec: la revision servie ne correspond pas a la release." >&2
  false
fi
curl --max-time 10 -fsS --resolve "${SITE_HOST}:443:127.0.0.1" "https://${SITE_HOST}/agents/" >/dev/null
LIVE_CORPUS="$(curl --max-time 10 -fsS --resolve "${SITE_HOST}:443:127.0.0.1" "https://${SITE_HOST}/api/corpus.json")"
python3 -c '
import json
import sys

data = json.load(sys.stdin)
counts = data["manifest"]["counts"]
if counts.get("enrichedPlatforms") != 148:
    raise SystemExit("Nombre de fiches live inattendu")
if counts.get("questions") != 25:
    raise SystemExit("Nombre de questions live inattendu")
if counts.get("sources") != 273:
    raise SystemExit("Nombre de sources live inattendu")
' <<<"${LIVE_CORPUS}"

trap - ERR INT TERM
echo "ACTIVATION_OK ${SITE_HOST} ${EXPECTED_SHA}"
echo "BACKUP ${BACKUP_DIR}"
