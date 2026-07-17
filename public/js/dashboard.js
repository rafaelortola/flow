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

function renderChart(months) {
  const max = Math.max(...months.map((m) => Math.abs(m.tendenciaSobra)), 1);
  document.getElementById('chartBars').innerHTML = months.map((m, i) => {
    const h = Math.round((Math.abs(m.tendenciaSobra) / max) * 100);
    const cls = m.tendenciaSobra >= 0 ? 'bar-positive' : 'bar-negative';
    return `
      <div class="chart-bar-wrap" title="${MONTHS[i]}: ${formatMoney(m.tendenciaSobra)}">
        <div class="chart-bar ${cls}" style="height:${h}%"></div>
        <span>${MONTHS[i].slice(0, 3)}</span>
      </div>`;
  }).join('');
}

function renderCategoryBreakdown(reportCategories, colorMap) {
  const el = document.getElementById('categoryBreakdown');
  if (!reportCategories.length) {
    el.innerHTML = '<p class="empty-cell">Sem gastos por categoria no ano.</p>';
    return;
  }

  el.innerHTML = reportCategories.map((item) => `
    <div class="category-breakdown-row">
      <div class="category-breakdown-label">${categoryTag(item.category, colorMap)}</div>
      <div class="category-breakdown-bar">
        <div class="category-breakdown-fill" style="width:${Math.max(item.percent, item.total > 0 ? 2 : 0)}%;background:${colorMap.get(item.category) || '#6366F1'}"></div>
      </div>
      <div class="category-breakdown-values">
        <strong>${formatMoney(item.total)}</strong>
        <span>${formatPercent(item.percent)}</span>
      </div>
    </div>
  `).join('');
}

async function loadDashboard() {
  const year = parseInt(yearSelect.value, 10);
  document.getElementById('yearLabel').textContent = year;

  const [data, categoryList, report] = await Promise.all([
    api(`/dashboard/year?year=${year}`),
    api('/categories?type=EXPENSE'),
    api(`/reports?year=${year}`),
  ]);

  const colorMap = buildCategoryColorMap(categoryList);

  document.getElementById('totalReceita').textContent = formatMoney(data.totals.receitaBruta);
  document.getElementById('totalDespesas').textContent = formatMoney(data.totals.totalDespesas);
  document.getElementById('totalSobra').textContent = formatMoney(data.totals.tendenciaSobra);

  document.getElementById('monthsTable').innerHTML = data.months.map((m, i) => `
    <tr>
      <td>${MONTHS[i]}</td>
      <td>${formatMoney(m.receitaBruta)}</td>
      <td>${formatMoney(m.totalDespesas)}</td>
      <td>${formatMoney(m.gastosEssenciais)}</td>
      <td>${formatMoney(m.gastosDividas)}</td>
      <td>${formatMoney(m.gastosCartoes)}</td>
      <td class="${m.tendenciaSobra >= 0 ? 'text-green' : 'text-red'}">${formatMoney(m.tendenciaSobra)}</td>
      <td><a class="btn-link" href="/mes.html?month=${m.month}&year=${m.year}">Abrir</a></td>
    </tr>
  `).join('');

  renderCategoryBreakdown(report.categories, colorMap);
  renderChart(data.months);
}

yearSelect.addEventListener('change', loadDashboard);

async function init() {
  initYearSelect();
  try {
    const user = await api('/me');
    document.getElementById('userGreeting').textContent = user.name || user.email;
    await loadDashboard();
  } catch {
    logout();
  }
}

init();
