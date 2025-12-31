import pandas as pd
from sqlalchemy import text
from core.database import sync_engine, get_sync_session
from core.settings import df_path
from models.item import Item

data = pd.read_csv(df_path, sep="\t")  # или другой разделитель

ModelBase = Item.metadata
ModelBase.create_all(sync_engine)

# Заполняем БД
with get_sync_session() as session:
    for _, row in data.iterrows():
        item = Item(
            item=row["item"],
            brand=row.get("brand"),
            season=row["season"],
            year_of_buying=row["year_of_bying"],
            category=row["category"],
            style=row["style"],
            damage=row.get("demage"),
            extra_colour=row.get("extra_colour"),
            colour=row.get("colour"),
            cost=int(str(row["cost"]).replace(" ", "").replace(" ", "")),
            use=int(row["use"]),
            cost_per_use=float(str(row["cost_per_use"]).replace(",", ".").replace(" ", "")),
        )
        session.add(item)
    session.commit()

print("Таблица items создана и заполнена.")
