"""add exact_product to recommendations

Revision ID: 4f1a9c7e2b3d
Revises: 0eefffb6730d
Create Date: 2026-10-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f1a9c7e2b3d'
down_revision: Union[str, None] = '0eefffb6730d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'recommendations',
        sa.Column('exact_product', sa.String(length=200), nullable=False, server_default=''),
    )


def downgrade() -> None:
    op.drop_column('recommendations', 'exact_product')
