from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from core.database import sync_engine
from models.item import Item
from models.wear_log import WearLog
from api.wear_log_router import router as wear_log_router
from api.item_router import router as item_router


app = FastAPI(title="Wardrobe API")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Создание таблиц при старте
@app.on_event("startup")
def on_startup():
    Item.metadata.create_all(sync_engine)
    WearLog.metadata.create_all(sync_engine)


# Подключаем роутер
app.include_router(wear_log_router)
app.include_router(item_router)


@app.get("/")
def root():
    return {"message": "Wardrobe API is running"}
