"""add plan_email_captures

"Email me this plan" lead capture (see models/plan_email.py) — not an
account, just an email address plus the vehicle and a full plan snapshot.
This table's own id is the only "plan ID" an anonymous preview plan ever
gets, since services/preview_service.py never persists one otherwise.

Revision ID: 4a1f2e8c9d3b
Revises: 290547cb0ab2
Create Date: 2026-11-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a1f2e8c9d3b'
down_revision: Union[str, None] = '290547cb0ab2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'plan_email_captures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('make', sa.String(length=100), nullable=False),
        sa.Column('model', sa.String(length=150), nullable=False),
        sa.Column('plan_snapshot', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_plan_email_captures_id'), 'plan_email_captures', ['id'], unique=False)
    op.create_index(op.f('ix_plan_email_captures_email'), 'plan_email_captures', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_plan_email_captures_email'), table_name='plan_email_captures')
    op.drop_index(op.f('ix_plan_email_captures_id'), table_name='plan_email_captures')
    op.drop_table('plan_email_captures')
