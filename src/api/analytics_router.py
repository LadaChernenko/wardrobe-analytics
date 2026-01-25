from fastapi import APIRouter
from datetime import date

from core.database import get_sync_session
from core.services.analytics_service import AnalyticsService
from schemas.analytics_schema import (
    TopItemRead,
    CostStatsRead,
    DistributionRead,
    ExpensiveMistakeRead,
    BestValueRead,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/top-items", response_model=list[TopItemRead])
def get_top_items(
    date_from: date | None = None,
    date_to: date | None = None,
):
    with get_sync_session() as session:
        service = AnalyticsService(session)
        rows = service.get_top_items(date_from, date_to)

        return [
            TopItemRead(
                id=r.id,
                item=r.item,
                usage_count=r.usage_count,
            )
            for r in rows
        ]


@router.get("/cost-stats", response_model=CostStatsRead)
def get_cost_stats():
    with get_sync_session() as session:
        service = AnalyticsService(session)
        stats = service.get_cost_stats()

        return CostStatsRead(
            avg_cpu=stats.avg_cpu,
            median_cpu=stats.median_cpu,
            total_cost=stats.total_cost,
            items_count=stats.items_count,
            total_cost_per_use=stats.total_cost_per_use,
        )

@router.get("/distribution")
def distribution():
    with get_sync_session() as session:
        service = AnalyticsService(session)
        balance = service.get_balance()

        return {
            "by_category": [
                {"key": r.category, "items_count": r.items_count}
                for r in balance["by_category"]
            ],
            "by_season": [
                {"key": r.season, "items_count": r.items_count}
                for r in balance["by_season"]
            ],
        }

    
@router.get("/expensive-mistakes", response_model=list[ExpensiveMistakeRead])
def get_expensive_mistakes(
    min_cost: int = 10000,
    max_usage: int = 3,
    limit: int = 10
):
    with get_sync_session() as session:
        service = AnalyticsService(session)
        return service.get_expensive_mistakes(
            min_cost=min_cost,
            max_usage=max_usage,
            limit=limit
        )

@router.get("/best-value", response_model=list[BestValueRead])
def get_best_value_items():
    with get_sync_session() as session:
        service = AnalyticsService(session)
        rows = service.get_best_value_items()

        return [BestValueRead(
                id=r.id,
                item=r.item,
                cost_per_use=r.cost_per_use,
                )
                for r in rows
        ]