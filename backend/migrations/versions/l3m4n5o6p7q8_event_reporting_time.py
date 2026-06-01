"""add reporting_time to trek_events

Revision ID: l3m4n5o6p7q8
Revises: k2l3m4n5o6p7
Create Date: 2026-05-25 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'l3m4n5o6p7q8'
down_revision = 'k2l3m4n5o6p7'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('trek_events') as batch:
        batch.add_column(sa.Column('reporting_time', sa.Time(), nullable=True))


def downgrade():
    with op.batch_alter_table('trek_events') as batch:
        batch.drop_column('reporting_time')
