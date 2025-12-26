from contextlib import contextmanager

from sqlalchemy import JSON, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from core.postgres_settings import postgres_settings


class ModelBase(DeclarativeBase):
    type_annotation_map = {
        dict: JSON,
        list[dict]: JSON,
    }


sync_engine = create_engine(
    postgres_settings.get_connection_url(),
    echo=False,
    pool_size=10,
    max_overflow=2,
    pool_recycle=300,  # noqa: WPS432
    pool_pre_ping=True,
    pool_use_lifo=True,
)


@contextmanager
def get_sync_session() -> Session:
    session = sessionmaker(sync_engine)

    try:
        with session() as session:  # noqa: WPS440
            yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()