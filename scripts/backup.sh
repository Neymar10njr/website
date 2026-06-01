#!/bin/sh
# Postgres daily backup with rotation.
# Runs inside the db-backup container; output goes to /backups (mounted on host).

set -e

mkdir -p /backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTFILE="/backups/treknest_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup to ${OUTFILE}"
pg_dump --no-owner --no-acl --clean --if-exists | gzip > "${OUTFILE}"

if [ -s "${OUTFILE}" ]; then
    SIZE=$(du -h "${OUTFILE}" | cut -f1)
    echo "[$(date)] Backup complete: ${OUTFILE} (${SIZE})"
else
    echo "[$(date)] ERROR: Backup file is empty"
    rm -f "${OUTFILE}"
    exit 1
fi

RETENTION=${BACKUP_RETENTION_DAYS:-14}
echo "[$(date)] Pruning backups older than ${RETENTION} days"
find /backups -name 'treknest_*.sql.gz' -mtime "+${RETENTION}" -delete

ls -lh /backups | tail -10
