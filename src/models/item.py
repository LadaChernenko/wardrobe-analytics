from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float
from sqlalchemy import Enum as SQLEnum
from models.enums import CategoryEnum, SeasonEnum
from core.database import ModelBase
from sqlalchemy import DateTime, ForeignKey, delete, func, select, update
from sqlalchemy.orm import Mapped, joinedload, mapped_column, relationship


class Item(ModelBase):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    season = Column(SQLEnum(SeasonEnum), nullable=False)
    year_of_buying = Column(Integer, nullable=False)
    category = Column(SQLEnum(CategoryEnum), nullable=False)
    style = Column(String, nullable=False)
    damage = Column(String, nullable=True)
    extra_colour = Column(String, nullable=True)
    colour = Column(String, nullable=True)
    cost = Column(Integer, nullable=False)
    use = Column(Integer, nullable=False)
    cost_per_use = Column(Float, nullable=False)
    image_path = Column(String, nullable=True)
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, onupdate=func.now(), default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    wear_logs = relationship("WearLog", back_populates="item", cascade="all, delete-orphan")
