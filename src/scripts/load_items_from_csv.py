import pandas as pd
from sqlalchemy.orm import Session
from core.database import sync_engine, ModelBase, get_sync_session
from models.item import Item
from models.wear_log import WearLog

# путь к твоему CSV-файлу (замени на свой)
CSV_PATH = "/app/data/Cost_per_use_2025.csv"

def create_tables():
    """Создаёт таблицы в БД, если они ещё не существуют"""
    ModelBase.metadata.create_all(bind=sync_engine)

def load_items_from_csv(csv_path: str):
    df = pd.read_csv(csv_path, on_bad_lines='warn') #, sep=","
    df = df.drop(columns=['cost_per_month'])
    print(df.head())

    # переименуем столбцы, если в CSV они немного отличаются
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df.rename(columns={
            "year_of_bying": "year_of_buying",
            "demage": "damage",
        }, inplace=True)
    
    # очистим числа от лишних символов, если нужно (например "8 990,00")
    for col in ["cost", "cost_per_use"]:
        if col in df.columns:
            df[col] = (
                df[col]
                .astype(str)
                .str.replace("\u00a0", "")  # неразрывный пробел
                .str.replace(",", ".")
                .astype(float)
            )
    df = df.where(pd.notna(df), None)

    with get_sync_session() as session:
        for _, row in df.iterrows():

            item = Item(**row.to_dict())
            
            session.add(item)
        session.commit()

    print(f"✅ Loaded {len(df)} rows into 'item' table.")

if __name__ == "__main__":
    create_tables()
    load_items_from_csv(CSV_PATH)
