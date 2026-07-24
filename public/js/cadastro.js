// Redireciona se já logado
if (getToken()) {
  window.location.href = '/dashboard.html';
}

const form = document.getElementById('registerForm');
const errorBox = document.getElementById('errorBox');
const submitBtn = document.getElementById('submitBtn');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('hidden');

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!name || !email || !password) {
    showError('Preencha nome, email e senha');
    return;
  }
  if (password.length < 6) {
    showError('A senha deve ter pelo menos 6 caracteres');
    return;
  }
  if (password !== confirmPassword) {
    showError('As senhas não coincidem');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Cadastrando...';

  try {
    const data = await api('/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    setToken(data.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    showError(err.message || 'Erro ao cadastrar');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Cadastrar';
  }
});
