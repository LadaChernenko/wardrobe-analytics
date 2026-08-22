/* =========================================================
   ELEMENTS
========================================================= */

const eventsList = document.getElementById("eventsList");

// item_id -> full item
const itemsById = {};
const allItems = [];

function exportLogsCSV() {
    window.location.href = "/wear_log/export/csv";
}

/* ===== LOAD ITEMS ===== */

async function loadItems() {
    const res = await fetch("/items/");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();

    items.forEach(item => {
        itemsById[item.id] = item;
        allItems.push(item);
    });
}

/* ===== LOAD EVENTS ===== */

async function loadEvents() {
    const res = await fetch("/wear_log/");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const logs = await res.json();

    const eventsMap = {};

    logs.forEach(log => {
        if (!eventsMap[log.event_id]) {
            eventsMap[log.event_id] = {
                date: log.date,
                logs: []
            };
        }
        eventsMap[log.event_id].logs.push(log);

        if (log.date > eventsMap[log.event_id].date) {
            eventsMap[log.event_id].date = log.date;
        }
    });

    const events = Object.entries(eventsMap)
        .map(([eventId, data]) => ({
            eventId: Number(eventId),
            date: data.date,
            logs: data.logs
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    renderEvents(events);
}

/* ===== RENDER ===== */

function renderEvents(events) {
    eventsList.innerHTML = "";

    if (!events.length) {
        eventsList.innerHTML = `<p class="muted">Пока нет ни одного выхода.</p>`;
        return;
    }

    events.forEach(event => {
        eventsList.appendChild(renderEventCard(event));
    });
}

function renderEventCard(event) {
    const eventDiv = document.createElement("div");
    eventDiv.className = "event";

    const formattedDate = event.date
        ? new Date(event.date).toLocaleDateString("ru-RU")
        : "—";
    const totalCost = event.logs.reduce(
        (sum, log) => sum + (log.current_cost_per_use ?? 0),
        0
    );

    /* ===== HEADER =====
       eventId — число, formattedDate/totalCost выведены через
       toLocaleDateString/toFixed, так что здесь innerHTML безопасен:
       никакого текста от пользователя тут нет. */
    eventDiv.innerHTML = `
        <div class="event-header">
            <div>
                <b>Event ${event.eventId}
                    <span class="muted">(${formattedDate})</span>
                </b>
                <div class="muted">
                    Стоимость выхода: <b>${totalCost.toFixed(2)} ₽</b>
                </div>
            </div>

            <div class="event-actions">
                <button type="button" class="add-btn">
                    <img src="/static/icons/pencil.png" alt="">
                    items
                </button>

                <button type="button" class="del-btn">
                    <img src="/static/icons/bin.png" alt="">
                    event
                </button>
            </div>
        </div>
    `;

    eventDiv.querySelector(".del-btn").onclick =
        () => deleteEvent(event.eventId);

    const grid = document.createElement("div");
    grid.className = "event-grid";

    const left = document.createElement("div");
    const logsDiv = document.createElement("div");
    logsDiv.className = "event-logs";

    const existingItemIds = new Set();

    event.logs.forEach(log => {
        existingItemIds.add(log.item_id);
        logsDiv.appendChild(renderLogCard(log));
    });

    left.appendChild(logsDiv);
    left.appendChild(renderAddPanel(event, existingItemIds));

    eventDiv.querySelector(".add-btn").onclick = () => {
        const addPanel = left.querySelector(".add-items");
        addPanel.style.display =
            addPanel.style.display === "none" ? "block" : "none";
    };

    grid.appendChild(left);
    eventDiv.appendChild(grid);

    return eventDiv;
}

function renderLogCard(log) {
    const item = itemsById[log.item_id];

    const row = document.createElement("div");
    row.className = "log-card";

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "log-image";

    const file = item?.image_path
        ? item.image_path.split("/").pop().replace(/\.[^/.]+$/, "")
        : null;

    if (file) {
        const img = document.createElement("img");
        img.src = `/segmented/${item.category}/${file}_${item.category}.png`;
        img.alt = item?.item ?? "";
        imageWrapper.appendChild(img);
    }

    const nameDiv = document.createElement("div");
    nameDiv.className = "log-name";
    // textContent вместо innerHTML — название вещи раньше вставлялось
    // напрямую в шаблонную строку без экранирования (риск XSS).
    nameDiv.textContent = item?.item || `item #${log.item_id}`;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "round-del-btn";
    delBtn.innerHTML = `<img src="/static/icons/bin.png" alt="Удалить">`;
    delBtn.onclick = () => deleteLog(log.id);

    row.appendChild(imageWrapper);
    row.appendChild(nameDiv);
    row.appendChild(delBtn);

    return row;
}

function renderAddPanel(event, existingItemIds) {
    const addPanel = document.createElement("div");
    addPanel.className = "add-items";

    const list = document.createElement("div");
    list.className = "items-list";

    allItems.forEach(item => {
        if (existingItemIds.has(item.id)) return;

        const label = document.createElement("label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = item.id;

        // Раньше label.innerHTML вставлял item.item без экранирования —
        // здесь используем текстовый узел, это безопасно по умолчанию.
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + item.item));

        list.appendChild(label);
    });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Добавить выбранные";

    btn.onclick = async () => {
        const ids = [...list.querySelectorAll("input:checked")]
            .map(cb => Number(cb.value));

        if (!ids.length) return;

        try {
            const res = await fetch(`/wear_log/${event.eventId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ids)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await loadEvents();
        } catch (err) {
            console.error("Не удалось добавить вещи в выход:", err);
            alert("Не удалось добавить вещи. Попробуйте ещё раз.");
        }
    };

    addPanel.appendChild(list);
    addPanel.appendChild(btn);

    return addPanel;
}

/* ===== DELETE ===== */

async function deleteEvent(eventId) {
    if (!confirm(`Удалить event ${eventId}?`)) return;

    try {
        const res = await fetch(`/wear_log/event/${eventId}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        loadEvents();
    } catch (err) {
        console.error("Не удалось удалить событие:", err);
        alert("Не удалось удалить событие. Попробуйте ещё раз.");
    }
}

async function deleteLog(id) {
    if (!confirm("Удалить запись?")) return;

    try {
        const res = await fetch(`/wear_log/log/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        loadEvents();
    } catch (err) {
        console.error("Не удалось удалить запись:", err);
        alert("Не удалось удалить запись. Попробуйте ещё раз.");
    }
}

/* ===== INIT ===== */

(async () => {
    try {
        await loadItems();
        await loadEvents();
    } catch (err) {
        console.error("Не удалось загрузить историю выходов:", err);
        eventsList.innerHTML = `<p class="error">Не удалось загрузить данные. Обновите страницу.</p>`;
    }
})();
