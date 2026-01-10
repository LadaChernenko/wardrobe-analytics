const table = document.getElementById("itemsTable");
const modal = document.getElementById("itemModal");
const form = document.getElementById("itemForm");
const title = document.getElementById("modalTitle");
const preview = document.getElementById("preview");

const filterCategory = document.getElementById("filterCategory");
const sortMode = document.getElementById("sortMode");
const groupByCategory = document.getElementById("groupByCategory");

let allItems = [];
let currentItemId = null;

/* ---------- LOAD ---------- */

async function loadItems() {
    const res = await fetch("/items/");
    allItems = await res.json();
    renderTable();
}

/* ---------- RENDER ---------- */

function renderTable() {
    let items = [...allItems];

    if (filterCategory.value) {
        items = items.filter(i => i.category === filterCategory.value);
    }

    if (sortMode.value.includes("cost_per_use")) {
        items.sort((a, b) =>
            sortMode.value.endsWith("desc")
                ? b.cost_per_use - a.cost_per_use
                : a.cost_per_use - b.cost_per_use
        );
    }

    if (groupByCategory.checked) {
        const grouped = {};
        for (const i of items) {
            grouped[i.category] ??= [];
            grouped[i.category].push(i);
        }

        items = [];
        for (const cat of Object.keys(grouped).sort()) {
            grouped[cat].sort((a, b) => b.cost_per_use - a.cost_per_use);
            items.push(...grouped[cat]);
        }
    }

    table.innerHTML = "";

    for (const i of items) {
        table.insertAdjacentHTML("beforeend", `
        <tr>
            <td>${i.item}</td>
            <td>${i.brand ?? ""}</td>
            <td>${i.category}</td>
            <td>${i.season}</td>
            <td>${i.year_of_buying}</td>
            <td>${i.style}</td>
            <td>${i.colour ?? ""}</td>
            <td>${i.cost}</td>
            <td>${i.use}</td>
            <td>${i.cost_per_use}</td>
            <td class="actions">
                <button onclick='openEdit(${JSON.stringify(i)})'>✏️</button>
                <button onclick='deleteItem(${i.id})'>🗑</button>
            </td>
        </tr>
        `);
    }
}

/* ---------- MODAL ---------- */

function openCreate() {
    currentItemId = null;
    title.textContent = "Добавить предмет";
    form.reset();

    const imageInput = form.querySelector('input[name="image"]');
    imageInput.value = "";
    preview.src = "";
    preview.style.display = "none";

    modal.classList.add("open");
    document.body.classList.add("modal-open");
}

function openEdit(item) {
    currentItemId = item.id;
    title.textContent = "Редактировать предмет";

    form.reset();

    for (const key in item) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) input.value = item[key] ?? "";
    }

    const imageInput = form.querySelector('input[name="image"]');
    imageInput.value = "";
    preview.src = item.image_path ? `/data/garments/${item.image_path}` : "";
    preview.style.display = item.image_path ? "block" : "none";

    modal.classList.add("open");
    document.body.classList.add("modal-open");
}

function closeModal() {
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");

    form.reset();
    const imageInput = form.querySelector('input[name="image"]');
    imageInput.value = "";
    preview.src = "";
    preview.style.display = "none";
}

/* ---------- CRUD ---------- */

async function deleteItem(id) {
    if (!confirm("Удалить предмет?")) return;
    await fetch(`/items/${id}`, { method: "DELETE" });
    loadItems();
}


form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const method = currentItemId ? "PATCH" : "POST";
    const url = currentItemId ? `/items/${currentItemId}` : "/items/";

    const fd = new FormData(form);

    const imageInput = form.querySelector('input[name="image"]');
    if (!imageInput.files || imageInput.files.length === 0) {
        fd.delete("image"); // 🔥 не отправляем поле вообще
    }

    const res = await fetch(url, {
        method,
        body: fd
    });

    if (res.ok) {
        closeModal();
        loadItems();
    } else {
        alert("Ошибка сохранения");
    }
});

/* ---------- EVENTS ---------- */

filterCategory.onchange = renderTable;
sortMode.onchange = renderTable;
groupByCategory.onchange = renderTable;

modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
});

/* ---------- INIT ---------- */

loadItems();
