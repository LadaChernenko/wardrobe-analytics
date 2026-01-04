from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from core.database import get_sync_session
from models.wear_log import WearLog
from models.item import Item
from schemas.wear_log_schema import WearLogCreate, WearLogRead

from core.logger import logger

router = APIRouter(prefix="/wear_log", tags=["Wear Log"])


@router.post("/", response_model=WearLogRead)
def add_wear_log(entry: WearLogCreate):
    """Добавление записи о ношении"""
    with get_sync_session() as session:
        item = session.query(Item).filter(Item.id == entry.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        wear = WearLog(
            item_id=entry.item_id,
            event_id=entry.event_id,
            date=entry.date,
            notes=entry.notes
        )

        session.add(wear)

        item.use += 1
        item.cost_per_use = round(item.cost / item.use, 2)

        session.commit()
        session.refresh(wear)
        return wear


@router.get("/", response_model=list[WearLogRead])
def get_wear_logs(event_id: int | None = None):
    """Получить записи ношения (опционально по event)"""
    with get_sync_session() as session:
        query = session.query(WearLog)

        if event_id is not None:
            query = query.filter(WearLog.event_id == event_id)

        logs = query.order_by(WearLog.date.desc()).all()
        return logs
    
@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int):
    with get_sync_session() as session:
        logs = (
            session
            .query(WearLog)
            .filter(WearLog.event_id == event_id)
            .all()
        )

        if not logs:
            raise HTTPException(status_code=404, detail="Event not found")

        items_stats: dict[int, dict[str, any]] = {}

        for log in logs:
            item = log.item
            if not item:
                continue

            if item.id not in items_stats:
                items_stats[item.id] = {
                    "item": item,
                    "removed": 0,
                }

            items_stats[item.id]["removed"] += 1
            session.delete(log)

        for data in items_stats.values():
            item = data["item"]
            removed = data["removed"]

            item.use = max(item.use - removed, 0)
            item.cost_per_use = (
                round(item.cost / item.use, 2) if item.use > 0 else None
            )

        session.commit()

        logger.info(
            f"Deleted {len(logs)} wear logs for event_id={event_id}, "
            f"affected_items={list(items_stats.keys())}"
        )

@router.delete("/{id}", status_code=204)
def delete_log(id: int):
    with get_sync_session() as session:
        wear_log = session.get(WearLog, id)

        if not wear_log:
            raise HTTPException(status_code=404, detail="Log not found")

        item = wear_log.item

        session.delete(wear_log)

        if item:
            item.use = max(item.use - 1, 0)
            item.cost_per_use = (
                round(item.cost / item.use, 2) if item.use > 0 else None
            )

        session.commit()

        logger.info(
            f"WearLog id={id} deleted, item_id={item.id if item else 'unknown'}"
        )
