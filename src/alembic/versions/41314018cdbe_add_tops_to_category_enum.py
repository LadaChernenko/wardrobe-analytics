"""add tops to category enum

Revision ID: 41314018cdbe
Revises: 9a40a7204ce8
Create Date: 2026-01-06 12:06:21.189675

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '41314018cdbe'
down_revision: Union[str, Sequence[str], None] = '9a40a7204ce8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("ALTER TYPE categoryenum ADD VALUE IF NOT EXISTS 'tops';")


def downgrade():
    pass
