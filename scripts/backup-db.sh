#!/usr/bin/env bash
# Backup the Vibes & Grinds database.
#
# - If a local SQLite file exists at backend/vibes-and-grinds.db, we copy it
#   and dump it as SQL into ./backups/.
# - If wrangler is installed and the user has credentials, we also export
#   the production D1 database to a timestamped SQL dump.
#
# Usage:
#   ./scripts/backup-db.sh                 # run all available backups
#   ./scripts/backup-db.sh --local         # only local SQLite
#   ./scripts/backup-db.sh --d1            # only Cloudflare D1
#   D1_DATABASE=name ./scripts/backup-db.sh --d1   # override default name

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${REPO_ROOT}/backups"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOCAL_DB="${REPO_ROOT}/backend/vibes-and-grinds.db"
D1_DATABASE="${D1_DATABASE:-vibes-and-grinds-db}"

mode="all"
if [[ "${1:-}" == "--local" ]]; then mode="local"; fi
if [[ "${1:-}" == "--d1" ]]; then mode="d1"; fi

mkdir -p "${BACKUP_DIR}"

backup_local() {
  if [[ ! -f "${LOCAL_DB}" ]]; then
    echo "[local] no SQLite file at ${LOCAL_DB} — skipping"
    return 0
  fi

  local out_db="${BACKUP_DIR}/local-${TIMESTAMP}.db"
  local out_sql="${BACKUP_DIR}/local-${TIMESTAMP}.sql"

  # Use sqlite's online .backup if available — it is safe with concurrent writers.
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "${LOCAL_DB}" ".backup '${out_db}'"
    sqlite3 "${LOCAL_DB}" ".dump" > "${out_sql}"
    echo "[local] wrote ${out_db}"
    echo "[local] wrote ${out_sql}"
  else
    cp "${LOCAL_DB}" "${out_db}"
    echo "[local] sqlite3 not installed — copied raw file to ${out_db}"
    echo "[local] (install sqlite3 to also produce a .sql dump)"
  fi
}

backup_d1() {
  if ! command -v wrangler >/dev/null 2>&1; then
    echo "[d1] wrangler not installed — skipping (npm i -g wrangler)"
    return 0
  fi

  local out_sql="${BACKUP_DIR}/d1-${D1_DATABASE}-${TIMESTAMP}.sql"
  if wrangler d1 export "${D1_DATABASE}" --remote --output="${out_sql}" 2>/dev/null; then
    echo "[d1] wrote ${out_sql}"
  else
    echo "[d1] wrangler d1 export failed — are you logged in (wrangler login)?"
    return 1
  fi
}

case "${mode}" in
  local) backup_local ;;
  d1)    backup_d1 ;;
  all)   backup_local; backup_d1 ;;
esac

echo "Done. Backups in ${BACKUP_DIR}"
