"""widen featured_guest columns to TEXT (no length limit)

Revision ID: i0j1k2l3m4n5
Revises: h9i0j1k2l3m4
Create Date: 2026-05-22 07:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'i0j1k2l3m4n5'
down_revision = 'h9i0j1k2l3m4'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('trek_events') as batch:
        batch.alter_column('featured_guest',
                           existing_type=sa.String(length=160), type_=sa.Text(),
                           existing_nullable=True)
        batch.alter_column('featured_guest_role',
                           existing_type=sa.String(length=255), type_=sa.Text(),
                           existing_nullable=True)


def downgrade():
    with op.batch_alter_table('trek_events') as batch:
        batch.alter_column('featured_guest_role',
                           existing_type=sa.Text(), type_=sa.String(length=255),
                           existing_nullable=True)
        batch.alter_column('featured_guest',
                           existing_type=sa.Text(), type_=sa.String(length=160),
                           existing_nullable=True)
