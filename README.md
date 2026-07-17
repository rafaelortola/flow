# FinanceFlow v2

Controle financeiro pessoal baseado na planilha **Planejamento Financeiro 2026**.

**Stack:** HTML + CSS + JavaScript + Node.js + PostgreSQL

## Funcionalidades

- Login com JWT
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
npm run dev
```

Abra: **http://localhost:3000**

**Login demo:** `demo@financeflow.com` / `demo123456`

## Navegação

| Página | URL |
|--------|-----|
| Login | `/` |
| Dashboard anual | `/dashboard.html` |
| Controle mensal | `/mes.html` |

## API

| Rota | Descrição |
|------|-----------|
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
