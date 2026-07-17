if (!requireAuth()) throw new Error('redirect');

document.getElementById('logoutBtn').addEventListener('click', logout);

const categoryForm = document.getElementById('categoryForm');
const categoryFormTitle = document.getElementById('categoryFormTitle');
const categoryName = document.getElementById('categoryName');
const categoryType = document.getElementById('categoryType');
const categoryColor = document.getElementById('categoryColor');
const categorySubmitBtn = document.getElementById('categorySubmitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const filterType = document.getElementById('filterType');
const categoryError = document.getElementById('categoryError');
const categoriesTable = document.getElementById('categoriesTable');

let categoriesCache = [];
let editingCategoryId = null;

const TYPE_LABELS = {
  EXPENSE: 'Despesa',
  INCOME: 'Recebível',
};

function showError(message) {
  categoryError.textContent = message;
  categoryError.classList.remove('hidden');
}

function clearError() {
  categoryError.textContent = '';
  categoryError.classList.add('hidden');
}

function resetForm() {
  editingCategoryId = null;
  categoryForm.reset();
  categoryColor.value = '#6366f1';
  categoryFormTitle.textContent = 'Nova categoria';
  categorySubmitBtn.textContent = 'Adicionar';
  cancelEditBtn.classList.add('hidden');
}

function startEdit(item) {
  editingCategoryId = item.id;
  categoryName.value = item.name;
  categoryType.value = item.type;
  categoryColor.value = item.color || '#6366f1';
  categoryFormTitle.textContent = 'Editar categoria';
  categorySubmitBtn.textContent = 'Salvar';
  cancelEditBtn.classList.remove('hidden');
  clearError();
  categoryName.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderColorSwatch(color) {
  const value = color || '#6366F1';
  const bg = hexToRgba(value, 0.18) || value;
  return `<span class="color-swatch" style="background:${bg};border-color:${value}" title="${value}"></span>`;
}

function renderCategories(items) {
  if (!items.length) {
    categoriesTable.innerHTML = `
      <tr><td colspan="4" class="empty-cell">Nenhuma categoria cadastrada.</td></tr>
    `;
    return;
  }

  categoriesTable.innerHTML = items.map((item) => `
    <tr>
      <td>${renderColorSwatch(item.color)}</td>
      <td>${categoryTag(item.name, buildCategoryColorMap([item]))}</td>
      <td>${TYPE_LABELS[item.type] || item.type}</td>
      <td class="actions">
        <button class="btn-icon edit-category" data-id="${item.id}" title="Editar">✎</button>
        <button class="btn-icon delete-category" data-id="${item.id}" title="Excluir">✕</button>
      </td>
    </tr>
  `).join('');

  categoriesTable.querySelectorAll('.edit-category').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = categoriesCache.find((x) => x.id === btn.dataset.id);
      if (item) startEdit(item);
    });
  });

  categoriesTable.querySelectorAll('.delete-category').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta categoria?')) return;
      try {
        await api(`/categories/${btn.dataset.id}`, { method: 'DELETE' });
        if (editingCategoryId === btn.dataset.id) resetForm();
        await loadCategories();
      } catch (err) {
        showError(err.message || 'Erro ao excluir categoria.');
      }
    });
  });
}

async function loadCategories() {
  const type = filterType.value;
  const qs = type ? `?type=${type}` : '';
  categoriesCache = await api(`/categories${qs}`);
  renderCategories(categoriesCache);
}

categoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const name = categoryName.value.trim();
  const type = categoryType.value;
  const color = categoryColor.value;

  if (!name) {
    showError('Informe o nome da categoria.');
    return;
  }

  categorySubmitBtn.disabled = true;
  categorySubmitBtn.textContent = editingCategoryId ? 'Salvando...' : 'Adicionar...';

  try {
    if (editingCategoryId) {
      await api(`/categories/${editingCategoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, type, color }),
      });
    } else {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, type, color }),
      });
    }
    resetForm();
    await loadCategories();
  } catch (err) {
    showError(err.message || 'Erro ao salvar categoria.');
  } finally {
    categorySubmitBtn.disabled = false;
    categorySubmitBtn.textContent = editingCategoryId ? 'Salvar' : 'Adicionar';
  }
});

cancelEditBtn.addEventListener('click', () => {
  resetForm();
  clearError();
});

filterType.addEventListener('change', () => {
  resetForm();
  loadCategories();
});

async function init() {
  try {
    const user = await api('/me');
    document.getElementById('userGreeting').textContent = user.name || user.email;
    await loadCategories();
  } catch {
    logout();
  }
}

init();
