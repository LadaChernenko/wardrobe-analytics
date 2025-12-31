from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ItemBase(BaseModel):
    item: str
    brand: Optional[str] = None
    season: str
    year_of_buying: int
    category: str
    style: str
    damage: Optional[str] = None
    extra_colour: Optional[str] = None
    colour: Optional[str] = None
    cost: int
    use: int
    cost_per_use: float
    image_path: Optional[str] = None

class ItemCreate(BaseModel):
    item: str
    brand: Optional[str] = None
    season: str
    year_of_buying: int
    category: str
    style: str
    damage: Optional[str] = None
    extra_colour: Optional[str] = None
    colour: Optional[str] = None
    cost: int
    use: int

class ItemRead(ItemBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
