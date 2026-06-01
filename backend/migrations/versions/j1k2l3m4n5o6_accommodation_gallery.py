"""add image_gallery to accommodations

Revision ID: j1k2l3m4n5o6
Revises: i0j1k2l3m4n5
Create Date: 2026-05-22 08:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'j1k2l3m4n5o6'
down_revision = 'i0j1k2l3m4n5'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('accommodations') as batch:
        batch.add_column(sa.Column('image_gallery', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('accommodations') as batch:
        batch.drop_column('image_gallery')
