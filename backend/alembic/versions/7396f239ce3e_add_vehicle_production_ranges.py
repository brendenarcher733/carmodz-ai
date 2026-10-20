"""add vehicle production ranges (Phase 1.1)

A VehicleModel's production span is not always one contiguous
[production_year_start, production_year_end] — real nameplates have gaps
and multiple generations (Dodge Viper, Acura/Honda NSX, ...). This adds
vehicle_production_ranges as the actual source of truth for "was this year
produced" (see services/vehicle_service.check_vehicle), and backfills one
range per existing vehicle_models row from its current start/end so no data
is lost.

vehicle_models.production_year_start/end are kept, unchanged, as a
denormalized summary only — see models/vehicle.py's VehicleModel docstring.
They are no longer read by validation.

Revision ID: 7396f239ce3e
Revises: c5d9fd2ea5dd
Create Date: 2026-10-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7396f239ce3e'
down_revision: Union[str, None] = 'c5d9fd2ea5dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vehicle_production_ranges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vehicle_model_id', sa.Integer(), nullable=False),
        sa.Column('generation_label', sa.String(length=100), nullable=True),
        sa.Column('production_year_start', sa.Integer(), nullable=False),
        sa.Column('production_year_end', sa.Integer(), nullable=True),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('source_last_verified_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['vehicle_model_id'], ['vehicle_models.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'vehicle_model_id', 'production_year_start', 'production_year_end',
            name='uq_vehicle_production_range_model_span',
        ),
    )
    op.create_index(op.f('ix_vehicle_production_ranges_id'), 'vehicle_production_ranges', ['id'], unique=False)
    op.create_index(
        op.f('ix_vehicle_production_ranges_vehicle_model_id'),
        'vehicle_production_ranges', ['vehicle_model_id'], unique=False,
    )

    # Backfill: one range per existing model, copying its current
    # start/end/source_* — preserves every model's existing validity exactly
    # as it worked before this migration (single-range models are
    # unaffected; multi-range models get their additional ranges from the
    # next seed run, not from this backfill, since this migration has no way
    # to know about a gap that was never recorded).
    op.execute("""
        INSERT INTO vehicle_production_ranges
            (vehicle_model_id, generation_label, production_year_start, production_year_end,
             source_url, source_last_verified_at, is_active)
        SELECT id, NULL, production_year_start, production_year_end,
               source_url, source_last_verified_at, true
        FROM vehicle_models
    """)


def downgrade() -> None:
    op.drop_index(op.f('ix_vehicle_production_ranges_vehicle_model_id'), table_name='vehicle_production_ranges')
    op.drop_index(op.f('ix_vehicle_production_ranges_id'), table_name='vehicle_production_ranges')
    op.drop_table('vehicle_production_ranges')
