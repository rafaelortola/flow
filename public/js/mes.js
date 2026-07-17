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
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }
  monthSelect.value = params.get('month') || '6';
  yearSelect.value = params.get('year') || '2026';
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  let cls = 'badge-neutral';
  if (s.includes('pago') && !s.includes('não')) cls = 'badge-paid';
  else if (s.includes('não')) cls = 'badge-unpaid';
  else if (s.includes('vencido')) cls = 'badge-overdue';
  return `<span class="badge ${cls}">${status || '—'}</span>`;
}

function renderExpenses(group, items) {
  const tbody = document.getElementById(`expenses-${group}`);
  const total = items.reduce((s, e) => s + Number(e.amount), 0);
  document.getElementById(`total-${group}`).textContent = formatMoney(total);

  tbody.innerHTML = items.map((e) => `
    <tr>
      <td>${formatDate(e.due_date)}</td>
      <td>${e.name}</td>
      <td>${formatMoney(e.amount)}</td>
      <td>${e.category || '—'}</td>
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
  renderExpenses('card', card);
  document.getElementById('notesArea').value = notes.content || '';
}

// Modal
const modal = document.getElementById('modal');
const modalForm = document.getElementById('modalForm');

function fillSelect(id, items, emptyLabel = 'Selecione') {
  const el = document.getElementById(id);
  el.innerHTML = `<option value="">${emptyLabel}</option>` +
    items.map((x) => `<option value="${typeof x === 'string' ? x : x.name}">${typeof x === 'string' ? x : x.name}</option>`).join('');
}

function openModal(type) {
  modal.classList.remove('hidden');
  document.getElementById('modalType').value = type;
  document.getElementById('expenseFields').classList.toggle('hidden', type !== 'expense');
  document.getElementById('incomeFields').classList.toggle('hidden', type !== 'income');
  document.getElementById('modalTitle').textContent = type === 'income' ? 'Recebível' : 'Despesa';
}

function closeModal() {
  modal.classList.add('hidden');
  modalForm.reset();
  document.getElementById('modalId').value = '';
}

function openExpenseModal(group, item = null) {
  openModal('expense');
  document.getElementById('modalGroup').value = group;
  fillSelect('fCategory', categories);
  fillSelect('fSpendingType', options.spendingTypes);
  fillSelect('fDebtType', options.debtTypes);
  fillSelect('fStatus', options.paymentStatuses);

  if (item) {
    document.getElementById('modalId').value = item.id;
    document.getElementById('fDueDate').value = item.due_date ? item.due_date.slice(0, 10) : '';
    document.getElementById('fName').value = item.name;
    document.getElementById('fAmount').value = item.amount;
    document.getElementById('fCategory').value = item.category || '';
    document.getElementById('fSpendingType').value = item.spending_type || '';
    document.getElementById('fDebtType').value = item.debt_type || '';
    document.getElementById('fInstallment').value = item.installment_info || '';
    document.getElementById('fStatus').value = item.payment_status || 'Não pago';
  }
}

function openIncomeModal(item = null) {
  openModal('income');
  if (item) {
    document.getElementById('modalId').value = item.id;
    document.getElementById('fSource').value = item.source;
    document.getElementById('fIncomeAmount').value = item.amount;
  }
}

document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('addIncomeBtn').addEventListener('click', () => openIncomeModal());
document.querySelectorAll('.add-expense-btn').forEach((btn) => {
  btn.addEventListener('click', () => openExpenseModal(btn.dataset.group));
});

modalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { month, year } = getPeriod();
  const type = document.getElementById('modalType').value;
  const id = document.getElementById('modalId').value;

  if (type === 'income') {
    const body = {
      month, year,
      source: document.getElementById('fSource').value,
      amount: parseFloat(document.getElementById('fIncomeAmount').value),
    };
    if (id) await api(`/incomes/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    else await api('/incomes', { method: 'POST', body: JSON.stringify(body) });
  } else {
    const body = {
      month, year,
      expense_group: document.getElementById('modalGroup').value,
      due_date: document.getElementById('fDueDate').value || null,
      name: document.getElementById('fName').value,
      amount: parseFloat(document.getElementById('fAmount').value),
      category: document.getElementById('fCategory').value || null,
      spending_type: document.getElementById('fSpendingType').value || null,
      debt_type: document.getElementById('fDebtType').value || null,
      installment_info: document.getElementById('fInstallment').value || null,
      payment_status: document.getElementById('fStatus').value || 'Não pago',
    };
    if (id) await api(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    else await api('/expenses', { method: 'POST', body: JSON.stringify(body) });
  }

  closeModal();
  loadAll();
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
    options = await api('/categories/options');
    await loadAll();
  } catch {
    logout();
  }
}

init();
