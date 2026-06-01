"""add featured_guest to trek_events

Revision ID: h9i0j1k2l3m4
Revises: g7h8i9j0k1l2
Create Date: 2026-05-22 09:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'h9i0j1k2l3m4'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('trek_events') as batch:
        batch.add_column(sa.Column('featured_guest', sa.String(length=160), nullable=True))
        batch.add_column(sa.Column('featured_guest_role', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('trek_events') as batch:
        batch.drop_column('featured_guest_role')
        batch.drop_column('featured_guest')
