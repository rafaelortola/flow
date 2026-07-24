# FinanceFlow v2

Controle financeiro pessoal baseado na planilha **Planejamento Financeiro 2026**.

**Stack:** HTML + CSS + JavaScript + Node.js + PostgreSQL

## Funcionalidades

- Login com JWT
- Cadastro de novo usuário
- **Dashboard anual** — resumo dos 12 meses + gráfico de sobra
- **Controle mensal** — clone funcional da aba mensal da planilha:
  - Recebíveis (Biz, EDS, DB4SERV, etc.)
  - Gastos Fixos Essenciais / Não Essenciais
  - Gastos de Dívidas e Cartões
  - Planejamento (notas do mês)
  - Marcar Pago/Não pago com um clique
- **Importação** dos dados de Junho/2026 da planilha original

## Setup (Windows)

### 1. Configure o `.env`

```powershell
copy .env.example .env
notepad .env
```

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/financeflow
JWT_SECRET=change-me-jwt-secret-min-32-characters
PORT=3000
```

### 2. Instale, crie tabelas e importe a planilha

```powershell
npm install
npm run setup
npm run import
```

### 3. Rode

```powershell
git pull origin main
npm install
npm run dev
```

Abra: **http://localhost:3000/mes.html**

**Login demo:** `demo@financeflow.com` / `demo123456`

### Porta 3000 ocupada?

Se aparecer `EADDRINUSE`, outro Node ainda está rodando. No PowerShell:

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm run dev
```

Ou use outra porta no `.env`: `PORT=3002`

## Navegação

| Página | URL |
|--------|-----|
| Login | `/` |
| Cadastro | `/cadastro.html` |
| Dashboard anual | `/dashboard.html` |
| Controle mensal | `/mes.html` |

## API

| Rota | Descrição |
|------|-----------|
| `POST /api/register` | Cadastro (nome, email, senha) |
| `POST /api/login` | Login |
| `GET /api/dashboard/year?year=2026` | Resumo anual |
| `GET /api/dashboard/month?month=6&year=2026` | Resumo mensal |
| `GET/POST/PATCH/DELETE /api/incomes` | Recebíveis |
| `GET/POST/PATCH/DELETE /api/expenses` | Despesas |
| `PATCH /api/expenses/:id/status` | Alternar status |
| `GET/PUT /api/notes` | Notas de planejamento |
| `GET /api/categories` | Categorias |

## Estrutura

```
public/           HTML, CSS, JS
routes/           API (auth, incomes, expenses, dashboard...)
scripts/
  setup-db.js     Cria schema + categorias + demo
  import-spreadsheet.js  Importa Junho/2026
data/
  planilha-modelo.xlsx   Planilha original
server.js           Servidor Express
db.js               PostgreSQL
```

## Fase 2 (próximos módulos)

- FIIs / investimentos
- Pet, DARF, Lista de Desejos
- Import Julho–Dezembro
- Planejado vs Real (Mostruário)
