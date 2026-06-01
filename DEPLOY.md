# TrekNest Bhutan — Production Deploy Guide

This guide gets you from a fresh Linux VPS to a live, HTTPS-secured TrekNest deployment in about 30 minutes.

## Prerequisites

- A Linux VPS (Ubuntu 22.04 or Debian 12 recommended, **2 GB RAM minimum**)
- A registered domain pointing to your VPS's IP (A record on the apex + `www`)
- Docker + Docker Compose installed:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- Git installed: `apt install -y git`
- Ports 80 and 443 open (`ufw allow 80,443/tcp`)

## 1. Clone the repo

```bash
git clone <your-repo-url> treknest
cd treknest
```

## 2. Generate strong secrets

```bash
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
python3 -c "import secrets; print('POSTGRES_PASSWORD=' + secrets.token_urlsafe(32))"
```

Copy each value — you'll paste them into `.env` next.

## 3. Create `.env`

```bash
cp .env.example .env
nano .env
```

Fill in **every** value:

| Variable | Example | Notes |
|---|---|---|
| `FLASK_ENV` | `production` | **Must be `production`** |
| `PUBLIC_DOMAIN` | `treknest.bt` | Your registered domain (no `https://`) |
| `ALLOWED_ORIGINS` | `https://treknest.bt` | Frontend origin(s), comma-separated |
| `PUBLIC_BACKEND_URL` | `https://treknest.bt` | Same as your domain |
| `SECRET_KEY` | _(generated)_ | From step 2 |
| `JWT_SECRET_KEY` | _(generated)_ | From step 2 |
| `POSTGRES_USER` | `treknest` | |
| `POSTGRES_PASSWORD` | _(generated)_ | From step 2 |
| `POSTGRES_DB` | `treknest` | |
| `DATABASE_URI` | `postgresql+psycopg2://treknest:THE_PASSWORD@db:5432/treknest` | Use the same password |
| `ACME_EMAIL` | `you@yourdomain.com` | For Let's Encrypt notifications |
| `SMTP_*` | _(optional)_ | See below |

### Email (verification + password reset)

If you skip SMTP, emails are written to the application log instead — useful for testing but users won't actually receive verification mail.

For real email, easiest options are:
- **SendGrid** (free 100/day): `SMTP_HOST=smtp.sendgrid.net`, `SMTP_USER=apikey`, `SMTP_PASSWORD=<api-key>`
- **Mailgun**: `SMTP_HOST=smtp.mailgun.org`, `SMTP_PORT=587`
- **Gmail SMTP**: requires an app password and is rate-limited (avoid for production)

### Optional: Sentry

Sign up at sentry.io, create a project, copy the DSN, paste into `SENTRY_DSN`. All exceptions in production are auto-reported.

### Optional: S3 image storage

Skip unless you scale beyond one server. Local volume works fine for one server.

## 4. Launch

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**What happens:**
1. Postgres starts and runs healthcheck
2. Backend container runs migrations + seeds sample data
3. Backend starts Gunicorn (4 workers × 2 threads = 8 concurrent requests)
4. Frontend nginx starts on internal port 80
5. **Caddy** binds to ports 80/443, automatically requests a TLS cert from Let's Encrypt for your domain, and starts proxying
6. **db-backup** container runs an immediate backup, then schedules a daily backup at 03:00

The first request takes ~30s while Caddy fetches the cert. After that, your site is live at **`https://your-domain`**.

## 5. Verify

```bash
# Should be 200
curl -sI https://your-domain | head -1

# Should return JSON
curl -s https://your-domain/api/treks/ | head -c 100

# Confirm HTTPS works
curl -sI https://your-domain | grep -i "strict-transport-security"
```

## 6. Operations

### Logs

```bash
docker compose logs backend --tail 100 -f
docker compose logs caddy --tail 100 -f
```

Application logs (with rotation) inside backend at `/app/logs/treknest.log`.

### Schema migrations after a model change

```bash
docker compose exec backend flask db migrate -m "describe what changed"
docker compose exec backend flask db upgrade
```

Migrations are versioned in `backend/migrations/versions/` — commit them to git.

### Database backups

Backups run automatically every day at 03:00. Files saved to `./backups/` on the host (kept for 14 days).

```bash
# List backups
ls -lh backups/

# Manual backup
docker compose exec db-backup /usr/local/bin/backup.sh

# Restore (DESTROYS current data)
docker compose exec db-backup /usr/local/bin/restore.sh /backups/treknest_20260505_030000.sql.gz
```

**Recommended:** also copy `./backups/` to off-server storage (e.g. `rclone sync backups/ b2:my-bucket/treknest-backups/`).

### Update to a new version

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 7. Maintenance checklist

| Frequency | Task |
|---|---|
| **Daily** | Check that backups are happening (`ls backups/`) |
| **Weekly** | Review backend logs for errors |
| **Monthly** | `apt upgrade` on the host VPS |
| **Quarterly** | Rotate `JWT_SECRET_KEY` (forces all users to re-login) |

## 8. Security posture

| Concern | Mitigation |
|---|---|
| HTTPS | Caddy + Let's Encrypt (auto-renew) |
| Brute-force login | Flask-Limiter — 10 logins / minute per IP |
| Spam registrations | 10 registrations / hour per IP |
| Spam bookings | 30 bookings / hour per authenticated user |
| Forged tokens | JWT signed with `JWT_SECRET_KEY` (256 bits, kept in env) |
| SQL injection | SQLAlchemy parameterised queries |
| XSS | Backend never renders user content in HTML — frontend uses `textContent` not `innerHTML` for user data |
| CSRF | API uses Bearer tokens, not cookies (immune to CSRF) |
| Secrets in git | `.env` is in `.gitignore`; only `.env.example` committed |
| DB exposure | Postgres port not published; only the backend container can reach it |
| Server fingerprinting | Caddy strips `Server` header; HSTS + X-Frame-Options + X-Content-Type-Options applied |

## 9. Troubleshooting

**`Caddy: failed to obtain certificate`**
- DNS not pointed at server IP yet (wait for propagation, check with `dig your-domain`)
- Port 80 not reachable from internet (Let's Encrypt validation requires it)

**`backend: relation does not exist`**
- Migration didn't run. Manually: `docker compose exec backend flask db upgrade`

**`backend: 401 on every request`**
- `JWT_SECRET_KEY` changed; all old tokens invalidated. Users must log out and back in.

**`Forgot password emails go to logs only`**
- `SMTP_HOST` is empty in `.env`. Set proper SMTP credentials.

**`docker compose down` accidentally deleted the DB**
- Use `docker compose down` (without `-v`) — only `-v` removes volumes.
- Restore from `./backups/`.

## 10. Recommended next steps after launch

- Hook up an uptime monitor (UptimeRobot is free for 5 monitors)
- Set up Sentry for error tracking
- Move backups off-server (Backblaze B2 = $0.005/GB/month)
- If traffic grows, switch to managed Postgres (DigitalOcean Managed DB, Neon, Supabase)
- If you scale to multiple backend instances, switch image storage to S3 by setting `AWS_S3_BUCKET` in `.env`
