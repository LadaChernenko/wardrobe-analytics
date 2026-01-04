from datetime import date
from pydantic import BaseModel


class WearLogCreate(BaseModel):
    item_id: int
    event_id: int
    date: date
    notes: str | None = None


class WearLogRead(BaseModel):
    id: int
    item_id: int
    event_id: int | None
    date: date
    notes: str | None

    class Config:
        orm_mode = True
