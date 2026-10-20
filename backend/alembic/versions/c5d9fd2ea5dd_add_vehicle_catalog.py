"""add vehicle catalog (Phase 1)

Adds vehicle_makes / vehicle_models (the authoritative, locally-stored
catalog — see models/vehicle.py) and builds.vehicle_verified (set at build
creation time once the catalog has been checked — see
services/vehicle_service.check_vehicle and services/build_service.create_build).

Existing builds predate the catalog and were never checked against it, so
they backfill to vehicle_verified=false (honest default: "never verified",
not "known good").

Revision ID: c5d9fd2ea5dd
Revises: 3392f8ec1d09
Create Date: 2026-10-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5d9fd2ea5dd'
down_revision: Union[str, None] = '3392f8ec1d09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vehicle_makes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('normalized_name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('normalized_name'),
    )
    op.create_index(op.f('ix_vehicle_makes_id'), 'vehicle_makes', ['id'], unique=False)
    op.create_index(op.f('ix_vehicle_makes_normalized_name'), 'vehicle_makes', ['normalized_name'], unique=True)

    op.create_table(
        'vehicle_models',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('make_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('normalized_name', sa.String(length=150), nullable=False),
        sa.Column('production_year_start', sa.Integer(), nullable=False),
        sa.Column('production_year_end', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('source_last_verified_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['make_id'], ['vehicle_makes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('make_id', 'normalized_name', name='uq_vehicle_model_make_normalized_name'),
    )
    op.create_index(op.f('ix_vehicle_models_id'), 'vehicle_models', ['id'], unique=False)
    op.create_index(op.f('ix_vehicle_models_make_id'), 'vehicle_models', ['make_id'], unique=False)
    op.create_index(op.f('ix_vehicle_models_normalized_name'), 'vehicle_models', ['normalized_name'], unique=False)

    op.add_column(
        'builds',
        sa.Column('vehicle_verified', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('builds', 'vehicle_verified')

    op.drop_index(op.f('ix_vehicle_models_normalized_name'), table_name='vehicle_models')
    op.drop_index(op.f('ix_vehicle_models_make_id'), table_name='vehicle_models')
    op.drop_index(op.f('ix_vehicle_models_id'), table_name='vehicle_models')
    op.drop_table('vehicle_models')

    op.drop_index(op.f('ix_vehicle_makes_normalized_name'), table_name='vehicle_makes')
    op.drop_index(op.f('ix_vehicle_makes_id'), table_name='vehicle_makes')
    op.drop_table('vehicle_makes')
