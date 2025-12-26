from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from core.database import get_sync_session
from models.item import Item
from schemas.item_schema import ItemCreate, ItemRead

router = APIRouter(prefix="/items", tags=["Items"])

@router.post("/", response_model=ItemRead)
def create_item(entry: ItemCreate):
    """Добавление нового предмета с автоматическим пересчётом cost_per_use"""
    with get_sync_session() as session:

        # 1. Преобразуем pydantic → dict
        data = entry.dict()

        # 2. Извлекаем cost и use
        cost = data.get("cost")
        use = data.get("use")

        # 3. Пересчёт стоимости использования
        if use and use > 0:
            data["cost_per_use"] = round(cost / use, 2)
        else:
            data["cost_per_use"] = float(cost)

        # 4. Создаём объект
        item = Item(**data)
        session.add(item)
        session.commit()
        session.refresh(item)

        return item


@router.get("/", response_model=list[ItemRead])
def get_items():
    """Получить все предметы"""
    with get_sync_session() as session:
        items = session.query(Item).order_by(Item.created_at.desc()).all()
        return items


@router.get("/{item_id}", response_model=ItemRead)
def get_item(item_id: int):
    """Получить один предмет"""
    with get_sync_session() as session:
        item = session.query(Item).filter(Item.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item
