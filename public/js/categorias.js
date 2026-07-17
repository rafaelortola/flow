if (!requireAuth()) throw new Error('redirect');

document.getElementById('logoutBtn').addEventListener('click', logout);

const categoryForm = document.getElementById('categoryForm');
const categoryName = document.getElementById('categoryName');
const categoryType = document.getElementById('categoryType');
const categoryColor = document.getElementById('categoryColor');
const filterType = document.getElementById('filterType');
const categoryError = document.getElementById('categoryError');
const categoriesTable = document.getElementById('categoriesTable');

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
        <button class="btn-icon delete-category" data-id="${item.id}" title="Excluir">✕</button>
      </td>
    </tr>
  `).join('');

  categoriesTable.querySelectorAll('.delete-category').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta categoria?')) return;
      try {
        await api(`/categories/${btn.dataset.id}`, { method: 'DELETE' });
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
  const items = await api(`/categories${qs}`);
  renderCategories(items);
}

const submitBtn = categoryForm.querySelector('button[type="submit"]');

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

  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    await api('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, type, color }),
    });
    categoryForm.reset();
    categoryColor.value = '#6366f1';
    await loadCategories();
  } catch (err) {
    showError(err.message || 'Erro ao criar categoria.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Adicionar';
  }
});

filterType.addEventListener('change', loadCategories);

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
