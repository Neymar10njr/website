#!/bin/sh
# Restore a Postgres backup file.
# Usage:
#   docker compose exec db-backup /bin/sh
#   /usr/local/bin/restore.sh /backups/treknest_20260505_030000.sql.gz

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Available backups:"
    ls -lh /backups/ 2>/dev/null || echo "  (none)"
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "ERROR: File not found: $1"
    exit 1
fi

echo "WARNING: This will OVERWRITE the current database with $1"
echo "Current data will be lost. Press ENTER to continue or Ctrl+C to abort."
read -r _

gunzip -c "$1" | psql

echo "[$(date)] Restore complete"
