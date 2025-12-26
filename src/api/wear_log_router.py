from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from core.database import get_sync_session
from models.wear_log import WearLog
from models.item import Item
from schemas.wear_log_schema import WearLogCreate, WearLogRead

router = APIRouter(prefix="/wear_log", tags=["Wear Log"])


@router.post("/", response_model=WearLogRead)
def add_wear_log(entry: WearLogCreate):
    """Добавление записи о ношении"""
    with get_sync_session() as session:
        item = session.query(Item).filter(Item.id == entry.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")


        # Создаём запись
        wear = WearLog(item_id=entry.item_id, date=entry.date, notes=entry.notes)
        session.add(wear)

        # Обновляем статистику по item
        item.use += 1
        item.cost_per_use = round(item.cost / item.use, 2)

        session.commit()
        session.refresh(wear)
        return wear


@router.get("/", response_model=list[WearLogRead])
def get_wear_logs():
    """Получить все записи ношения"""
    with get_sync_session() as session:
        logs = session.query(WearLog).order_by(WearLog.date.desc()).all()
        return logs
