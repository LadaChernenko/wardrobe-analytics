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

let allItems = [];
let currentItemId = null;
let currentView = "table";

/* ===== LOAD ===== */

async function loadItems() {
    const res = await fetch("/items/");
    allItems = await res.json();
    render();
}

/* ===== VIEW SWITCH ===== */

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

/* ===== RENDER ===== */

function render() {
    let items = [...allItems];

    if (filterCategory.value) {
        items = items.filter(i => i.category === filterCategory.value);
    }

    currentView === "table"
        ? renderTable(items)
        : renderGrid(items);
}

/* ===== TABLE ===== */

function renderTable(items) {
    tableBody.innerHTML = "";

    items.forEach(i => {
        tableBody.insertAdjacentHTML("beforeend", `
        <tr>
            <td>${i.item}</td>
            <td>${i.brand ?? ""}</td>
            <td>${i.category}</td>
            <td>${i.season}</td>
            <td>${i.year_of_buying ?? ""}</td>
            <td>${i.style ?? ""}</td>
            <td>${i.cost ?? ""}</td>
            <td>${i.use ?? ""}</td>
            <td>${i.cost_per_use ?? ""}</td>
            <td class="actions">
                <button class="icon-btn" onclick='openEdit(${JSON.stringify(i)})'>
                    <img src="/static/icons/pencil.png" alt="Редактировать">
                </button>
                <button class="icon-btn" onclick='deleteItem(${i.id})'>
                    <img src="/static/icons/delete.png" alt="Удалить">
                </button>
            </td>
        </tr>
        `);
    });
}

/* ===== GRID ===== */

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

        // if (i.image_path) {
        //     const img = document.createElement("img");
        //     img.src = `/data/garments/${i.image_path}`;
        //     card.appendChild(img);
        // }
        if (i.image_path && i.category) {
            const imageWrapper = document.createElement("div");
            imageWrapper.className = "item-image";

            const img = document.createElement("img");
            const file = i.image_path.split("/").pop().replace(/\.[^/.]+$/, "");
            img.src = `/segmented/${i.category}/${file}_${i.category}.png`;

            imageWrapper.appendChild(img);
            card.appendChild(imageWrapper);
        }

        card.insertAdjacentHTML("beforeend", `
            <div class="item-name">${i.item}</div>
            <div class="item-actions">
                <button class="icon-btn" onclick='openEdit(${JSON.stringify(i)})'>
                    <img src="/static/icons/pencil.png" alt="Редактировать">
                </button>
                <button class="icon-btn" onclick='deleteItem(${i.id})'>
                    <img src="/static/icons/delete.png" alt="Удалить">
                </button>
            </div>
        `);

        grid.appendChild(card);
    });

    return grid;
}

/* ===== MODAL ===== */

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

    // if (item.image_path) {
    //     preview.src = `/data/garments/${item.image_path}`;
    //     preview.style.display = "block";
    // }
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

/* ===== CRUD ===== */

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

/* ===== EVENTS ===== */

filterCategory.onchange = render;
groupMode.onchange = render;
modal.onclick = e => e.target === modal && closeModal();

/* ===== INIT ===== */

loadItems();
