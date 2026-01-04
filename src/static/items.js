const tableBody = document.querySelector("#itemsTable tbody");
const modal = document.getElementById("itemModal");
const form = document.getElementById("itemForm");
const title = document.getElementById("modalTitle");

let currentItemId = null;

async function loadItems() {
    const res = await fetch("/items/");
    const items = await res.json();

    tableBody.innerHTML = "";
    for (const i of items) {
        tableBody.innerHTML += `
            <tr>
                <td>${i.item}</td>
                <td>${i.category}</td>
                <td>${i.season}</td>
                <td>${i.cost_per_use}</td>
                <td class="actions">
                    <button onclick='openEdit(${JSON.stringify(i)})'>✏️</button>
                    <button onclick='deleteItem(${i.id})'>🗑</button>
                </td>
            </tr>
        `;
    }
}

function openCreate() {
    currentItemId = null;
    title.textContent = "Добавить предмет";
    form.reset();
    preview.style.display = "none";
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
}

function openEdit(item) {
    currentItemId = item.id;
    title.textContent = "Редактировать предмет";

    for (const key in item) {
        if (form[key]) {
            form[key].value = item[key] ?? "";
        }
    }

    preview.style.display = "none";
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
}


function closeModal() {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
}

async function deleteItem(id) {
    if (!confirm("Удалить предмет?")) return;
    await fetch(`/items/${id}`, { method: "DELETE" });
    loadItems();
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const method = currentItemId ? "PATCH" : "POST";
    const url = currentItemId ? `/items/${currentItemId}` : "/items/";

    const res = await fetch(url, {
        method,
        body: new FormData(form)
    });

    if (res.ok) {
        closeModal();
        loadItems();
    } else {
        alert("Ошибка сохранения");
    }
});

loadItems();
