if (!requireAuth()) throw new Error('redirect');

document.getElementById('logoutBtn').addEventListener('click', logout);

const cardForm = document.getElementById('cardForm');
const cardFormTitle = document.getElementById('cardFormTitle');
const cardName = document.getElementById('cardName');
const cardColor = document.getElementById('cardColor');
const cardClosingDay = document.getElementById('cardClosingDay');
const cardDueDay = document.getElementById('cardDueDay');
const cardCreditLimit = document.getElementById('cardCreditLimit');
const cardSubmitBtn = document.getElementById('cardSubmitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const cardError = document.getElementById('cardError');
const cardsTable = document.getElementById('cardsTable');

let cardsCache = [];
let editingCardId = null;

function showError(message) {
  cardError.textContent = message;
  cardError.classList.remove('hidden');
}

function clearError() {
  cardError.textContent = '';
  cardError.classList.add('hidden');
}

function formatDay(day) {
  return day != null ? `Dia ${day}` : '—';
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function resetForm() {
  editingCardId = null;
  cardForm.reset();
  cardColor.value = '#a855f7';
  cardFormTitle.textContent = 'Novo cartão';
  cardSubmitBtn.textContent = 'Adicionar';
  cancelEditBtn.classList.add('hidden');
}

function startEdit(item) {
  editingCardId = item.id;
  cardName.value = item.name;
  cardColor.value = item.color || '#a855f7';
  cardClosingDay.value = item.closing_day ?? '';
  cardDueDay.value = item.due_day ?? '';
  cardCreditLimit.value = item.credit_limit ?? '';
  cardFormTitle.textContent = 'Editar cartão';
  cardSubmitBtn.textContent = 'Salvar';
  cancelEditBtn.classList.remove('hidden');
  clearError();
  cardName.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderColorSwatch(color) {
  const value = color || '#A855F7';
  const bg = hexToRgba(value, 0.18) || value;
  return `<span class="color-swatch" style="background:${bg};border-color:${value}" title="${value}"></span>`;
}

function renderCards(items) {
  if (!items.length) {
    cardsTable.innerHTML = `
      <tr><td colspan="6" class="empty-cell">Nenhum cartão cadastrado.</td></tr>
    `;
    return;
  }

  cardsTable.innerHTML = items.map((item) => `
    <tr>
      <td>${renderColorSwatch(item.color)}</td>
      <td>${cardTag(item.name, item.color)}</td>
      <td>${formatDay(item.closing_day)}</td>
      <td>${formatDay(item.due_day)}</td>
      <td>${formatMoney(item.credit_limit)}</td>
      <td class="actions">
        <button class="btn-icon edit-card" data-id="${item.id}" title="Editar">✎</button>
        <button class="btn-icon delete-card" data-id="${item.id}" title="Excluir">✕</button>
      </td>
    </tr>
  `).join('');

  cardsTable.querySelectorAll('.edit-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = cardsCache.find((x) => x.id === btn.dataset.id);
      if (item) startEdit(item);
    });
  });

  cardsTable.querySelectorAll('.delete-card').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este cartão? Despesas vinculadas ficarão sem cartão.')) return;
      try {
        await api(`/cards/${btn.dataset.id}`, { method: 'DELETE' });
        if (editingCardId === btn.dataset.id) resetForm();
        await loadCards();
      } catch (err) {
        showError(err.message || 'Erro ao excluir cartão.');
      }
    });
  });
}

async function loadCards() {
  try {
    cardsCache = await api('/cards');
    renderCards(cardsCache);
  } catch (err) {
    if (err.status === 401) {
      logout();
      return;
    }
    showError(err.message || 'Erro ao carregar cartões. Reinicie o servidor (npm start) e tente novamente.');
    renderCards([]);
  }
}

function buildPayload() {
  const closing = cardClosingDay.value.trim();
  const due = cardDueDay.value.trim();
  const limit = cardCreditLimit.value.trim();
  return {
    name: cardName.value.trim(),
    color: cardColor.value,
    closing_day: closing === '' ? null : parseInt(closing, 10),
    due_day: due === '' ? null : parseInt(due, 10),
    credit_limit: limit === '' ? 0 : parseFloat(limit),
  };
}

cardForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const payload = buildPayload();
  if (!payload.name) {
    showError('Informe o nome do cartão.');
    return;
  }

  cardSubmitBtn.disabled = true;
  cardSubmitBtn.textContent = editingCardId ? 'Salvando...' : 'Adicionar...';

  try {
    if (editingCardId) {
      await api(`/cards/${editingCardId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } else {
      await api('/cards', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    await loadCards();
  } catch (err) {
    showError(err.message || 'Erro ao salvar cartão.');
  } finally {
    cardSubmitBtn.disabled = false;
    cardSubmitBtn.textContent = editingCardId ? 'Salvar' : 'Adicionar';
  }
});

cancelEditBtn.addEventListener('click', () => {
  resetForm();
  clearError();
});

async function init() {
  try {
    const user = await api('/me');
    document.getElementById('userGreeting').textContent = user.name || user.email;
  } catch (err) {
    if (err.status === 401) logout();
    else showError(err.message || 'Erro ao validar sessão.');
    return;
  }
  await loadCards();
}

init();
