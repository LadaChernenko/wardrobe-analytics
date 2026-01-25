from pydantic import BaseModel

class TopItemRead(BaseModel):
    id: int
    item: str
    usage_count: int

class CostStatsRead(BaseModel):
    avg_cpu: float | None
    median_cpu: float | None
    total_cost: float | None
    items_count: float | None
    total_cost_per_use: float | None

class DistributionRead(BaseModel):
    key: str
    items_count: int

class ExpensiveMistakeRead(BaseModel):
    id: int
    item: str
    cost: int
    usage: int
    badge: str | None

class BestValueRead(BaseModel):
    id: int
    item: str
    cost_per_use: float
