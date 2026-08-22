/* =========================================================
   STATE
========================================================= */

let balanceData = null;
let balanceChart = null;

/* =========================================================
   UTILS
========================================================= */

// Разделитель разрядов для крупных чисел — без него "293703 ₽"
// считывается заметно медленнее, чем "293 703 ₽".
function formatNumber(value) {
    return Math.round(value).toLocaleString("ru-RU");
}

function rub(value) {
    return value !== null && value !== undefined ? `${formatNumber(value)} ₽` : "—";
}

// Общий помощник для списков "вещь — что-то". Строит <li> через
// textContent, поэтому названия вещей не могут быть интерпретированы
// как HTML (раньше все такие списки собирались через innerHTML +
// шаблонные строки без экранирования).
function renderList(ulId, items, emptyText, formatItem) {
    const ul = document.getElementById(ulId);
    ul.innerHTML = "";

    if (!items.length) {
        const li = document.createElement("li");
        li.textContent = emptyText;
        ul.appendChild(li);
        return;
    }

    items.forEach(item => {
        ul.appendChild(formatItem(item));
    });
}

function buildDateRangeParams(period, monthValue) {
    if (!monthValue) return "";

    const [year, month] = monthValue.split("-");

    if (period === "month") {
        const from = `${year}-${month}-01`;
        const to = new Date(year, month, 0).toISOString().slice(0, 10);
        return `?date_from=${from}&date_to=${to}`;
    }

    if (period === "year") {
        return `?date_from=${year}-01-01&date_to=${year}-12-31`;
    }

    return "";
}

/* =========================================================
   TOP / LEAST USED
========================================================= */

function togglePeriodInputs() {
    const period = document.getElementById("topPeriod").value;

    document.getElementById("datePicker").style.display =
        period === "month" || period === "year" ? "block" : "none";

    if (period === "all") {
        loadTopItems();
    }
}

function toggleLeastPeriodInputs() {
    const period = document.getElementById("leastPeriod").value;

    document.getElementById("leastDatePicker").style.display =
        period === "month" || period === "year" ? "block" : "none";

    if (period === "all") {
        loadLeastUsedItems();
    }
}

async function loadTopItems() {
    const period = document.getElementById("topPeriod").value;
    const value = document.getElementById("topDate").value;
    const url = "/analytics/top-items" + buildDateRangeParams(period, value);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const topItems = await res.json();

        renderList("top-items", topItems, "Нет данных за выбранный период", i => {
            const li = document.createElement("li");
            li.textContent = `${i.item} — ${i.usage_count} выходов`;
            return li;
        });
    } catch (err) {
        console.error("Не удалось загрузить топ вещей:", err);
        renderList("top-items", [], "Не удалось загрузить данные", () => {});
    }
}

async function loadLeastUsedItems() {
    const period = document.getElementById("leastPeriod").value;
    const value = document.getElementById("leastDate").value;
    const url = "/analytics/least-used-items" + buildDateRangeParams(period, value);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = await res.json();

        renderList("least-items", items, "Нет данных за выбранный период", i => {
            const li = document.createElement("li");
            li.textContent = `${i.item} — ${i.usage_count} выходов`;
            if (i.usage_count === 0) li.classList.add("zero-usage");
            return li;
        });
    } catch (err) {
        console.error("Не удалось загрузить редко используемые вещи:", err);
        renderList("least-items", [], "Не удалось загрузить данные", () => {});
    }
}

/* =========================================================
   BASE ANALYTICS (общие цифры + баланс + лучшие по цене)
========================================================= */

async function loadBaseAnalytics() {
    try {
        const cost = await fetch("/analytics/cost-stats").then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        });

        document.getElementById("avg-cpu").textContent = rub(cost.avg_cpu);
        document.getElementById("median-cpu").textContent = rub(cost.median_cpu);
        document.getElementById("total-cost").textContent = rub(cost.total_cost);
        document.getElementById("items-count").textContent =
            cost.items_count !== null ? formatNumber(cost.items_count) : "—";
        document.getElementById("total-cpu").textContent = rub(cost.total_cost_per_use);
    } catch (err) {
        console.error("Не удалось загрузить общую статистику:", err);
    }

    try {
        balanceData = await fetch("/analytics/distribution").then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        });
        renderBalanceChart("by_category");
    } catch (err) {
        console.error("Не удалось загрузить баланс гардероба:", err);
    }

    try {
        const best = await fetch("/analytics/best-value").then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        });

        renderList("best-value", best, "Нет данных", i => {
            const li = document.createElement("li");
            li.textContent = `${i.item} — ${rub(i.cost_per_use)}`;
            return li;
        });
    } catch (err) {
        console.error("Не удалось загрузить самые выгодные вещи:", err);
        renderList("best-value", [], "Не удалось загрузить данные", () => {});
    }
}

/* =========================================================
   MISTAKES
========================================================= */

async function loadMistakes() {
    const minCost = document.getElementById("min-cost").value;
    const maxUsage = document.getElementById("max-usage").value;

    const url = `/analytics/expensive-mistakes?min_cost=${minCost}&max_usage=${maxUsage}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const mistakes = await res.json();

        renderList("mistakes", mistakes, "Дорогих ошибок не найдено", i => {
            const li = document.createElement("li");
            li.textContent = `${i.item} — ${formatNumber(i.cost)} ₽ (${i.usage} выходов) `;

            if (i.badge) {
                const badge = document.createElement("span");
                badge.className = "badge";
                badge.textContent = "импульсивная?";
                li.appendChild(badge);
            }

            return li;
        });
    } catch (err) {
        console.error("Не удалось загрузить дорогие ошибки:", err);
        renderList("mistakes", [], "Не удалось загрузить данные", () => {});
    }
}

/* =========================================================
   BALANCE CHART
========================================================= */

function renderBalanceChart(type) {
    if (!balanceData) return;

    const data = balanceData[type];
    const sorted = [...data].sort((a, b) => b.items_count - a.items_count);

    const labels = sorted.map(d => d.key);
    const values = sorted.map(d => d.items_count);
    const costs = sorted.map(d => d.total_cost);

    const colors = [
        "#7c3aed",
        "#60a5fa",
        "#34d399",
        "#fbbf24",
        "#f87171",
        "#a78bfa",
        "#fb7185"
    ];

    const ctx = document.getElementById("balanceChart");
    const labelMap = {
        by_category: "Категория",
        by_season: "Сезон",
        by_style: "Стиль"
    };

    if (balanceChart) {
        balanceChart.destroy();
    }

    balanceChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                meta: costs,
                aggType: type
            }]
        },
        options: {
            plugins: {
                // Встроенную легенду отключаем — вместо неё ниже рисуем
                // свою (см. renderBalanceLegend), где числа видны сразу,
                // без наведения — на тач-экране это удобнее.
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const i = context.dataIndex;
                            const count = context.dataset.data[i];
                            const cost = context.dataset.meta[i];

                            return [
                                `Вещей: ${count}`,
                                `Общая стоимость: ${Math.round(cost)} ₽`
                            ];
                        }
                    }
                }
            }
        }
    });

    renderBalanceLegend(labels, values, costs, colors, labelMap[type]);
}

// Текстовая легенда под диаграммой: цветной квадрат + название + число
// вещей и стоимость. Всегда видна целиком — не требует наведения,
// в отличие от tooltip самой диаграммы.
function renderBalanceLegend(labels, values, costs, colors, groupLabel) {
    const legend = document.getElementById("balanceLegend");
    legend.innerHTML = "";

    labels.forEach((label, i) => {
        const row = document.createElement("div");
        row.className = "balance-legend-row";

        const swatch = document.createElement("span");
        swatch.className = "balance-legend-swatch";
        swatch.style.backgroundColor = colors[i % colors.length];

        const name = document.createElement("span");
        name.className = "balance-legend-label";
        name.textContent = label;

        const value = document.createElement("span");
        value.className = "balance-legend-value";
        value.textContent = `${values[i]} вещей · ${formatNumber(costs[i])} ₽`;

        row.appendChild(swatch);
        row.appendChild(name);
        row.appendChild(value);
        legend.appendChild(row);
    });
}

function updateBalanceChart() {
    const type = document.getElementById("balanceType").value;
    renderBalanceChart(type);
}

/* =========================================================
   INIT

   Раньше значения по умолчанию для полей с месяцем
   (#topDate / #leastDate) выставлялись в обработчике
   DOMContentLoaded — уже ПОСЛЕ того, как loadTopItems()/
   loadLeastUsedItems() успевали вызваться со скрипта ниже
   по странице. Здесь всё выполняется по порядку в одной
   функции, так что первый запрос сразу уходит с корректной
   датой по умолчанию.
========================================================= */

function setDefaultDates() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    document.getElementById("topDate").value = currentMonth;
    document.getElementById("leastDate").value = currentMonth;
}

(function init() {
    setDefaultDates();
    loadTopItems();
    loadLeastUsedItems();
    loadBaseAnalytics();
    loadMistakes();
})();
