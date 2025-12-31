from fastapi import (
    APIRouter, 
    HTTPException,
    UploadFile, 
    File, 
    Form
    )
import uuid
from pathlib import Path
from sqlalchemy.orm import Session

from core.database import get_sync_session
from core.settings import settings
from core.services.wardrop_segmentation import clothes_segmentator
from models.item import Item
from schemas.item_schema import ItemCreate, ItemRead
from models.enums import CategoryEnum, SeasonEnum
from core.logger import logger


router = APIRouter(prefix="/items", tags=["Items"])

UPLOAD_DIR = Path(settings.data_root_path, "garments")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SEGMENT_DIR = Path(settings.data_root_path, "segmented")
SEGMENT_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/", response_model=ItemRead)
def create_item(
    item: str = Form(...),
    brand: str | None = Form(None),
    season: SeasonEnum = Form(...),
    year_of_buying: int = Form(...),
    category: CategoryEnum = Form(...),
    style: str = Form(...),
    damage: str | None = Form(None),
    extra_colour: str | None = Form(None),
    colour: str | None = Form(None),
    cost: int = Form(...),
    use: int = Form(...),
    image: UploadFile | None = File(None),
):
    with get_sync_session() as session:

        # сохранение изображения
        image_path = None
        if image:
            ext = Path(image.filename).suffix
            filename = f"{uuid.uuid4()}{ext}"
            save_path = UPLOAD_DIR / filename
            try:
                with save_path.open("wb") as f:
                    f.write(image.file.read())

                logger.info(f'Image for Item {item} saved to {save_path}')
            except Exception as e:
                logger.error(f'Fail to save Item: {item} - {e}')
            image_path = Path(UPLOAD_DIR, filename)
            try:
                clothes_segmentator.save_segmented_clothing(
                        image_path=image_path,
                        category=category,
                        output_path=SEGMENT_DIR,
                    )
                logger.info(f'Item {item} segmented')
            except Exception as e:
                logger.error(f'Fail to segment Item: {item} - {e}')

        # расчёт стоимости
        cost_per_use = round(cost / use, 2) if use > 0 else float(cost)
        try:
            item_obj = Item(
                item=item,
                brand=brand,
                season=season,
                year_of_buying=year_of_buying,
                category=category,
                style=style,
                damage=damage,
                extra_colour=extra_colour,
                colour=colour,
                cost=cost,
                use=use,
                cost_per_use=cost_per_use,
                image_path=str(image_path),
            )
            logger.info(f'Item {item} added to DataBase')
        except Exception as e:
            logger.error(f'Fail to save Item: {item} - {e}')

        session.add(item_obj)
        session.commit()
        session.refresh(item_obj)

        return item_obj


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
