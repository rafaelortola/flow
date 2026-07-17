function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrencyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return NaN;
  return parseInt(digits, 10) / 100;
}

function formatCurrencyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return formatMoney(parseInt(digits, 10) / 100);
}

function bindCurrencyInput(input) {
  if (!input) return;

  input.addEventListener('input', () => {
    input.value = formatCurrencyInput(input.value);
  });

  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      input.value = formatCurrencyInput('0');
    }
  });

  input.addEventListener('blur', () => {
    const amount = parseCurrencyInput(input.value);
    if (!Number.isFinite(amount) || amount < 0.01) {
      input.value = '';
      return;
    }
    input.value = formatCurrencyInput(input.value);
  });
}
