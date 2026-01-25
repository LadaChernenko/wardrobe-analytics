from sqlalchemy import select, func, desc, and_
from datetime import date
from models.item import Item
from models.wear_log import WearLog
from models.enums import SeasonEnum, CategoryEnum

def top_items(
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 10,
):
    '''
    топ носимых вещей за выбраннй период
    
    :param date_from: C какой даты
    :param date_to: По какую дату
    :param limit: top-N
    '''

    stmt = (
        select(
            Item.id,
            Item.item,
            func.count(func.distinct(WearLog.event_id)).label("usage_count"),
        )
        .join(WearLog, WearLog.item_id == Item.id)
    )

    if date_from and date_to:
        stmt = stmt.where(WearLog.date.between(date_from, date_to))

    stmt = (
        stmt
        .group_by(Item.id)
        .order_by(desc("usage_count"))
        .limit(limit)
    )

    return stmt

def cost_per_use_stats():
    '''
    Средняя и медианная себестоимость вещи
    + агрегаты по гардеробу
    '''
    stmt = select(
        # базовые метрики
        func.avg(Item.cost_per_use).label("avg_cpu"),
        func.percentile_cont(0.5)
            .within_group(Item.cost_per_use)
            .label("median_cpu"),

        # новые агрегаты
        func.sum(Item.cost).label("total_cost"),
        func.count(Item.id).label("items_count"),
        func.sum(Item.cost_per_use).label("total_cost_per_use"),
    )

    return stmt

def cost_per_use_dynamic():
    '''
    Средняя и медианная себестоимость вещи
    но пересчитанная динамически из WearLog
    '''
    usage_subq = (
        select(
            WearLog.item_id,
            func.count(func.distinct(WearLog.event_id)).label("usage_count"),
        )
        .group_by(WearLog.item_id)
        .subquery()
    )

    cpu_expr = Item.cost / func.nullif(usage_subq.c.usage_count, 0)

    stmt = select(
        func.avg(cpu_expr).label("avg_cpu"),
        func.percentile_cont(0.5)
            .within_group(cpu_expr)
            .label("median_cpu"),
    ).join(usage_subq, usage_subq.c.item_id == Item.id)

    return stmt

def usage_per_item_stats():
    '''
    Среднее / медианное количество выходов на вещь
    '''
    usage_subq = (
        select(
            WearLog.item_id,
            func.count(func.distinct(WearLog.event_id)).label("usage_count"),
        )
        .group_by(WearLog.item_id)
        .subquery()
    )

    stmt = select(
        func.avg(usage_subq.c.usage_count).label("avg_usage"),
        func.percentile_cont(0.5)
            .within_group(usage_subq.c.usage_count)
            .label("median_usage"),
    )

    return stmt

def forgotten_items(
    season: SeasonEnum,
    month: int,
    limit: int = 10,
):
    '''
    Самые «забытые» вещи
    (минимальный usage за период + учёт сезона)
    
    :param season: группировка вещей по сезону
    :param month: за какой месяц смотрим
    :param limit: сколько вещей
    '''
    stmt = (
        select(
            Item.id,
            Item.item,
            func.count(func.distinct(WearLog.event_id)).label("usage_count"),
        )
        .outerjoin(WearLog, WearLog.item_id == Item.id)
        .where(
            Item.season == season,
            func.extract("month", WearLog.date) == month,
        )
        .group_by(Item.id)
        .order_by("usage_count")
        .limit(limit)
    )

    return stmt

def category_distribution():
    '''
    Сбалансированность гардероба по категориям
    '''
    stmt = (
        select(
            Item.category,
            func.count(Item.id).label("items_count"),
        )
        .group_by(Item.category)
    )
    return stmt

def season_distribution():
    '''
    Сбалансированность гардероба по сезонам
    '''
    stmt = (
        select(
            Item.season,
            func.count(Item.id).label("items_count"),
        )
        .group_by(Item.season)
    )
    return stmt

def best_value_items(
    season: SeasonEnum | None = None,
    category: CategoryEnum | None = None,
    limit: int = 10,
):
    '''
    Самые выгодные вещи. С минимальным cost/use
    
    :param season: группировка по сезону
    :param category: группировка по категории
    :param limit: top-N
    '''
    stmt = select(
        Item.id,
        Item.item,
        Item.cost_per_use,
    )

    if season:
        stmt = stmt.where(Item.season == season)
    if category:
        stmt = stmt.where(Item.category == category)

    stmt = stmt.order_by(Item.cost_per_use.asc()).limit(limit)
    return stmt

def expensive_mistakes(
    min_cost: int = 10000,
    max_usage: int = 3,
    limit: int = 10,
):
    """
    Самые дорогие вещи с минимальным количеством выходов
    (считается напрямую по таблице Item)

    :param min_cost: минимальная стоимость считающаяся как "дорого"
    :param max_usage: количесво выходов считающееся как "мало"
    :param limit: top-N
    """

    stmt = (
        select(
            Item.id,
            Item.item,
            Item.cost,
            Item.use.label("usage_count"),
        )
        .where(
            Item.cost >= min_cost,
            Item.use <= max_usage,
        )
        .order_by(desc(Item.cost))
        .limit(limit)
    )

    return stmt

