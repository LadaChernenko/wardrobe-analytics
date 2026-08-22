/* =========================================================
   ELEMENTS
========================================================= */

const gridRoot = document.getElementById("itemsGrid");
const categoriesDiv = document.getElementById("categories");
const eventItemsDiv = document.getElementById("eventItems");
const collageDiv = document.getElementById("collage");
const statusEl = document.getElementById("status");
const savedEventDiv = document.getElementById("savedEvent");
const searchInput = document.getElementById("itemSearch");
const eventDateInput = document.getElementById("eventDate");
const eventLabel = document.getElementById("eventLabel");

let itemsByCategory = {};
let itemsById = {};
let selectedItemIds = new Set();
let currentCategory = null;
let groupingMode = "none";

// event_id — техническая связка для группировки записей на бэкенде,
// пользователю не показывается вообще (см. eventLabel ниже, который
// строится из выбранной даты, а не из этого числа).
let currentEventId = Math.floor(Date.now() / 1000);

/* =========================================================
   DATE / LABEL

   Раньше заголовок показывал currentEventId (момент создания
   черновика на клиенте) — бессмысленное число, никак не связанное
   с датой самого выхода. Теперь заголовок строится из поля "Дата",
   которое пользователь и так обязан заполнить: если запись вносится
   задним числом (например, за вчерашнюю тренировку), достаточно
   просто поменять дату — подпись обновится сама.
========================================================= */

function todayIso() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function updateEventLabel() {
    const value = eventDateInput.value;

    if (!value) {
        eventLabel.textContent = "Выберите дату выхода";
        return;
    }

    const formatted = new Date(value).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    eventLabel.textContent = `Выход за ${formatted}`;
}

eventDateInput.value = todayIso();
eventDateInput.addEventListener("input", updateEventLabel);
updateEventLabel();

/* ===== GROUPING BUTTONS ===== */

document.querySelectorAll(".grouping button").forEach(btn => {
    btn.onclick = () => {
        groupingMode = btn.dataset.mode;
        document.querySelectorAll(".grouping button")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderItems();
    };
});

/* ===== SEARCH =====

   Фильтрация полностью на клиенте: /items/ и так отдаёт весь список
   вещей одним запросом при загрузке страницы, бэкенд трогать не
   нужно. Раньше вкладки категорий на время поиска скрывались целиком —
   это оказалось неожиданным и выглядело как баг. Теперь вкладки всегда
   видны; во время поиска просто ни одна не подсвечена как активная
   (ищем по всему гардеробу), а клик по вкладке очищает поиск и
   возвращает к обычному просмотру по категории. */

searchInput.addEventListener("input", renderCategories);

function getVisibleItems() {
    const query = searchInput.value.trim().toLowerCase();

    if (query) {
        return Object.values(itemsById).filter(item =>
            (item.item || "").toLowerCase().includes(query) ||
            (item.brand || "").toLowerCase().includes(query)
        );
    }

    return itemsByCategory[currentCategory] || [];
}

/* ===== NAV ===== */

/* goToLogsBtn — теперь обычная ссылка <a class="back-btn"> в разметке,
   отдельный обработчик клика больше не нужен. */

/* ===== LOAD ITEMS ===== */

async function loadItems() {
    try {
        const res = await fetch("/items/");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = await res.json();

        if (!Array.isArray(items)) {
            throw new Error(
                `Ожидался массив вещей, получено: ${typeof items}. ` +
                `Проверьте формат ответа /items/.`
            );
        }

        // Диагностика: если вещи не отображаются, первым делом стоит
        // посмотреть в консоль браузера (F12 → Console) на эту строку —
        // она покажет, сколько вещей реально пришло с бэкенда.
        console.log("[wear_event] /items/ вернул вещей:", items.length);

        if (items.length === 0) {
            categoriesDiv.innerHTML = "";
            gridRoot.innerHTML = `
                <p class="muted">
                    В гардеробе пока нет вещей. Сначала добавьте их на странице «Гардероб».
                </p>
            `;
            return;
        }

        itemsByCategory = {};
        itemsById = {};

        items.forEach(item => {
            itemsById[item.id] = item;
            const cat = item.category || "Other";
            if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
            itemsByCategory[cat].push(item);
        });

        console.log("[wear_event] категории:", Object.keys(itemsByCategory));

        renderCategories();
    } catch (err) {
        console.error("Не удалось загрузить вещи:", err);
        categoriesDiv.textContent = "";
        gridRoot.innerHTML = `<p class="error">Не удалось загрузить гардероб. Обновите страницу.</p>`;
    }
}

/* ===== CATEGORIES =====

   Порядок вкладок — по суммарному числу использований вещей в
   категории (поле item.use, оно уже приходит в ответе /items/),
   по убыванию. Раньше порядок был случайным — таким, в каком вещи
   попали в базу (Object.keys сохраняет порядок вставки). */

function categoryUsageTotal(cat) {
    return itemsByCategory[cat].reduce(
        (sum, item) => sum + (Number(item.use) || 0),
        0
    );
}

function renderCategories() {
    categoriesDiv.innerHTML = "";

    const isSearching = searchInput.value.trim().length > 0;

    const orderedCategories = Object.keys(itemsByCategory)
        .sort((a, b) => categoryUsageTotal(b) - categoryUsageTotal(a));

    orderedCategories.forEach((cat, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = cat;

        if (!currentCategory && idx === 0) currentCategory = cat;
        if (!isSearching && cat === currentCategory) btn.classList.add("active");

        btn.onclick = () => {
            currentCategory = cat;
            searchInput.value = "";
            renderCategories();
        };

        categoriesDiv.appendChild(btn);
    });

    renderItems();
}

/* ===== ITEMS ===== */

function renderItems() {
    gridRoot.innerHTML = "";
    const items = getVisibleItems();

    if (items.length === 0) {
        gridRoot.innerHTML = `<p class="muted">Ничего не найдено.</p>`;
        renderEventItems();
        renderCollage();
        return;
    }

    if (groupingMode === "none") {
        const grid = createGrid(items);
        gridRoot.appendChild(grid);
    } else {
        const groups = {};

        items.forEach(item => {
            const key = item[groupingMode] || "Other";
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        Object.keys(groups).sort().forEach(groupName => {
            const section = document.createElement("div");
            section.className = "group";

            const title = document.createElement("div");
            title.className = "group-title";
            title.textContent = groupName;

            section.appendChild(title);
            section.appendChild(createGrid(groups[groupName]));
            gridRoot.appendChild(section);
        });
    }

    renderEventItems();
    renderCollage();
}

function createGrid(items) {
    const grid = document.createElement("div");
    grid.className = "grid items";

    items.forEach(item => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "item";
        card.setAttribute("aria-pressed", selectedItemIds.has(item.id) ? "true" : "false");

        if (selectedItemIds.has(item.id)) {
            card.classList.add("selected");
        }

        if (item.image_path && item.category) {
            const imageWrapper = document.createElement("div");
            imageWrapper.className = "item-image";

            const img = document.createElement("img");
            const file = item.image_path
                .split("/")
                .pop()
                .replace(/\.[^/.]+$/, "");

            img.src = `/segmented/${item.category}/${file}_${item.category}.png`;
            img.alt = item.item ?? "";

            imageWrapper.appendChild(img);
            card.appendChild(imageWrapper);
        }

        const name = document.createElement("div");
        name.className = "item-name";
        name.textContent = item.item;

        card.appendChild(name);

        card.onclick = () => toggleItem(item.id);

        grid.appendChild(card);
    });

    return grid;
}

/* ===== EVENT SIDE ===== */

function toggleItem(id) {
    selectedItemIds.has(id)
        ? selectedItemIds.delete(id)
        : selectedItemIds.add(id);

    renderItems();
}

function renderEventItems() {
    eventItemsDiv.innerHTML = "";

    selectedItemIds.forEach(id => {
        const row = document.createElement("div");
        row.className = "event-item";

        const nameSpan = document.createElement("span");
        nameSpan.textContent = itemsById[id].item;

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "delete-btn";
        delBtn.innerHTML = `<img src="/static/icons/delete.png" alt="Удалить">`;
        delBtn.onclick = () => {
            selectedItemIds.delete(id);
            renderItems();
        };

        row.appendChild(nameSpan);
        row.appendChild(delBtn);
        eventItemsDiv.appendChild(row);
    });
}

function createNewEvent() {
    currentEventId = Math.floor(Date.now() / 1000);

    selectedItemIds.clear();
    eventDateInput.value = todayIso();
    updateEventLabel();

    document.getElementById("notes").value = "";

    savedEventDiv.textContent = "Пока нет данных";

    statusEl.textContent = "";
    statusEl.className = "";

    renderItems();
}

/* ===== COLLAGE ===== */

function renderCollage() {
    collageDiv.innerHTML = "";

    selectedItemIds.forEach(id => {
        const item = itemsById[id];
        if (!item.image_path) return;

        const img = document.createElement("img");
        const file = item.image_path.split("/").pop().replace(/\.[^/.]+$/, "");
        img.src = `/segmented/${item.category}/${file}_${item.category}.png`;
        img.alt = item.item ?? "";
        collageDiv.appendChild(img);
    });
}

/* ===== SAVE ===== */

document.getElementById("saveBtn").onclick = async () => {
    const date = eventDateInput.value;
    const notes = document.getElementById("notes").value || null;

    if (!date || selectedItemIds.size === 0) {
        statusEl.textContent = "Выберите дату и items";
        statusEl.className = "error";
        return;
    }

    const savedItems = [];

    try {
        for (const itemId of selectedItemIds) {
            const res = await fetch("/wear_log/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    item_id: itemId,
                    event_id: currentEventId,
                    date,
                    notes
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            savedItems.push(itemsById[itemId].item);
        }

        const formatted = new Date(date).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        savedEventDiv.innerHTML = "";
        const heading = document.createElement("b");
        heading.textContent = `Выход за ${formatted}`;
        savedEventDiv.appendChild(heading);

        savedItems.forEach(name => {
            const row = document.createElement("div");
            row.textContent = `• ${name}`;
            savedEventDiv.appendChild(row);
        });

        statusEl.textContent = "✔ Выход сохранён";
        statusEl.className = "success";
        document.getElementById("newEventBtn").style.display = "inline-flex";
    } catch (err) {
        console.error("Не удалось сохранить выход:", err);
        statusEl.textContent = "Не удалось сохранить выход. Попробуйте ещё раз.";
        statusEl.className = "error";
    }
};

document.getElementById("newEventBtn").onclick = () => {
    createNewEvent();
    document.getElementById("newEventBtn").style.display = "none";
};

/* ===== INIT ===== */

loadItems();
