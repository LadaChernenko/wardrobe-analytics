/* =========================================================
   ELEMENTS
========================================================= */

const tableBody = document.getElementById("itemsTable");
const gridView = document.getElementById("gridView");
const tableView = document.getElementById("tableView");
const contentCard = document.querySelector(".content-card");

const viewTableBtn = document.getElementById("viewTableBtn");
const viewGridBtn = document.getElementById("viewGridBtn");

const filterCategory = document.getElementById("filterCategory");
const groupMode = document.getElementById("groupMode");
const groupModeWrap = document.getElementById("groupModeWrap");

const modal = document.getElementById("itemModal");
const form = document.getElementById("itemForm");
const title = document.getElementById("modalTitle");
const preview = document.getElementById("preview");

const modalContent = modal.querySelector(".modal-content");
modalContent.onclick = e => e.stopPropagation();

/* =========================================================
   STATE
========================================================= */

let allItems = [];
let currentItemId = null;
let currentView = "grid";

let sortConfig = {
    key: null,      // 'cost', 'use', 'cost_per_use'
    direction: 1    // 1 = asc, -1 = desc
};

/* =========================================================
   UTILS
========================================================= */

// Экранируем всё, что вставляем в innerHTML, чтобы название/бренд/стиль
// вещи не могли исполниться как HTML (XSS). Для простых текстовых узлов
// вместо этого лучше textContent, но здесь строки собираются шаблоном.
function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getGradientColor(value, min, max) {
    if (value == null || isNaN(value)) return "";

    let t = (value - min) / (max - min || 1);
    t = Math.max(0, Math.min(1, t)); // ограничиваем [0,1]

    const colors = [
        { r: 222, g: 231, b: 145 }, // DEE791
        { r: 255, g: 249, b: 189 }, // FFF9BD
        { r: 255, g: 214, b: 186 }  // FFD6BA
    ];

    const scaledT = t * (colors.length - 1);
    const idx = Math.min(colors.length - 2, Math.floor(scaledT));
    const localT = scaledT - idx;

    const c1 = colors[idx];
    const c2 = colors[idx + 1];

    const r = Math.round(c1.r + (c2.r - c1.r) * localT);
    const g = Math.round(c1.g + (c2.g - c1.g) * localT);
    const b = Math.round(c1.b + (c2.b - c1.b) * localT);

    return `rgb(${r},${g},${b})`;
}

function segmentedImageUrl(item) {
    if (!item.image_path || !item.category) return null;
    const file = item.image_path.split("/").pop().replace(/\.[^/.]+$/, "");
    return `/segmented/${item.category}/${file}_${item.category}.png`;
}

// Различаем два случая пустоты: гардероб пуст вообще (показываем
// приглашение добавить первую вещь) и фильтр просто не дал результатов
// (показываем нейтральное сообщение без лишнего призыва к действию).
function emptyStateHtml() {
    if (allItems.length === 0) {
        return `
            <div class="muted" style="text-align:center; padding:32px 16px;">
                Пока в гардеробе нет вещей.<br>
                <button type="button" class="icon-btn primary" style="margin-top:12px" onclick="openCreate()">
                    <img src="/static/icons/add.png" alt="">
                    <span>Добавить первую вещь</span>
                </button>
            </div>
        `;
    }
    return `
        <div class="muted" style="text-align:center; padding:32px 16px;">
            Ничего не найдено по этому фильтру.
        </div>
    `;
}

/* =========================================================
   LOAD
========================================================= */

async function loadItems() {
    try {
        const res = await fetch("/items/");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allItems = await res.json();
        render();
        initSorting();
    } catch (err) {
        console.error("Не удалось загрузить вещи:", err);
        tableBody.innerHTML = `
            <tr><td colspan="10" class="error">
                Не удалось загрузить список вещей. Проверьте соединение и обновите страницу.
            </td></tr>
        `;
        gridView.innerHTML = `<p class="error">Не удалось загрузить список вещей.</p>`;
    }
}

/* =========================================================
   VIEW SWITCH
========================================================= */

viewTableBtn.onclick = () => switchView("table");
viewGridBtn.onclick = () => switchView("grid");

function switchView(view) {
    currentView = view;

    tableView.style.display = view === "table" ? "table" : "none";
    gridView.style.display = view === "grid" ? "block" : "none";

    viewTableBtn.classList.toggle("active", view === "table");
    viewGridBtn.classList.toggle("active", view === "grid");

    // Группировка применяется только к галерее — в табличном виде
    // прятать select, чтобы он не выглядел рабочим, но ничего не делающим.
    groupModeWrap.style.display = view === "grid" ? "" : "none";

    render();
}

/* =========================================================
   SORTING
========================================================= */

function initSorting() {
    document.querySelectorAll("th[data-sort]").forEach(th => {
        th.onclick = () => {
            const key = th.dataset.sort;

            if (sortConfig.key === key) {
                sortConfig.direction *= -1;
            } else {
                sortConfig.key = key;
                sortConfig.direction = 1;
            }

            render();
            updateSortUI();
        };
    });

    updateSortUI();
}

function updateSortUI() {
    document.querySelectorAll("th[data-sort]").forEach(th => {
        const isActive = th.dataset.sort === sortConfig.key;

        th.classList.toggle("sorted", isActive);
        th.classList.toggle("asc", isActive && sortConfig.direction === 1);
        th.classList.toggle("desc", isActive && sortConfig.direction === -1);
    });
}

/* =========================================================
   RENDER
========================================================= */

function render() {
    let items = [...allItems];

    if (filterCategory.value) {
        items = items.filter(i => i.category === filterCategory.value);
    }

    if (sortConfig.key) {
        items.sort((a, b) => {
            const va = Number(a[sortConfig.key] ?? 0);
            const vb = Number(b[sortConfig.key] ?? 0);
            return (va - vb) * sortConfig.direction;
        });
    }

    currentView === "table"
        ? renderTable(items)
        : renderGrid(items);
}

/* =========================================================
   TABLE
========================================================= */

function renderTable(items) {
    tableBody.innerHTML = "";

    if (items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10">${emptyStateHtml()}</td></tr>`;
        return;
    }

    const ranges = {
        cost: items.map(i => Number(i.cost)).filter(v => !isNaN(v)),
        use: items.map(i => Number(i.use)).filter(v => !isNaN(v)),
        cost_per_use: items.map(i => Number(i.cost_per_use)).filter(v => !isNaN(v))
    };

    const minMax = {};
    for (const k in ranges) {
        minMax[k] = {
            min: ranges[k].length ? Math.min(...ranges[k]) : 0,
            max: ranges[k].length ? Math.max(...ranges[k]) : 1
        };
    }

    items.forEach(i => {
        // Все текстовые поля экранированы через escapeHtml — раньше
        // название/бренд/стиль вставлялись как есть, что открывало XSS.
        tableBody.insertAdjacentHTML("beforeend", `
        <tr>
            <td>${escapeHtml(i.item)}</td>
            <td>${escapeHtml(i.brand ?? "")}</td>
            <td>${escapeHtml(i.category)}</td>
            <td>${escapeHtml(i.season)}</td>
            <td>${escapeHtml(i.year_of_buying ?? "")}</td>
            <td>${escapeHtml(i.style ?? "")}</td>
            <td style="background:${getGradientColor(Number(i.cost), minMax.cost.min, minMax.cost.max)}">
                ${escapeHtml(i.cost ?? "")}
            </td>
            <td style="background:${getGradientColor(Number(i.use), minMax.use.min, minMax.use.max)}">
                ${escapeHtml(i.use ?? "")}
            </td>
            <td style="background:${getGradientColor(Number(i.cost_per_use), minMax.cost_per_use.min, minMax.cost_per_use.max)}">
                ${i.cost_per_use != null ? Math.round(i.cost_per_use) : ""}
            </td>
            <td class="actions">
                <button class="icon-btn" data-action="edit" data-id="${i.id}" title="Редактировать">
                    <img src="/static/icons/pencil.png" alt="Редактировать">
                </button>
                <button class="icon-btn" data-action="delete" data-id="${i.id}" title="Удалить">
                    <img src="/static/icons/delete.png" alt="Удалить">
                </button>
            </td>
        </tr>
        `);
    });
}

/* =========================================================
   GRID
========================================================= */

function renderGrid(items) {
    gridView.innerHTML = "";

    if (items.length === 0) {
        gridView.innerHTML = emptyStateHtml();
        return;
    }

    if (groupMode.value === "none") {
        gridView.appendChild(createGrid(items));
        return;
    }

    const groups = {};
    items.forEach(i => {
        const key = i[groupMode.value] || "Other";
        groups[key] ??= [];
        groups[key].push(i);
    });

    Object.keys(groups).sort().forEach(key => {
        const block = document.createElement("div");
        block.className = "group";

        const titleEl = document.createElement("div");
        titleEl.className = "group-title";
        titleEl.textContent = key; // textContent — безопасно, экранирование не нужно

        block.appendChild(titleEl);
        block.appendChild(createGrid(groups[key]));
        gridView.appendChild(block);
    });
}

function createGrid(items) {
    const grid = document.createElement("div");
    grid.className = "grid items";

    items.forEach(i => {
        const card = document.createElement("div");
        card.className = "item-card";

        const imageUrl = segmentedImageUrl(i);
        if (imageUrl) {
            const wrapper = document.createElement("div");
            wrapper.className = "item-image";

            const img = document.createElement("img");
            img.src = imageUrl;
            img.alt = i.item ?? "";
            wrapper.appendChild(img);

            card.appendChild(wrapper);
        }

        const name = document.createElement("div");
        name.className = "item-name";
        name.textContent = i.item; // textContent сам экранирует — безопасно

        const actions = document.createElement("div");
        actions.className = "item-actions";
        actions.innerHTML = `
            <button class="icon-btn" data-action="edit" data-id="${i.id}" title="Редактировать">
                <img src="/static/icons/pencil.png" alt="Редактировать">
            </button>
            <button class="icon-btn" data-action="delete" data-id="${i.id}" title="Удалить">
                <img src="/static/icons/delete.png" alt="Удалить">
            </button>
        `;

        card.appendChild(name);
        card.appendChild(actions);
        grid.appendChild(card);
    });

    return grid;
}

/* =========================================================
   ACTIONS (делегирование кликов)

   Раньше id вещи и весь объект передавались через
   onclick="openEdit(${JSON.stringify(i)})" прямо в HTML-атрибуте.
   Это ломалось на апострофах/кавычках в названии вещи (Levi's и т.п.)
   и было небезопасно. Теперь кнопки несут только data-id,
   а сам объект ищется в allItems — один обработчик на весь блок.
========================================================= */

contentCard.addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const item = allItems.find(x => x.id === id);
    if (!item) return;

    if (btn.dataset.action === "edit") openEdit(item);
    if (btn.dataset.action === "delete") deleteItem(id);
});

/* =========================================================
   MODAL
========================================================= */

function openCreate() {
    currentItemId = null;
    title.textContent = "Добавить предмет";
    form.reset();

    syncColorInputs();

    preview.style.display = "none";
    modal.classList.add("open");
}

function openEdit(item) {
    currentItemId = item.id;
    title.textContent = "Редактировать предмет";
    form.reset();

    for (const k in item) {
        const input = form.querySelector(`[name="${k}"]`);
        if (input) input.value = item[k] ?? "";
    }
    syncColorInputs();

    const imageUrl = segmentedImageUrl(item);
    if (imageUrl) {
        preview.src = imageUrl;
        preview.alt = item.item ?? "";
        preview.style.display = "block";
    } else {
        preview.style.display = "none";
    }

    modal.classList.add("open");
}

function normalizeHex(color, fallback) {
    if (!color) return fallback;

    // если нет # — добавляем
    if (/^[0-9A-Fa-f]{6}$/.test(color)) {
        return "#" + color;
    }

    // если уже нормальный hex
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return color;
    }

    return fallback;
}

function syncColorInputs() {
    const colourInput = document.getElementById("colourInput");
    const colourPicker = document.getElementById("colourPicker");
    const colourPreview = document.getElementById("colourPreview");

    const extraInput = document.getElementById("extraColourInput");
    const extraPicker = document.getElementById("extraColourPicker");
    const extraPreview = document.getElementById("extraColourPreview");

    if (colourInput && colourPicker) {
        const val = normalizeHex(colourInput.value, "#000000");
        colourInput.value = val;
        colourPicker.value = val;
        if (colourPreview) colourPreview.style.backgroundColor = val;
    }

    if (extraInput && extraPicker) {
        const val = normalizeHex(extraInput.value, "#ffffff");
        extraInput.value = val;
        extraPicker.value = val;
        if (extraPreview) extraPreview.style.backgroundColor = val;
    }
}

function closeModal() {
    modal.classList.remove("open");
    form.reset();
    preview.style.display = "none";
}

function bindColor(pickerId, inputId, previewId) {
    const picker = document.getElementById(pickerId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    if (!picker || !input) return;

    function update(color) {
        input.value = color;
        picker.value = color;

        if (preview) {
            preview.style.backgroundColor = color;
        }
    }

    picker.addEventListener("input", () => update(picker.value));

    input.addEventListener("input", () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
            update(input.value);
        }
    });
}

// Раньше id="extraColourPicker" в разметке отсутствовал (было
// дублирующееся id="colourPicker" у обоих color-инпутов), и этот
// bindColor тихо ничего не делал. В items.html id уже исправлен.
bindColor("colourPicker", "colourInput", "colourPreview");
bindColor("extraColourPicker", "extraColourInput", "extraColourPreview");

/* =========================================================
   CRUD
========================================================= */

async function deleteItem(id) {
    if (!confirm("Удалить предмет?")) return;

    try {
        const res = await fetch(`/items/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        loadItems();
    } catch (err) {
        console.error("Не удалось удалить предмет:", err);
        alert("Не удалось удалить предмет. Попробуйте ещё раз.");
    }
}

form.onsubmit = async e => {
    e.preventDefault();

    const method = currentItemId ? "PATCH" : "POST";
    const url = currentItemId ? `/items/${currentItemId}` : "/items/";
    const fd = new FormData(form);

    const imageInput = form.querySelector('input[name="image"]');
    if (!imageInput.files.length) fd.delete("image");

    try {
        const res = await fetch(url, { method, body: fd });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        closeModal();
        loadItems();
    } catch (err) {
        console.error("Не удалось сохранить предмет:", err);
        alert("Ошибка сохранения. Проверьте поля и попробуйте снова.");
    }
};

/* =========================================================
   EVENTS
========================================================= */

filterCategory.onchange = render;
groupMode.onchange = render;
modal.onclick = e => e.target === modal && closeModal();

function exportItemsCSV() {
    window.location.href = "/items/export/csv";
}

/* =========================================================
   INIT
========================================================= */

loadItems();
