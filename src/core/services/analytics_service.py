from sqlalchemy.orm import Session
from datetime import date

from core.services.wardrobe_analysis import (
    top_items,
    cost_per_use_stats,
    usage_per_item_stats,
    category_distribution,
    season_distribution,
    style_distribution,
    best_value_items,
    expensive_mistakes,
    least_used_items,
)

class AnalyticsService:

    def __init__(self, session: Session):
        self.session = session

    def get_top_items(self, date_from: date | None, date_to: date | None):
        stmt = top_items(date_from=date_from, date_to=date_to)
        return self.session.execute(stmt).all()

    def get_cost_stats(self):
        stmt = cost_per_use_stats()
        return self.session.execute(stmt).one()

    def get_usage_stats(self):
        stmt = usage_per_item_stats()
        return self.session.execute(stmt).one()

    def get_balance(self):
        return {
            "by_category": self.session.execute(category_distribution()).all(),
            "by_season": self.session.execute(season_distribution()).all(),
            "by_style": self.session.execute(style_distribution()).all(),
        }

    def get_best_value_items(self, **filters):
        stmt = best_value_items(**filters)
        return self.session.execute(stmt).all()

    def get_expensive_mistakes(self,
                               min_cost: int,
                               max_usage: int,
                               limit: int,
                               ):
        stmt = expensive_mistakes(
                min_cost=min_cost,
                max_usage=max_usage,
                limit=limit,
        )
        rows = self.session.execute(stmt).all()

        # бизнес-логика: бейдж
        return [
            {
                "id": r.id,
                "item": r.item,
                "cost": r.cost,
                "usage": r.usage_count,
                "badge": "impulsive_buy" if r.usage_count <= 2 else None,
            }
            for r in rows
        ]

    def get_least_used_items(
        self,
        date_from: date | None,
        date_to: date | None,
    ):
        stmt = least_used_items(
            date_from=date_from,
            date_to=date_to,
        )

        return self.session.execute(stmt).all()
