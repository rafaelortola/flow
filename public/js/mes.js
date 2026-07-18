if (!requireAuth()) throw new Error('redirect');

document.getElementById('logoutBtn').addEventListener('click', logout);

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const params = new URLSearchParams(window.location.search);

let categories = [];
let categoryColorMap = new Map();
let cards = [];
let options = {};

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
}

function getPeriod() {
  return {
    month: parseInt(monthSelect.value, 10),
    year: parseInt(yearSelect.value, 10),
  };
}

function initPeriodSelectors() {
  MONTHS.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = name;
    monthSelect.appendChild(opt);
  });
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }
  monthSelect.value = params.get('month') || String(currentMonth);
  yearSelect.value = params.get('year') || String(currentYear);
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  let cls = 'badge-neutral';
  if (s.includes('pago') && !s.includes('não')) cls = 'badge-paid';
  else if (s.includes('não')) cls = 'badge-unpaid';
  else if (s.includes('vencido')) cls = 'badge-overdue';
  return `<span class="badge ${cls}">${status || '—'}</span>`;
}

function installmentInputValue(expense) {
  const info = (expense.installment_info || '').trim();
  const total = expense.installment_total != null ? Number(expense.installment_total) : null;
  if (!info && total == null) return '';

  const fullMatch = info.match(/^(\d+)\s*de\s*(\d+)$/i);
  if (fullMatch) return `${fullMatch[1]} de ${fullMatch[2]}`;

  const partialMatch = info.match(/^(\d+)\s*de\s*$/i);
  if (partialMatch && total) return `${partialMatch[1]} de ${total}`;

  return info;
}

function parseInstallmentInput(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return { installment_info: null, installment_total: null };

  const fullMatch = trimmed.match(/^(\d+)\s*de\s*(\d+)$/i);
  if (fullMatch) {
    return {
      installment_info: `${fullMatch[1]} de`,
      installment_total: parseInt(fullMatch[2], 10),
    };
  }

  return { installment_info: trimmed, installment_total: null };
}

const GROUPS_WITH_INSTALLMENT = new Set(['essential', 'nonessential', 'debt']);
const CARD_CATEGORY = 'Cartão de Crédito';

let cardInvoices = [];
let cardModalMode = 'default';

function renderCardInvoices(items, extra = {}) {
  cardInvoices = items;
  const tbody = document.getElementById('expenses-card');
  const total = items.reduce((s, row) => s + Number(row.invoice_total ?? row.amount ?? 0), 0);
  document.getElementById('total-card').textContent = formatMoney(total);
  const colCount = 9;

  if (!items.length) {
    const message = extra.noCards
      ? 'Nenhum cartão cadastrado. Cadastre em Cartões no menu.'
      : 'Nenhum lançamento neste mês.';
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-cell">${message}</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map((row) => `
    <tr>
      <td>${formatDate(row.due_date)}</td>
      <td>${cardTag(row.card_name, row.card_color)}</td>
      <td>${formatMoney(row.invoice_total ?? row.amount)}</td>
      <td>${categoryTag(CARD_CATEGORY, categoryColorMap)}</td>
      <td>${statusBadge(row.payment_status)}</td>
      <td>${formatMoney(row.credit_limit)}</td>
      <td>${formatMoney(row.limit_available)}</td>
      <td>${renderInvoiceClosedBadge(row.invoice_closed)}</td>
      <td class="actions">
        ${row.id ? `
          <button class="btn-icon toggle-pay" data-id="${row.id}" data-status="${row.payment_status}" title="Alternar pago">✓</button>
          <button class="btn-icon edit-expense" data-id="${row.id}" title="Editar fatura">✎</button>
        ` : `
          <span class="muted-inline">—</span>
        `}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.toggle-pay').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const next = btn.dataset.status === 'Pago' ? 'Não pago' : 'Pago';
      await api(`/expenses/${btn.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ payment_status: next }) });
      loadAll();
    });
  });

  tbody.querySelectorAll('.edit-expense').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = cardInvoices.find((x) => x.id === btn.dataset.id);
      if (row) openExpenseModal('card', row);
    });
  });
}

function renderExpenses(group, items, extra = {}) {
  if (group === 'card') {
    renderCardInvoices(items, extra);
    return;
  }

  const tbody = document.getElementById(`expenses-${group}`);
  const total = items.reduce((s, e) => s + Number(e.amount), 0);
  document.getElementById(`total-${group}`).textContent = formatMoney(total);
  const showInstallment = GROUPS_WITH_INSTALLMENT.has(group);
  const colCount = showInstallment ? 7 : 6;

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-cell">Nenhum lançamento neste mês.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map((e) => `
    <tr>
      <td>${formatDate(e.due_date)}</td>
      <td>${e.name}</td>
      <td>${formatMoney(e.amount)}</td>
      <td>${categoryTag(e.category || '—', categoryColorMap)}</td>
      ${showInstallment ? `<td>${renderInstallmentCell(e)}</td>` : ''}
      <td>${statusBadge(e.payment_status)}</td>
      <td class="actions">
        <button class="btn-icon toggle-pay" data-id="${e.id}" data-status="${e.payment_status}" title="Alternar pago">✓</button>
        <button class="btn-icon edit-expense" data-id="${e.id}" title="Editar">✎</button>
        <button class="btn-icon delete-expense" data-id="${e.id}" title="Excluir">✕</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.toggle-pay').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const next = btn.dataset.status === 'Pago' ? 'Não pago' : 'Pago';
      await api(`/expenses/${id}/status`, { method: 'PATCH', body: JSON.stringify({ payment_status: next }) });
      loadAll();
    });
  });
  tbody.querySelectorAll('.edit-expense').forEach((btn) => {
    btn.addEventListener('click', () => openExpenseModal(group, items.find((x) => x.id === btn.dataset.id)));
  });
  tbody.querySelectorAll('.delete-expense').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir despesa?')) return;
      await api(`/expenses/${btn.dataset.id}`, { method: 'DELETE' });
      loadAll();
    });
  });
}

function renderIncomes(items) {
  document.getElementById('incomesTable').innerHTML = items.map((i) => `
    <tr>
      <td>${i.source}</td>
      <td>${categoryTag(i.category || '—', categoryColorMap)}</td>
      <td>${formatMoney(i.amount)}</td>
      <td class="actions">
        <button class="btn-icon edit-income" data-id="${i.id}">✎</button>
        <button class="btn-icon delete-income" data-id="${i.id}">✕</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.edit-income').forEach((btn) => {
    btn.addEventListener('click', () => openIncomeModal(items.find((x) => x.id === btn.dataset.id)));
  });
  document.querySelectorAll('.delete-income').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir recebível?')) return;
      await api(`/incomes/${btn.dataset.id}`, { method: 'DELETE' });
      loadAll();
    });
  });
}

async function loadAll() {
  const { month, year } = getPeriod();
  const qs = `?month=${month}&year=${year}`;

  try {
    cards = await api('/cards');
  } catch (err) {
    if (err.status === 401) {
      logout();
      return;
    }
    cards = cards || [];
  }

  const [summary, incomes, essential, nonessential, debt, card, notes] = await Promise.all([
    api(`/dashboard/month${qs}`),
    api(`/incomes${qs}`),
    api(`/expenses${qs}&group=essential`),
    api(`/expenses${qs}&group=nonessential`),
    api(`/expenses${qs}&group=debt`),
    api(`/expenses${qs}&group=card`),
    api(`/notes${qs}`),
  ]);

  document.getElementById('receitaBruta').textContent = formatMoney(summary.receitaBruta);
  document.getElementById('totalDespesas').textContent = formatMoney(summary.totalDespesas);
  document.getElementById('tendenciaSobra').textContent = formatMoney(summary.tendenciaSobra);
  document.getElementById('gastosCartoes').textContent = formatMoney(summary.gastosCartoes);

  renderIncomes(incomes);
  renderExpenses('essential', essential);
  renderExpenses('nonessential', nonessential);
  renderExpenses('debt', debt);
  renderExpenses('card', card, { noCards: cards.length === 0 });
  document.getElementById('notesArea').value = notes.content || '';
}

// Modal
const modal = document.getElementById('modal');
const modalForm = document.getElementById('modalForm');
const modalError = document.getElementById('modalError');
const modalSubmitBtn = document.getElementById('modalSubmitBtn');
const fIncomeAmount = document.getElementById('fIncomeAmount');

bindCurrencyInput(fIncomeAmount);

function showModalError(message) {
  modalError.textContent = message;
  modalError.classList.remove('hidden');
}

function clearModalError() {
  modalError.textContent = '';
  modalError.classList.add('hidden');
}

function fillSelect(id, items, emptyLabel = 'Selecione', selectedValue = '') {
  const el = document.getElementById(id);
  const names = items.map((x) => (typeof x === 'string' ? x : x.name));
  let html = `<option value="">${emptyLabel}</option>` +
    items.map((x) => {
      const name = typeof x === 'string' ? x : x.name;
      return `<option value="${name}">${name}</option>`;
    }).join('');

  if (selectedValue && !names.includes(selectedValue)) {
    html += `<option value="${selectedValue}">${selectedValue}</option>`;
  }

  el.innerHTML = html;
  if (selectedValue) el.value = selectedValue;
}

function fillCardSelect(id, items, emptyLabel = 'Selecione', selectedId = '') {
  const el = document.getElementById(id);
  let html = `<option value="">${emptyLabel}</option>` +
    items.map((card) => `<option value="${card.id}">${card.name}</option>`).join('');
  el.innerHTML = html;
  if (selectedId) el.value = selectedId;
}

function categoriesByType(type) {
  return categories.filter((c) => c.type === type);
}

async function refreshCategories() {
  categories = await api('/categories');
  categoryColorMap = buildCategoryColorMap(categories);
}

async function refreshCards() {
  cards = await api('/cards');
}

function setAmountFieldLabel(text) {
  const label = document.getElementById('fAmountLabel');
  const input = document.getElementById('fAmount');
  label.textContent = '';
  label.append(`${text}`, input);
}

function setCardModalFields(group, mode = 'default') {
  const isCard = group === 'card';
  const isInvoice = isCard && mode === 'invoice';
  const isPurchase = isCard && mode === 'purchase';

  document.getElementById('fNameLabel').classList.toggle('hidden', isInvoice);
  document.getElementById('fCategoryLabel').classList.toggle('hidden', isCard);
  document.getElementById('fSpendingTypeLabel').classList.toggle('hidden', isCard);
  document.getElementById('fDebtTypeLabel').classList.toggle('hidden', isCard);
  document.getElementById('fInstallmentLabel').classList.toggle('hidden', !isPurchase);
  document.getElementById('cardField').classList.toggle('hidden', isInvoice);
  document.getElementById('fCard').required = isPurchase;

  document.getElementById('fName').required = !isCard || isPurchase;
  setAmountFieldLabel(isInvoice ? 'Valor total da fatura' : 'Valor');
  cardModalMode = mode;
}

function setExpenseFieldVisibility(group) {
  if (group === 'card') {
    setCardModalFields(group, 'purchase');
    return;
  }
  document.getElementById('cardField').classList.add('hidden');
  document.getElementById('fCard').required = false;
  document.getElementById('fNameLabel').classList.remove('hidden');
  document.getElementById('fCategoryLabel').classList.remove('hidden');
  document.getElementById('fSpendingTypeLabel').classList.remove('hidden');
  document.getElementById('fDebtTypeLabel').classList.remove('hidden');
  document.getElementById('fInstallmentLabel').classList.toggle('hidden', !GROUPS_WITH_INSTALLMENT.has(group));
  setAmountFieldLabel('Valor');
  cardModalMode = 'default';
}

function setModalFieldsRequired(type) {
  const isExpense = type === 'expense';
  const isIncome = type === 'income';
  document.getElementById('fName').required = isExpense;
  document.getElementById('fAmount').required = isExpense;
  document.getElementById('fSource').required = isIncome;
  document.getElementById('fIncomeAmount').required = isIncome;
}

function openModal(type) {
  clearModalError();
  modal.classList.remove('hidden');
  document.getElementById('modalType').value = type;
  document.getElementById('expenseFields').classList.toggle('hidden', type !== 'expense');
  document.getElementById('incomeFields').classList.toggle('hidden', type !== 'income');
  document.getElementById('modalTitle').textContent = type === 'income' ? 'Recebível' : 'Despesa';
  setModalFieldsRequired(type);
}

function closeModal() {
  modal.classList.add('hidden');
  modalForm.reset();
  document.getElementById('modalId').value = '';
  document.getElementById('cardField').classList.add('hidden');
  document.getElementById('fCard').required = false;
  cardModalMode = 'default';
  setAmountFieldLabel('Valor');
  clearModalError();
  modalSubmitBtn.disabled = false;
  modalSubmitBtn.textContent = 'Salvar';
}

async function openExpenseModal(group, item = null) {
  await Promise.all([refreshCategories(), refreshCards()]);
  openModal('expense');
  document.getElementById('modalGroup').value = group;

  const isCardInvoice = group === 'card' && item?.card_id && item?.id;
  if (group === 'card') {
    setCardModalFields(group, isCardInvoice ? 'invoice' : 'purchase');
  } else {
    setExpenseFieldVisibility(group);
  }

  fillSelect('fCategory', categoriesByType('EXPENSE'), 'Selecione', item?.category || CARD_CATEGORY);
  fillCardSelect('fCard', cards, 'Selecione', item?.card_id || '');
  fillSelect('fSpendingType', options.spendingTypes);
  fillSelect('fDebtType', options.debtTypes);
  fillSelect('fStatus', options.paymentStatuses);

  if (group === 'card') {
    document.getElementById('modalTitle').textContent = isCardInvoice ? 'Editar fatura do cartão' : 'Compra no cartão';
  }

  if (item) {
    document.getElementById('modalId').value = item.id || '';
    document.getElementById('fDueDate').value = item.due_date ? item.due_date.slice(0, 10) : '';
    document.getElementById('fName').value = item.name || item.card_name || '';
    document.getElementById('fAmount').value = item.invoice_total ?? item.amount ?? '';
    document.getElementById('fCategory').value = item.category || CARD_CATEGORY;
    document.getElementById('fCard').value = item.card_id || '';
    document.getElementById('fSpendingType').value = item.spending_type || '';
    document.getElementById('fDebtType').value = item.debt_type || '';
    document.getElementById('fInstallment').value = installmentInputValue(item);
    document.getElementById('fStatus').value = item.payment_status || 'Não pago';
  } else if (group === 'card') {
    document.getElementById('fCategory').value = CARD_CATEGORY;
  }
}

async function openIncomeModal(item = null) {
  await refreshCategories();
  openModal('income');
  document.getElementById('modalId').value = '';
  document.getElementById('fSource').value = '';
  document.getElementById('fIncomeCategory').value = '';
  fIncomeAmount.value = '';
  fillSelect('fIncomeCategory', categoriesByType('INCOME'), 'Selecione', item?.category || '');
  if (item) {
    document.getElementById('modalId').value = item.id;
    document.getElementById('fSource').value = item.source;
    document.getElementById('fIncomeCategory').value = item.category || '';
    fIncomeAmount.value = formatMoney(item.amount);
  }
}

document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('addIncomeBtn').addEventListener('click', () => openIncomeModal());
document.querySelectorAll('.add-expense-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.group;
    setExpenseFieldVisibility(group);
    openExpenseModal(group);
  });
});

modalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearModalError();

  const { month, year } = getPeriod();
  const type = document.getElementById('modalType').value;
  const id = document.getElementById('modalId').value;

  modalSubmitBtn.disabled = true;
  modalSubmitBtn.textContent = 'Salvando...';

  try {
    if (type === 'income') {
      const source = document.getElementById('fSource').value.trim();
      const amount = parseCurrencyInput(fIncomeAmount.value);

      if (!source) {
        showModalError('Informe a fonte do recebível.');
        return;
      }
      if (!Number.isFinite(amount) || amount < 0.01) {
        showModalError('Informe um valor válido (mínimo R$ 0,01).');
        return;
      }

      const body = {
        month, year, source, amount,
        category: document.getElementById('fIncomeCategory').value || null,
      };
      if (id) await api(`/incomes/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/incomes', { method: 'POST', body: JSON.stringify(body) });
    } else {
      const group = document.getElementById('modalGroup').value;
      const installment = parseInstallmentInput(document.getElementById('fInstallment').value);
      const cardId = document.getElementById('fCard').value;
      const selectedCard = cards.find((c) => c.id === cardId);
      const body = {
        month, year,
        expense_group: group,
        due_date: document.getElementById('fDueDate').value || null,
        name: document.getElementById('fName').value,
        amount: parseFloat(document.getElementById('fAmount').value),
        category: document.getElementById('fCategory').value || null,
        spending_type: document.getElementById('fSpendingType').value || null,
        debt_type: document.getElementById('fDebtType').value || null,
        installment_info: installment.installment_info,
        installment_total: installment.installment_total,
        payment_status: document.getElementById('fStatus').value || 'Não pago',
      };

      if (group === 'card') {
        if (cardModalMode === 'invoice') {
          const invoiceRow = cardInvoices.find((row) => row.id === id);
          body.card_id = invoiceRow?.card_id || cardId;
          body.name = invoiceRow?.card_name || selectedCard?.name || body.name;
          body.category = CARD_CATEGORY;
          if (!body.card_id) {
            showModalError('Cartão não identificado.');
            return;
          }
        } else {
          if (!cardId) {
            showModalError('Selecione o cartão.');
            return;
          }
          if (!body.name.trim()) {
            showModalError('Informe a descrição da compra.');
            return;
          }
          body.category = CARD_CATEGORY;
          body.card_id = cardId;
        }
      }

      if (id) await api(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/expenses', { method: 'POST', body: JSON.stringify(body) });
    }

    closeModal();
    await loadAll();
  } catch (err) {
    showModalError(err.message || 'Erro ao salvar. Tente novamente.');
  } finally {
    modalSubmitBtn.disabled = false;
    modalSubmitBtn.textContent = 'Salvar';
  }
});

document.getElementById('saveNotesBtn').addEventListener('click', async () => {
  const { month, year } = getPeriod();
  await api('/notes', {
    method: 'PUT',
    body: JSON.stringify({ month, year, content: document.getElementById('notesArea').value }),
  });
});

document.getElementById('reloadBtn').addEventListener('click', loadAll);
monthSelect.addEventListener('change', loadAll);
yearSelect.addEventListener('change', loadAll);

async function init() {
  initPeriodSelectors();
  try {
    const user = await api('/me');
    document.getElementById('userGreeting').textContent = user.name || user.email;
    categories = await api('/categories');
    categoryColorMap = buildCategoryColorMap(categories);
    try {
      cards = await api('/cards');
    } catch (err) {
      if (err.status === 401) {
        logout();
        return;
      }
      cards = [];
    }
    options = await api('/categories/options');
    await loadAll();
  } catch (err) {
    if (err.status === 401) logout();
  }
}

init();
