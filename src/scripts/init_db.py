import pandas as pd
from sqlalchemy import text
from core.database import sync_engine, get_sync_session
from models.item import Item

# Загружаем CSV/Excel с твоими данными
# Для примера: сохрани таблицу в data/items.csv
data = pd.read_csv("/app/data/items.csv", sep="\t")  # или другой разделитель

# Создаём таблицу в БД
ModelBase = Item.metadata
ModelBase.create_all(sync_engine)

# Заполняем БД
with get_sync_session() as session:
    for _, row in data.iterrows():
        item = Item(
            item=row["item"],
            brand=row.get("brand"),
            season=row["season"],
            year_of_buying=row["year_of_bying"],  # поправим в CSV на "year_of_buying"
            category=row["category"],
            damage=row.get("demage"),
            extra_colour=row.get("extra_colour"),
            colour=row.get("colour"),
            cost=int(str(row["cost"]).replace(" ", "").replace(" ", "")),
            use=int(row["use"]),
            cost_per_use=float(str(row["cost_per_use"]).replace(",", ".").replace(" ", "")),
        )
        session.add(item)
    session.commit()

print("✅ Таблица items создана и заполнена.")
