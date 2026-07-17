if (!requireAuth()) throw new Error('redirect');

document.getElementById('logoutBtn').addEventListener('click', logout);

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const yearSelect = document.getElementById('yearSelect');

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(v) {
  return `${Number(v || 0).toFixed(1)}%`;
}

function initYearSelect() {
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }
  yearSelect.value = String(currentYear);
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
  const year = parseInt(yearSelect.value, 10);
  document.getElementById('yearLabel').textContent = year;

  const data = await api(`/reports?year=${year}`);

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
}

yearSelect.addEventListener('change', loadReports);
document.getElementById('reloadBtn').addEventListener('click', loadReports);

async function init() {
  initYearSelect();
  try {
    const user = await api('/me');
    document.getElementById('userGreeting').textContent = user.name || user.email;
    await loadReports();
  } catch {
    logout();
  }
}

init();
