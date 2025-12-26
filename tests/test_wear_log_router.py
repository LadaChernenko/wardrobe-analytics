import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database import ModelBase, get_sync_session
from main import app
from models.item import Item
from models.wear_log import WearLog

# --- создаем тестовую БД ---
TEST_DATABASE_URL = "sqlite:///./test_wear_log.db"

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)

# Переопределяем зависимость get_sync_session для тестов
def override_get_sync_session():
    with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_sync_session] = override_get_sync_session

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Создаём таблицы
    ModelBase.metadata.create_all(test_engine)
    yield
    ModelBase.metadata.drop_all(test_engine)


@pytest.fixture
def test_item():
    """Создаём один тестовый предмет"""
    with TestingSessionLocal() as session:
        item = Item(
            id=1,
            name="Test Jacket",
            brand="Zara",
            category="Outerwear",
            colour="Black",
            cost=100,
            use=0,
            cost_per_use=None,
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        return item


def test_add_wear_log_success(test_item):
    """Добавление записи о ношении"""
    payload = {"item_id": test_item.id, "date": "2025-10-12", "notes": "Evening walk"}
    response = client.post("/wear_log/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["item_id"] == test_item.id
    assert data["notes"] == "Evening walk"

    # Проверяем, что use и cost_per_use обновились
    with TestingSessionLocal() as session:
        item = session.get(Item, test_item.id)
        assert item.use == 1
        assert item.cost_per_use == 100.0


def test_add_wear_log_invalid_item():
    """Ошибка при несуществующем item_id"""
    payload = {"item_id": 999, "date": "2025-10-12", "notes": "Invalid item"}
    response = client.post("/wear_log/", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "Item not found"


def test_get_all_wear_logs():
    """Получение всех записей"""
    response = client.get("/wear_log/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "date" in data[0]
    assert "item_id" in data[0]
