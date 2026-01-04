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
                image_path=str(filename),
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

@router.patch("/{item_id}", response_model=ItemRead)
def update_item(
    item_id: int,
    item: str | None = Form(None),
    brand: str | None = Form(None),
    season: SeasonEnum | None = Form(None),
    year_of_buying: int | None = Form(None),
    category: CategoryEnum | None = Form(None),
    style: str | None = Form(None),
    damage: str | None = Form(None),
    extra_colour: str | None = Form(None),
    colour: str | None = Form(None),
    cost: int | None = Form(None),
    use: int | None = Form(None),
    image: UploadFile | None = File(None),
):
    with get_sync_session() as session:
        item_obj = session.query(Item).filter(Item.id == item_id).first()
        if not item_obj:
            raise HTTPException(status_code=404, detail="Item not found")

        for field, value in {
            "item": item,
            "brand": brand,
            "season": season,
            "year_of_buying": year_of_buying,
            "category": category,
            "style": style,
            "damage": damage,
            "extra_colour": extra_colour,
            "colour": colour,
            "cost": cost,
            "use": use,
        }.items():
            if value is not None:
                setattr(item_obj, field, value)

        if cost is not None or use is not None:
            current_cost = cost if cost is not None else item_obj.cost
            current_use = use if use is not None else item_obj.use
            item_obj.cost_per_use = (
                round(current_cost / current_use, 2)
                if current_use > 0
                else float(current_cost)
            )

        if image:

            if item_obj.image_path:
                old_path = UPLOAD_DIR / item_obj.image_path
                if old_path.exists():
                    old_path.unlink()

            ext = Path(image.filename).suffix
            filename = f"{uuid.uuid4()}{ext}"
            save_path = UPLOAD_DIR / filename

            try:
                with save_path.open("wb") as f:
                    f.write(image.file.read())

                clothes_segmentator.save_segmented_clothing(
                    image_path=save_path,
                    category=item_obj.category,
                    output_path=SEGMENT_DIR,
                )

                item_obj.image_path = filename
                logger.info(f"Item {item_id} image updated")

            except Exception as e:
                logger.error(f"Fail to update image for item {item_id}: {e}")
                raise HTTPException(status_code=500, detail="Image update failed")

        session.commit()
        session.refresh(item_obj)
        return item_obj
    
@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int):
    with get_sync_session() as session:
        item_obj = session.query(Item).filter(Item.id == item_id).first()
        if not item_obj:
            raise HTTPException(status_code=404, detail="Item not found")

        if item_obj.image_path:
            image_path = UPLOAD_DIR / item_obj.image_path
            if image_path.exists():
                image_path.unlink()

        segmented_path = SEGMENT_DIR / item_obj.image_path
        if segmented_path.exists():
            segmented_path.unlink()

        session.delete(item_obj)
        session.commit()

        logger.info(f"Item {item_id} deleted")