/* =========================================================
   ELEMENTS
========================================================= */

const tableBody = document.getElementById("itemsTable");
const gridView = document.getElementById("gridView");
const tableView = document.getElementById("tableView");

const viewTableBtn = document.getElementById("viewTableBtn");
const viewGridBtn = document.getElementById("viewGridBtn");

const filterCategory = document.getElementById("filterCategory");
const groupMode = document.getElementById("groupMode");

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
let currentView = "table";

let sortConfig = {
    key: null,      // 'cost', 'use', 'cost_per_use'
    direction: 1    // 1 = asc, -1 = desc
};

/* =========================================================
   LOAD
========================================================= */

async function loadItems() {
    const res = await fetch("/items/");
    allItems = await res.json();
    render();
    initSorting();
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
        tableBody.insertAdjacentHTML("beforeend", `
        <tr>
            <td>${i.item}</td>
            <td>${i.brand ?? ""}</td>
            <td>${i.category}</td>
            <td>${i.season}</td>
            <td>${i.year_of_buying ?? ""}</td>
            <td>${i.style ?? ""}</td>
            <td style="background:${getGradientColor(Number(i.cost), minMax.cost.min, minMax.cost.max)}">
                ${i.cost ?? ""}
            </td>
            <td style="background:${getGradientColor(Number(i.use), minMax.use.min, minMax.use.max)}">
                ${i.use ?? ""}
            </td>
            <td style="background:${getGradientColor(Number(i.cost_per_use), minMax.cost_per_use.min, minMax.cost_per_use.max)}">
                ${i.cost_per_use != null ? Math.round(i.cost_per_use) : ""}
            </td>
            <td class="actions">
                <button class="icon-btn" onclick='openEdit(${JSON.stringify(i)})'>
                    <img src="/static/icons/pencil.png">
                </button>
                <button class="icon-btn" onclick='deleteItem(${i.id})'>
                    <img src="/static/icons/delete.png">
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
        block.innerHTML = `<div class="group-title">${key}</div>`;
        block.appendChild(createGrid(groups[key]));
        gridView.appendChild(block);
    });
}

function createGrid(items) {
    const grid = document.createElement("div");
    grid.className = "grid";

    items.forEach(i => {
        const card = document.createElement("div");
        card.className = "item-card";

        if (i.image_path && i.category) {
            const file = i.image_path.split("/").pop().replace(/\.[^/.]+$/, "");
            card.insertAdjacentHTML("beforeend", `
                <div class="item-image">
                    <img src="/segmented/${i.category}/${file}_${i.category}.png">
                </div>
            `);
        }

        card.insertAdjacentHTML("beforeend", `
            <div class="item-name">${i.item}</div>
            <div class="item-actions">
                <button class="icon-btn" onclick='openEdit(${JSON.stringify(i)})'>
                    <img src="/static/icons/pencil.png">
                </button>
                <button class="icon-btn" onclick='deleteItem(${i.id})'>
                    <img src="/static/icons/delete.png">
                </button>
            </div>
        `);

        grid.appendChild(card);
    });

    return grid;
}

/* =========================================================
   MODAL
========================================================= */

function openCreate() {
    currentItemId = null;
    title.textContent = "Добавить предмет";
    form.reset();
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

    if (item.image_path && item.category) {
        const file = item.image_path.split("/").pop().replace(/\.[^/.]+$/, "");
        preview.src = `/segmented/${item.category}/${file}_${item.category}.png`;
        preview.style.display = "block";
    }

    modal.classList.add("open");
}

function closeModal() {
    modal.classList.remove("open");
    form.reset();
    preview.style.display = "none";
}

/* =========================================================
   CRUD
========================================================= */

async function deleteItem(id) {
    if (!confirm("Удалить предмет?")) return;
    await fetch(`/items/${id}`, { method: "DELETE" });
    loadItems();
}

form.onsubmit = async e => {
    e.preventDefault();

    const method = currentItemId ? "PATCH" : "POST";
    const url = currentItemId ? `/items/${currentItemId}` : "/items/";
    const fd = new FormData(form);

    const imageInput = form.querySelector('input[name="image"]');
    if (!imageInput.files.length) fd.delete("image");

    const res = await fetch(url, { method, body: fd });
    if (res.ok) {
        closeModal();
        loadItems();
    } else {
        alert("Ошибка сохранения");
    }
};

/* =========================================================
   UTILS
========================================================= */

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


/* =========================================================
   EVENTS
========================================================= */

filterCategory.onchange = render;
groupMode.onchange = render;
modal.onclick = e => e.target === modal && closeModal();

/* =========================================================
   INIT
========================================================= */

loadItems();
