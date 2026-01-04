from sqlalchemy import Column, Integer, ForeignKey, Date, String
from sqlalchemy.orm import relationship
from core.database import ModelBase


class WearLog(ModelBase):
    __tablename__ = "wear_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)

    event_id = Column(Integer, index=True, nullable=False)
    
    date = Column(Date, nullable=False)
    notes = Column(String, nullable=True)

    item = relationship("Item", back_populates="wear_logs")
