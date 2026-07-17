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
  yearSelect.value = '2026';
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

async function loadDashboard() {
  const year = parseInt(yearSelect.value, 10);
  document.getElementById('yearLabel').textContent = year;

  const data = await api(`/dashboard/year?year=${year}`);

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
