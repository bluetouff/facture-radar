#!/usr/bin/env bash
set -Eeuo pipefail

SITE_HOST="pa.l0g.fr"
MCP_PORT="3747"
MCP_ROOT="/opt/pa-check-mcp"
RELEASES_ROOT="${MCP_ROOT}/releases"
CURRENT="${MCP_ROOT}/current"
SERVICE_FILE="/etc/systemd/system/pa-check-mcp.service"
APACHE_SNIPPET="/etc/apache2/pa-check-mcp-location.conf"
VHOST="/etc/apache2/sites-available/pa.l0g.fr.conf"
BACKUPS_ROOT="/var/backups/pa-check-mcp"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
BUNDLE_DIR="${SCRIPT_DIR}/mcp"
MANIFEST="${BUNDLE_DIR}/manifest.json"
BUNDLE="${BUNDLE_DIR}/server.mjs"
CHECKSUM="${BUNDLE_DIR}/server.mjs.sha256"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Echec: ce script doit etre execute avec sudo." >&2
  exit 1
fi
for dependency in apache2ctl curl flock grep python3 sha256sum ss systemctl; do
  command -v "${dependency}" >/dev/null
done
test -x /usr/bin/node
NODE_MAJOR="$(/usr/bin/node -p 'process.versions.node.split(".")[0]')"
if [[ ! "${NODE_MAJOR}" =~ ^[0-9]+$ || "${NODE_MAJOR}" -lt 20 ]]; then
  echo "Echec: Node.js 20 ou plus recent est requis pour le MCP." >&2
  exit 1
fi
test -f "${MANIFEST}"
test -f "${BUNDLE}"
test -f "${CHECKSUM}"
test -f "${VHOST}"
APACHE_MODULES="$(apache2ctl -M 2>/dev/null)"
for required_module in headers_module proxy_module proxy_http_module; do
  if ! grep -Fq " ${required_module} " <<<"${APACHE_MODULES}"; then
    echo "Echec: module Apache requis absent: ${required_module}" >&2
    exit 1
  fi
done

EXPECTED_SHA="$(python3 - "${MANIFEST}" "${BUNDLE}" "${CHECKSUM}" <<'PY'
import hashlib
import json
import os
import re
import sys
manifest_path, bundle_path, checksum_path = sys.argv[1:]
with open(manifest_path, encoding="utf-8") as handle:
    manifest = json.load(handle)
revision = manifest.get("revision", "")
if not re.fullmatch(r"[0-9a-f]{40}", revision):
    raise SystemExit("Revision MCP invalide")
if manifest.get("readOnly") is not True:
    raise SystemExit("Le manifeste MCP ne declare pas le serveur en lecture seule")
with open(checksum_path, encoding="ascii") as handle:
    checksum_lines = handle.read().splitlines()
if len(checksum_lines) != 1:
    raise SystemExit("Checksum MCP invalide")
checksum_match = re.fullmatch(r"([0-9a-f]{64})  server\.mjs", checksum_lines[0])
if checksum_match is None:
    raise SystemExit("Checksum MCP invalide")
digest = hashlib.sha256()
with open(bundle_path, "rb") as handle:
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
        digest.update(chunk)
bundle_sha256 = digest.hexdigest()
if bundle_sha256 != checksum_match.group(1) or bundle_sha256 != manifest.get("sha256"):
    raise SystemExit("Empreinte du bundle MCP incoherente")
if manifest.get("bytes") != os.path.getsize(bundle_path):
    raise SystemExit("Taille du bundle MCP incoherente")
if manifest.get("endpoint") != "https://pa.l0g.fr/api/mcp" or manifest.get("bind") != "127.0.0.1" or manifest.get("port") != 3747:
    raise SystemExit("Parametres publics du manifeste MCP inattendus")
print(revision)
PY
)"
TARGET="${RELEASES_ROOT}/${EXPECTED_SHA}"
BACKUP_DIR="${BACKUPS_ROOT}/${STAMP}-before-${EXPECTED_SHA}"
SMOKE_DIR="${BACKUP_DIR}/smoke"
MCP_BODY_FILE="${SMOKE_DIR}/body"
MCP_HEADERS_FILE="${SMOKE_DIR}/headers"
OLD_TARGET=""
TARGET_CREATED=0
SWAPPED=0
SERVICE_WAS_ACTIVE=0
SERVICE_WAS_ENABLED=0
SNIPPET_EXISTED=0
SERVICE_EXISTED=0

if [[ ! "${TARGET}" =~ ^/opt/pa-check-mcp/releases/[0-9a-f]{40}$ ]]; then
  echo "Echec: cible MCP inattendue." >&2
  exit 1
fi
if [[ "${VHOST}" != /etc/apache2/sites-available/* ]]; then
  echo "Echec: le vhost doit se trouver dans sites-available." >&2
  exit 1
fi
if [[ "${SMOKE_DIR}" != "${BACKUP_DIR}/smoke" || "${MCP_BODY_FILE}" != "${SMOKE_DIR}/body" || "${MCP_HEADERS_FILE}" != "${SMOKE_DIR}/headers" ]]; then
  echo "Echec: chemins temporaires de smoke test inattendus." >&2
  exit 1
fi

exec 9> /run/lock/pa-check-mcp-deploy.lock
if ! flock -n 9; then
  echo "Echec: un autre deploiement MCP PA Check est en cours." >&2
  exit 1
fi

install -d -m 0750 -- "${BACKUPS_ROOT}" "${BACKUP_DIR}"
install -d -m 0700 -- "${SMOKE_DIR}"
cp -a -- "${VHOST}" "${BACKUP_DIR}/vhost.conf"
if [[ -e "${APACHE_SNIPPET}" ]]; then
  SNIPPET_EXISTED=1
  cp -a -- "${APACHE_SNIPPET}" "${BACKUP_DIR}/apache-snippet.conf"
fi
if [[ -e "${SERVICE_FILE}" ]]; then
  SERVICE_EXISTED=1
  cp -a -- "${SERVICE_FILE}" "${BACKUP_DIR}/pa-check-mcp.service"
fi
if systemctl is-active --quiet pa-check-mcp.service 2>/dev/null; then
  SERVICE_WAS_ACTIVE=1
fi
if systemctl is-enabled --quiet pa-check-mcp.service 2>/dev/null; then
  SERVICE_WAS_ENABLED=1
fi
if [[ -L "${CURRENT}" ]]; then
  OLD_TARGET="$(readlink -f -- "${CURRENT}")"
  if [[ ! "${OLD_TARGET}" =~ ^${RELEASES_ROOT}/[0-9a-f]{40}$ ]]; then
    echo "Echec: cible MCP courante inattendue." >&2
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
      local rollback_link="${MCP_ROOT}/.current.rollback.${EXPECTED_SHA}.$$"
      ln -s -- "${OLD_TARGET}" "${rollback_link}"
      mv -Tf -- "${rollback_link}" "${CURRENT}"
    else
      rm -f -- "${CURRENT}"
    fi
  fi
  if [[ "${SERVICE_EXISTED}" -eq 1 ]]; then
    cp -a -- "${BACKUP_DIR}/pa-check-mcp.service" "${SERVICE_FILE}"
  else
    rm -f -- "${SERVICE_FILE}"
  fi
  if [[ "${SNIPPET_EXISTED}" -eq 1 ]]; then
    cp -a -- "${BACKUP_DIR}/apache-snippet.conf" "${APACHE_SNIPPET}"
  else
    rm -f -- "${APACHE_SNIPPET}"
  fi
  cp -a -- "${BACKUP_DIR}/vhost.conf" "${VHOST}"
  systemctl daemon-reload >/dev/null 2>&1
  if [[ "${SERVICE_WAS_ENABLED}" -eq 1 ]]; then
    systemctl enable pa-check-mcp.service >/dev/null 2>&1
  else
    systemctl disable pa-check-mcp.service >/dev/null 2>&1
  fi
  if [[ "${SERVICE_WAS_ACTIVE}" -eq 1 && -L "${CURRENT}" ]]; then
    systemctl restart pa-check-mcp.service >/dev/null 2>&1
  else
    systemctl stop pa-check-mcp.service >/dev/null 2>&1
  fi
  apache2ctl configtest >/dev/null 2>&1 && systemctl reload apache2 >/dev/null 2>&1
  if [[ "${TARGET_CREATED}" -eq 1 && -d "${TARGET}" ]]; then
    rm -rf -- "${TARGET}"
  fi
  rm -f -- "${MCP_BODY_FILE}" "${MCP_HEADERS_FILE}"
  rmdir -- "${SMOKE_DIR}" 2>/dev/null || true
  echo "Echec: restauration du MCP et du vhost precedents." >&2
  echo "Sauvegarde et etat d'echec: ${BACKUP_DIR}" >&2
  exit "${exit_code}"
}
trap 'rollback $?' ERR INT TERM

(cd -- "${BUNDLE_DIR}" && sha256sum -c -- "$(basename -- "${CHECKSUM}")")
python3 - "${BUNDLE}" <<'PY'
import os
import sys
path = sys.argv[1]
size = os.path.getsize(path)
if size < 100_000 or size > 16 * 1024 * 1024:
    raise SystemExit("Taille du bundle MCP inattendue")
with open(path, "rb") as handle:
    head = handle.read(64)
if b"ELF" in head or b"#!/bin/sh" in head or b"#!/bin/bash" in head:
    raise SystemExit("Type de bundle MCP inattendu")
print(f"MCP_BUNDLE_OK bytes={size}")
PY
if [[ -e "${TARGET}" ]]; then
  echo "Echec: la release MCP existe deja: ${TARGET}" >&2
  false
fi

install -d -m 0755 -- "${MCP_ROOT}" "${RELEASES_ROOT}" "${TARGET}"
TARGET_CREATED=1
install -m 0555 -- "${BUNDLE}" "${TARGET}/server.mjs"
install -m 0444 -- "${MANIFEST}" "${TARGET}/manifest.json"
install -m 0444 -- "${CHECKSUM}" "${TARGET}/server.mjs.sha256"
chown -R root:root -- "${TARGET}"

cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=PA Check MCP public en lecture seule
After=network.target

[Service]
Type=simple
DynamicUser=yes
WorkingDirectory=${CURRENT}
ExecStart=/usr/bin/node ${CURRENT}/server.mjs
Environment=NODE_ENV=production
Environment=PA_CHECK_MCP_PORT=${MCP_PORT}
Environment=PA_CHECK_REVISION=${EXPECTED_SHA}
Environment=PA_CHECK_MCP_ALLOWED_HOSTS=127.0.0.1,localhost,pa.l0g.fr
Environment=PA_CHECK_MCP_ALLOWED_ORIGINS=127.0.0.1,localhost,pa.l0g.fr
Restart=on-failure
RestartSec=3s
TimeoutStartSec=20s
TimeoutStopSec=10s
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ProtectHome=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
ProtectProc=invisible
ProcSubset=pid
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
IPAddressDeny=any
IPAddressAllow=localhost
RestrictNamespaces=yes
RestrictSUIDSGID=yes
LockPersonality=yes
RestrictRealtime=yes
SystemCallArchitectures=native
CapabilityBoundingSet=
AmbientCapabilities=
UMask=0077
LimitNOFILE=1024
TasksMax=64
MemoryMax=256M

[Install]
WantedBy=multi-user.target
EOF
chmod 0644 "${SERVICE_FILE}"
chown root:root "${SERVICE_FILE}"

cat > "${APACHE_SNIPPET}" <<EOF
# PA_CHECK_MCP_MANAGED_BEGIN
ProxyPass "/api/mcp" "http://127.0.0.1:${MCP_PORT}/api/mcp" connectiontimeout=2 timeout=20 retry=0
ProxyPassReverse "/api/mcp" "http://127.0.0.1:${MCP_PORT}/api/mcp"
<Location "/api/mcp">
    LimitRequestBody 131072
    RequestHeader unset X-Forwarded-For
    RequestHeader unset X-Real-IP
    RequestHeader set Host "127.0.0.1:${MCP_PORT}"
    Header always set Cache-Control "no-store"
    Header always set Content-Security-Policy "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    Header always set Referrer-Policy "no-referrer"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always unset Access-Control-Allow-Origin
</Location>
# PA_CHECK_MCP_MANAGED_END
EOF
chmod 0644 "${APACHE_SNIPPET}"
chown root:root "${APACHE_SNIPPET}"

python3 - "${VHOST}" "${APACHE_SNIPPET}" <<'PY'
import re
import sys

vhost_path, snippet_path = sys.argv[1:]
with open(vhost_path, encoding="utf-8") as handle:
    text = handle.read()
if len(text) > 128 * 1024:
    raise SystemExit("Vhost anormalement volumineux")

block_pattern = re.compile(r"<VirtualHost\b[^>]*>.*?</VirtualHost>", re.I | re.S)
blocks = list(block_pattern.finditer(text))
https_blocks = []
for match in blocks:
    block = match.group(0)
    opening = block.split(">", 1)[0]
    if ":443" not in opening:
        continue
    if re.search(r"^\s*ServerName\s+pa\.l0g\.fr\s*$", block, re.M | re.I):
        https_blocks.append(match)
if len(https_blocks) != 1:
    raise SystemExit("Le vhost doit contenir exactement un bloc HTTPS pour pa.l0g.fr")

include = f"    IncludeOptional {snippet_path}"
selected = https_blocks[0]
selected_text = selected.group(0)
if include in selected_text:
    raise SystemExit(0)
if "/api/mcp" in text or "PA_CHECK_MCP_MANAGED" in text:
    raise SystemExit("Une configuration MCP non geree existe deja dans le vhost")
updated_block, count = re.subn(
    r"\n\s*</VirtualHost>\s*$",
    f"\n{include}\n</VirtualHost>",
    selected_text,
    count=1,
    flags=re.I,
)
if count != 1:
    raise SystemExit("Impossible d'inserer l'include MCP dans le vhost HTTPS")
updated = text[: selected.start()] + updated_block + text[selected.end() :]
with open(vhost_path, "w", encoding="utf-8", newline="\n") as handle:
    handle.write(updated)
PY

NEXT_LINK="${MCP_ROOT}/.current.${EXPECTED_SHA}.$$"
ln -s -- "${TARGET}" "${NEXT_LINK}"
mv -Tf -- "${NEXT_LINK}" "${CURRENT}"
SWAPPED=1

systemctl daemon-reload
systemctl enable pa-check-mcp.service >/dev/null
systemctl restart pa-check-mcp.service
systemctl is-active --quiet pa-check-mcp.service

MCP_LISTENING=0
for _ in {1..80}; do
  if ss -H -ltn "sport = :${MCP_PORT}" | grep -Fq "127.0.0.1:${MCP_PORT}"; then
    MCP_LISTENING=1
    break
  fi
  if ! systemctl is-active --quiet pa-check-mcp.service; then
    break
  fi
  sleep 0.25
done
if [[ "${MCP_LISTENING}" -ne 1 ]]; then
  echo "Echec: le MCP n'a pas ouvert son port loopback dans le delai imparti." >&2
  rollback 1
fi

if ! LOCAL_HEALTH="$(curl --max-time 5 -fsS "http://127.0.0.1:${MCP_PORT}/healthz")"; then
  echo "Echec: le controle de sante MCP local a echoue." >&2
  rollback 1
fi
python3 -c 'import json,sys; data=json.load(sys.stdin); data.get("status")=="ok" or sys.exit("Sante MCP invalide"); data.get("revision",{}).get("revision")==sys.argv[1] or sys.exit("Revision MCP live inattendue"); data.get("counts",{}).get("enrichedPlatforms")==148 or sys.exit("Corpus MCP live inattendu")' "${EXPECTED_SHA}" <<<"${LOCAL_HEALTH}"

apache2ctl configtest
systemctl reload apache2
systemctl is-active --quiet apache2

if ! curl --max-time 10 --max-filesize 262144 -fsS --resolve "${SITE_HOST}:443:127.0.0.1" \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"pa-check-deploy-smoke","version":"0.1.0"}}}' \
  --dump-header "${MCP_HEADERS_FILE}" \
  --output "${MCP_BODY_FILE}" \
  "https://${SITE_HOST}/api/mcp"; then
  echo "Echec: le smoke test MCP HTTPS a echoue." >&2
  rollback 1
fi
python3 - "${MCP_BODY_FILE}" <<'PY'
import json
import pathlib
import sys

body_path = pathlib.Path(sys.argv[1])
if body_path.stat().st_size > 262_144:
    raise SystemExit("Reponse MCP anormalement volumineuse")
raw = body_path.read_text(encoding="utf-8").strip()
if not raw:
    raise SystemExit("Reponse MCP vide")

messages = []
try:
    messages.append(json.loads(raw))
except json.JSONDecodeError:
    for line in raw.splitlines():
        if not line.startswith("data:"):
            continue
        payload = line[5:].lstrip()
        if not payload or payload == "[DONE]":
            continue
        try:
            messages.append(json.loads(payload))
        except json.JSONDecodeError:
            raise SystemExit("Trame SSE MCP invalide") from None

response = next(
    (
        message
        for message in messages
        if isinstance(message, dict) and message.get("jsonrpc") == "2.0" and message.get("id") == 1
    ),
    None,
)
if response is None:
    raise SystemExit("Reponse JSON-RPC MCP absente")
if response.get("result", {}).get("serverInfo", {}).get("name") != "io.github.bluetouff/pa-check":
    raise SystemExit("Identite MCP live inattendue")
print("MCP_HTTPS_SMOKE_OK")
PY
grep -iq '^content-security-policy:.*default-src '\''none'\''' "${MCP_HEADERS_FILE}"
grep -iq '^cache-control:.*no-store' "${MCP_HEADERS_FILE}"
rm -f -- "${MCP_BODY_FILE}" "${MCP_HEADERS_FILE}"
rmdir -- "${SMOKE_DIR}"

trap - ERR INT TERM
echo "MCP_ACTIVATION_OK ${SITE_HOST} ${EXPECTED_SHA}"
echo "MCP_ENDPOINT https://${SITE_HOST}/api/mcp"
echo "BACKUP ${BACKUP_DIR}"
