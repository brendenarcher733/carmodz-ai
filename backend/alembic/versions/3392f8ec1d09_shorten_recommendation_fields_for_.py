"""shorten recommendation fields for speed/reliability pass

Replaces the free-text description/warnings/brand_tips/exact_product fields
with shorter, structured ones (why/impact/compatibility_note/tradeoff/
suggested_search_terms) — see services/ai_service.py and
models/recommendation.py for why.

Revision ID: 3392f8ec1d09
Revises: 4f1a9c7e2b3d
Create Date: 2026-10-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3392f8ec1d09'
down_revision: Union[str, None] = '4f1a9c7e2b3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('recommendations', sa.Column('why', sa.Text(), nullable=True))
    op.execute("UPDATE recommendations SET why = COALESCE(description, '')")
    op.alter_column('recommendations', 'why', nullable=False)

    op.add_column('recommendations', sa.Column('impact', sa.String(length=200), nullable=False, server_default=''))
    op.add_column('recommendations', sa.Column('compatibility_note', sa.String(length=200), nullable=False, server_default=''))
    op.add_column('recommendations', sa.Column('tradeoff', sa.String(length=200), nullable=False, server_default=''))
    op.add_column('recommendations', sa.Column('suggested_search_terms', sa.JSON(), nullable=True))

    op.drop_column('recommendations', 'description')
    op.drop_column('recommendations', 'warnings')
    op.drop_column('recommendations', 'brand_tips')
    op.drop_column('recommendations', 'exact_product')


def downgrade() -> None:
    op.add_column('recommendations', sa.Column('description', sa.Text(), nullable=True))
    op.execute("UPDATE recommendations SET description = why")
    op.alter_column('recommendations', 'description', nullable=False)
    op.add_column('recommendations', sa.Column('warnings', sa.JSON(), nullable=True))
    op.add_column('recommendations', sa.Column('brand_tips', sa.JSON(), nullable=True))
    op.add_column('recommendations', sa.Column('exact_product', sa.String(length=200), nullable=False, server_default=''))

    op.drop_column('recommendations', 'why')
    op.drop_column('recommendations', 'impact')
    op.drop_column('recommendations', 'compatibility_note')
    op.drop_column('recommendations', 'tradeoff')
    op.drop_column('recommendations', 'suggested_search_terms')
