# FinanceFlow v2

Projeto **simples**: HTML + CSS + JavaScript + Node.js + PostgreSQL.

Sem monorepo, sem Next.js, sem NestJS, sem Prisma.

## Stack

- **Frontend:** HTML, CSS, JavaScript (pasta `public/`)
- **Backend:** Node.js + Express (`server.js`)
- **Banco:** PostgreSQL (`financeflow`)

## Setup (Windows)

### 1. Configure o `.env`

```powershell
copy .env.example .env
notepad .env
```

Coloque a senha do **postgres**:

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/financeflow
JWT_SECRET=change-me-jwt-secret-min-32-characters
PORT=3000
```

### 2. Instale e prepare o banco

```powershell
npm install
npm run setup
```

### 3. Rode o projeto

```powershell
npm run dev
```

Abra: **http://localhost:3000**

### Login demo

- **Email:** `demo@financeflow.com`
- **Senha:** `demo123456`

## Estrutura

```
public/          HTML, CSS, JS
server.js        API + serve arquivos estáticos
db.js            Conexão PostgreSQL
scripts/         setup-db.js
```

## API

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/health` | GET | Testa servidor + banco |
| `/api/login` | POST | Login (email + senha) |
| `/api/me` | GET | Usuário logado |
| `/api/dashboard` | GET | Resumo financeiro |
