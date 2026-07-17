const TOKEN_KEY = 'financeflow_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    throw new Error('Servidor indisponível. Inicie com npm start e acesse http://localhost:3000');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { message: 'Resposta inválida do servidor. Reinicie o FinanceFlow (npm start).' };
  }

  if (!res.ok) {
    throw new Error(data.message || `Erro HTTP ${res.status}`);
  }

  return data;
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

function logout() {
  clearToken();
  window.location.href = '/';
}
