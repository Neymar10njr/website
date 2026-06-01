#!/bin/sh
# Entrypoint for the db-backup container.
# Sets up a daily cron job to run backup.sh, and runs an immediate backup on startup.

set -e

chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh 2>/dev/null || true

# Cron job: run at 03:00 every day
echo "0 3 * * * /usr/local/bin/backup.sh >> /backups/backup.log 2>&1" > /etc/crontabs/root

echo "[$(date)] Running initial backup..."
/usr/local/bin/backup.sh || echo "[$(date)] Initial backup failed (will retry per cron)"

echo "[$(date)] Starting cron daemon (daily backup at 03:00)"
exec crond -f -d 8
