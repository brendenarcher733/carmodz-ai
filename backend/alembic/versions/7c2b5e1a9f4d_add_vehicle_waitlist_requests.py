"""add vehicle_waitlist_requests

"My vehicle isn't listed" now dead-ends at a waitlist capture (see
models/vehicle_waitlist.py) instead of generating a plan for an
unverified, free-text vehicle. Plain capture: email + what they typed,
nothing else.

Revision ID: 7c2b5e1a9f4d
Revises: 4a1f2e8c9d3b
Create Date: 2026-11-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c2b5e1a9f4d'
down_revision: Union[str, None] = '4a1f2e8c9d3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vehicle_waitlist_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('make', sa.String(length=100), nullable=False),
        sa.Column('model', sa.String(length=150), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_vehicle_waitlist_requests_id'), 'vehicle_waitlist_requests', ['id'], unique=False)
    op.create_index(op.f('ix_vehicle_waitlist_requests_email'), 'vehicle_waitlist_requests', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_vehicle_waitlist_requests_email'), table_name='vehicle_waitlist_requests')
    op.drop_index(op.f('ix_vehicle_waitlist_requests_id'), table_name='vehicle_waitlist_requests')
    op.drop_table('vehicle_waitlist_requests')
