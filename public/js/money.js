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
  input.addEventListener('input', () => {
    input.value = formatCurrencyInput(input.value);
  });
}
