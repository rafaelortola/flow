if (!requireAuth()) throw new Error('redirect');

document.getElementById('logoutBtn').addEventListener('click', logout);

function formatMoney(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function loadDashboard() {
  try {
    const user = await api('/me');
    document.getElementById('userName').textContent = user.email;
    document.getElementById('userGreeting').textContent = user.name || user.email;
  } catch {
    logout();
    return;
  }

  try {
    const dash = await api('/dashboard');
    document.getElementById('totalIncome').textContent = formatMoney(dash.totalIncome);
    document.getElementById('totalExpense').textContent = formatMoney(dash.totalExpense);
    document.getElementById('balance').textContent = formatMoney(dash.balance);
    document.getElementById('categories').textContent = dash.categories;
  } catch {
    // Dashboard vazio se tabelas extras não existirem
  }
}

loadDashboard();
