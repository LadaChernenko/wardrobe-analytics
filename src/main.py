from fastapi import FastAPI
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from core.database import sync_engine
from models.item import Item
from models.wear_log import WearLog
from api.wear_log_router import router as wear_log_router
from api.item_router import router as item_router
from core.settings import settings


app = FastAPI(title="Wardrobe API")
app.mount("/static", StaticFiles(directory="static"), name="static")

segmented_path = Path(settings.data_root_path, "segmented")
app.mount("/segmented", StaticFiles(directory=segmented_path), name="segmented")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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
