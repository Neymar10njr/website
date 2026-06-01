"""operator profile, staff profile, tour categories

Revision ID: f1a2b3c4d5e6
Revises: e3dc3d188f97
Create Date: 2026-05-07 06:30:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'f1a2b3c4d5e6'
down_revision = 'e3dc3d188f97'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'operator_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(length=160), nullable=False),
        sa.Column('tagline', sa.String(length=255), nullable=True),
        sa.Column('licence_number', sa.String(length=80), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('support_phone', sa.String(length=40), nullable=True),
        sa.Column('whatsapp_number', sa.String(length=40), nullable=True),
        sa.Column('support_email', sa.String(length=120), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('office_address', sa.String(length=255), nullable=True),
        sa.Column('business_hours', sa.String(length=120), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('years_active', sa.Integer(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'staff_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('display_name', sa.String(length=120), nullable=True),
        sa.Column('role_title', sa.String(length=80), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('guide_licence_no', sa.String(length=80), nullable=True),
        sa.Column('certifications', sa.Text(), nullable=True),
        sa.Column('years_experience', sa.Integer(), nullable=True),
        sa.Column('languages', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_staff_user'),
    )

    with op.batch_alter_table('treks') as batch:
        batch.add_column(sa.Column('tour_type', sa.String(length=20), nullable=False, server_default='trek'))
        batch.add_column(sa.Column('country', sa.String(length=60), nullable=False, server_default='Bhutan'))
        batch.add_column(sa.Column('religious_tradition', sa.String(length=60), nullable=True))
        batch.add_column(sa.Column('sacred_sites', sa.Text(), nullable=True))
        batch.alter_column('dzongkhag', existing_type=sa.String(length=50), type_=sa.String(length=80))


def downgrade():
    with op.batch_alter_table('treks') as batch:
        batch.alter_column('dzongkhag', existing_type=sa.String(length=80), type_=sa.String(length=50))
        batch.drop_column('sacred_sites')
        batch.drop_column('religious_tradition')
        batch.drop_column('country')
        batch.drop_column('tour_type')

    op.drop_table('staff_profiles')
    op.drop_table('operator_profiles')
