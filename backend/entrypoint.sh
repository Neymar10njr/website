#!/bin/bash
set -e

cd /app
export FLASK_APP=run.py

if [ ! -d "/app/migrations/versions" ]; then
    echo "==> No migrations folder found. Initializing..."
    rm -rf /app/migrations
    flask db init
    flask db migrate -m "initial schema"
fi

echo "==> Applying database migrations..."
flask db upgrade

echo "==> Seeding sample data if empty..."
python -c "
from app import create_app
from app.seed import seed_treks_if_empty
from app.seed_accommodations import seed_accommodations_if_empty
from app.seed_pilgrimages import seed_pilgrimages_if_empty
from app.seed_company import seed_operator_if_empty, seed_admin_if_empty, seed_staff_if_empty
app = create_app()
with app.app_context():
    if seed_operator_if_empty(): print('  + Seeded TrekNest Bhutan operator profile')
    admin = seed_admin_if_empty()
    if admin: print(f\"  + Seeded admin user: {admin['username']} / {admin['password']}\")
    s = seed_staff_if_empty()
    if s: print(f'  + Seeded {s} staff guide accounts')
    n1 = seed_treks_if_empty()
    n2 = seed_accommodations_if_empty()
    n3 = seed_pilgrimages_if_empty()
    if n1: print(f'  + Seeded {n1} treks')
    if n2: print(f'  + Seeded {n2} accommodations')
    if n3: print(f'  + Seeded {n3} pilgrimage tours')
"

echo "==> Starting application..."
exec "$@"
