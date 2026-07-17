// Redireciona se já logado
if (getToken()) {
  window.location.href = '/dashboard.html';
}

const form = document.getElementById('loginForm');
const errorBox = document.getElementById('errorBox');
const submitBtn = document.getElementById('submitBtn');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Entrando...';

  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const data = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setToken(data.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    showError(err.message || 'Erro ao entrar');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }
});

// Preenche demo ao clicar no hint
document.querySelector('.hint')?.addEventListener('click', () => {
  document.getElementById('email').value = 'demo@financeflow.com';
  document.getElementById('password').value = 'demo123456';
});
