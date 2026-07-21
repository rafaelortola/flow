if (!requireAuth()) throw new Error('redirect');

document.getElementById('logoutBtn').addEventListener('click', logout);

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const yearSelect = document.getElementById('yearSelect');
const reloadBtn = document.getElementById('reloadBtn');
const reportError = document.getElementById('reportError');
const params = new URLSearchParams(window.location.search);

function showError(message) {
  reportError.textContent = message;
  reportError.classList.remove('hidden');
}

function clearError() {
  reportError.textContent = '';
  reportError.classList.add('hidden');
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(v) {
  return `${Number(v || 0).toFixed(1)}%`;
}

function fillYearSelect(years) {
  const currentYear = new Date().getFullYear();
  const uniqueYears = [...new Set([...years, currentYear])].sort((a, b) => b - a);
  yearSelect.innerHTML = uniqueYears.map((year) => (
    `<option value="${year}">${year}</option>`
  )).join('');

  const requestedYear = parseInt(params.get('year') || String(currentYear), 10);
  yearSelect.value = uniqueYears.includes(requestedYear)
    ? String(requestedYear)
    : String(uniqueYears[0] || currentYear);
}

function updateYearUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('year', yearSelect.value);
  history.replaceState(null, '', url);
}

function renderMonthlyChart(months) {
  const max = Math.max(...months.map((m) => m.despesas), 1);
  document.getElementById('monthlyExpenseChart').innerHTML = months.map((m, i) => {
    const h = Math.round((m.despesas / max) * 100);
    return `
      <div class="chart-bar-wrap" title="${MONTHS[i]}: ${formatMoney(m.despesas)}">
        <div class="chart-bar bar-negative" style="height:${Math.max(h, m.despesas > 0 ? 4 : 0)}%"></div>
        <span>${MONTHS[i].slice(0, 3)}</span>
      </div>`;
  }).join('');
}

function renderRankedBars(containerId, items, labelKey) {
  const el = document.getElementById(containerId);
  if (!items.length) {
    el.innerHTML = '<p class="empty-cell">Sem dados para o período.</p>';
    return;
  }

  const max = Math.max(...items.map((item) => item.total), 1);
  el.innerHTML = items.map((item) => {
    const width = Math.round((item.total / max) * 100);
    const label = item[labelKey];
    const percent = item.percent != null ? formatPercent(item.percent) : '';
    return `
      <div class="ranked-row" title="${label}: ${formatMoney(item.total)}">
        <div class="ranked-label">${label}</div>
        <div class="ranked-track">
          <div class="ranked-fill" style="width:${Math.max(width, item.total > 0 ? 2 : 0)}%"></div>
        </div>
        <div class="ranked-value">${formatMoney(item.total)}${percent ? ` <span class="ranked-percent">${percent}</span>` : ''}</div>
      </div>`;
  }).join('');
}

function renderTableBody(id, rows, emptyMessage = 'Sem dados.') {
  const el = document.getElementById(id);
  if (!rows.length) {
    el.innerHTML = `<tr><td colspan="10" class="empty-cell">${emptyMessage}</td></tr>`;
    return;
  }
  el.innerHTML = rows;
}

async function loadReports() {
  clearError();
  const year = parseInt(yearSelect.value, 10);
  if (!Number.isFinite(year)) {
    showError('Selecione um ano válido.');
    return;
  }

  document.getElementById('yearLabel').textContent = year;
  reloadBtn.disabled = true;
  reloadBtn.textContent = 'Carregando...';

  try {
    const data = await api(`/reports?year=${year}`);
    updateYearUrl();

    document.getElementById('totalReceitas').textContent = formatMoney(data.totals.receitas);
    document.getElementById('totalDespesas').textContent = formatMoney(data.totals.despesas);
    const sobraEl = document.getElementById('totalSobra');
    sobraEl.textContent = formatMoney(data.totals.sobra);
    sobraEl.className = `value ${data.totals.sobra >= 0 ? 'text-green' : 'text-red'}`;

    renderMonthlyChart(data.months);
    renderRankedBars('topCategoriesChart', data.topCategories, 'category');
    renderRankedBars('groupsChart', data.groups, 'label');

    renderTableBody('categoriesTable', data.categories.map((item) => `
      <tr>
        <td>${item.category}</td>
        <td>${formatMoney(item.total)}</td>
        <td>${formatPercent(item.percent)}</td>
        <td>${item.count}</td>
      </tr>
    `).join(''));

    renderTableBody('monthsTable', data.months.map((m, i) => `
      <tr>
        <td>${MONTHS[i]}</td>
        <td>${formatMoney(m.receitas)}</td>
        <td>${formatMoney(m.despesas)}</td>
        <td class="${m.sobra >= 0 ? 'text-green' : 'text-red'}">${formatMoney(m.sobra)}</td>
        <td><a class="btn-link" href="/mes.html?month=${m.month}&year=${year}">Abrir mês</a></td>
      </tr>
    `).join(''));

    renderTableBody('incomeCategoriesTable', data.incomeCategories.map((item) => `
      <tr>
        <td>${item.category}</td>
        <td>${formatMoney(item.total)}</td>
        <td>${item.count}</td>
      </tr>
    `).join(''), 'Sem receitas categorizadas.');

    renderTableBody('incomeSourcesTable', data.incomeSources.map((item) => `
      <tr>
        <td>${item.source}</td>
        <td>${formatMoney(item.total)}</td>
        <td>${item.count}</td>
      </tr>
    `).join(''), 'Sem receitas no período.');
  } catch (err) {
    if (err.status === 401) {
      logout();
      return;
    }
    showError(err.message || 'Erro ao carregar relatórios. Reinicie o servidor (npm start) e tente novamente.');
  } finally {
    reloadBtn.disabled = false;
    reloadBtn.textContent = 'Atualizar';
  }
}

reloadBtn.addEventListener('click', loadReports);

async function init() {
  try {
    const user = await api('/me');
    document.getElementById('userGreeting').textContent = user.name || user.email;
  } catch (err) {
    if (err.status === 401) logout();
    else showError(err.message || 'Erro ao validar sessão.');
    return;
  }

  try {
    const { years } = await api('/reports/years');
    fillYearSelect(years);
  } catch {
    fillYearSelect([new Date().getFullYear()]);
  }

  await loadReports();
}

init();
