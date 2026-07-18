function buildCategoryColorMap(categories) {
  const map = new Map();
  for (const category of categories) {
    if (category.name && category.color) map.set(category.name, category.color);
  }
  return map;
}

function hexToRgba(hex, alpha) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function categoryTag(name, colorMap) {
  if (!name || name === '—') return '—';
  const color = colorMap.get(name);
  if (!color) return name;
  const bg = hexToRgba(color, 0.18) || color;
  const border = hexToRgba(color, 0.45) || color;
  return `<span class="category-tag" style="background:${bg};border-color:${border};color:${color}">${name}</span>`;
}

function getInstallmentDisplay(expense) {
  const info = (expense.installment_info || '').trim();
  const totalFromDb = expense.installment_total != null ? Number(expense.installment_total) : null;

  if (!info && totalFromDb == null) return { text: '—', isLast: false };

  const fullMatch = info.match(/^(\d+)\s*de\s*(\d+)$/i);
  if (fullMatch) {
    const current = parseInt(fullMatch[1], 10);
    const total = parseInt(fullMatch[2], 10);
    if (current === total) return { text: 'Última Parcela', isLast: true };
    return { text: `${current} de ${total}`, isLast: false };
  }

  const partialMatch = info.match(/^(\d+)\s*de\s*$/i);
  if (partialMatch && totalFromDb) {
    const current = parseInt(partialMatch[1], 10);
    if (current === totalFromDb) return { text: 'Última Parcela', isLast: true };
    return { text: `${current} de ${totalFromDb}`, isLast: false };
  }

  if (/^\d+$/.test(info) && totalFromDb) {
    const current = parseInt(info, 10);
    if (current === totalFromDb) return { text: 'Última Parcela', isLast: true };
    return { text: `${current} de ${totalFromDb}`, isLast: false };
  }

  return { text: info || '—', isLast: false };
}

function renderInstallmentCell(expense) {
  const { text, isLast } = getInstallmentDisplay(expense);
  if (text === '—') return '—';
  const cls = isLast ? 'installment-tag installment-last' : 'installment-tag';
  return `<span class="${cls}">${text}</span>`;
}

function renderDebtTypeCell(expense) {
  const debtType = (expense.debt_type || '').trim();
  if (!debtType) return renderInstallmentCell(expense);

  if (debtType.toLowerCase() === 'parcelado') {
    const { text, isLast } = getInstallmentDisplay(expense);
    if (text !== '—') {
      const cls = isLast ? 'installment-tag installment-last' : 'installment-tag';
      return `${debtType} <span class="${cls}">${text}</span>`;
    }
  }

  return debtType;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function cardTag(name, color) {
  if (!name || name === '—') return '—';
  const tagColor = color || '#A855F7';
  const bg = hexToRgba(tagColor, 0.18) || tagColor;
  const border = hexToRgba(tagColor, 0.45) || tagColor;
  return `<span class="category-tag" style="background:${bg};border-color:${border};color:${tagColor}">${name}</span>`;
}

function renderInvoiceClosedBadge(closed) {
  if (closed == null) return '—';
  if (closed) {
    return '<span class="badge badge-neutral">Fechada</span>';
  }
  return '<span class="badge badge-paid">Aberta</span>';
}
