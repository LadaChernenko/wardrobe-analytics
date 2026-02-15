import csv
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
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
            current_cost_per_use=item.cost_per_use,
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
    
@router.delete("/event/{event_id}", status_code=204)
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

@router.delete("/log/{id}", status_code=204)
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

@router.post("/{event_id}/items", response_model=list[WearLogRead])
def add_items_to_event(
    event_id: int,
    item_ids: list[int],
    notes: str | None = None,
):
    """
    Добавить items в существующий event.
    Уже существующие item в event — игнорируются.
    """


    with get_sync_session() as session:
        # проверяем, что event вообще существует
        existing_logs = (
            session
            .query(WearLog)
            .filter(WearLog.event_id == event_id)
            .all()
        )

        if not existing_logs:
            raise HTTPException(status_code=404, detail="Event not found")

        event_date = existing_logs[0].date
        assert existing_logs[0].date is not None, "Event date must exist"

        existing_item_ids = {log.item_id for log in existing_logs}
        created_logs: list[WearLog] = []

        for item_id in item_ids:
            if item_id in existing_item_ids:
                continue

            item = session.get(Item, item_id)
            if not item:
                logger.warning(
                    f"Skipped adding item_id={item_id} to event_id={event_id}: item not found"
                )
                continue

            wear = WearLog(
                item_id=item_id,
                event_id=event_id,
                current_cost_per_use=item.cost_per_use,
                date=event_date,
                notes=notes,
            )

            session.add(wear)

            item.use += 1
            item.cost_per_use = round(item.cost / item.use, 2)

            created_logs.append(wear)

        session.commit()

        for wear in created_logs:
            session.refresh(wear)

        logger.info(
            f"Added {len(created_logs)} items to event_id={event_id}, "
            f"item_ids={[w.item_id for w in created_logs]}"
        )

        return created_logs
    
@router.get("/export/csv")
def export_logs_csv():
    with get_sync_session() as session:
        logs = (
            session.query(WearLog)
            .options(joinedload(WearLog.item))
            .order_by(WearLog.date.asc())
            .all()
        )

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "id",
            "item_id",
            "event_id",
            "current_cost_per_use",
            "date",
            "notes",
            "item_name",
        ])

        for log in logs:
            writer.writerow([
                log.id,
                log.item_id,
                log.event_id,
                log.current_cost_per_use,
                log.date.isoformat() if log.date else None,
                log.notes,
                log.item.item if log.item else None,
            ])

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=wear_logs.csv"
            }
        )
