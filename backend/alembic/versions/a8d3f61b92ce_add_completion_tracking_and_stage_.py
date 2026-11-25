"""add completion tracking to recommendations, stage_messages to builds

Revision ID: a8d3f61b92ce
Revises: 7c2b5e1a9f4d
Create Date: 2026-11-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8d3f61b92ce'
down_revision: Union[str, None] = '7c2b5e1a9f4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('recommendations', sa.Column('completed', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('recommendations', sa.Column('completed_at', sa.DateTime(), nullable=True))
    op.add_column('recommendations', sa.Column('completed_by', sa.String(length=10), nullable=True))
    op.add_column('recommendations', sa.Column('completion_note', sa.Text(), nullable=True))
    op.add_column('builds', sa.Column('stage_messages', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('builds', 'stage_messages')
    op.drop_column('recommendations', 'completion_note')
    op.drop_column('recommendations', 'completed_by')
    op.drop_column('recommendations', 'completed_at')
    op.drop_column('recommendations', 'completed')
