# FinanceFlow

Sistema SaaS de controle financeiro pessoal.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn-style UI
- **Backend:** NestJS REST API
- **Database:** PostgreSQL + Prisma
- **Auth:** JWT + Refresh Token (HttpOnly cookie)

## Módulos

- Login / Cadastro
- Dashboard
- Receitas, Despesas, Categorias
- Dívidas, Parcelamentos
- Investimentos, Caixa
- Relatórios (PDF, Excel, CSV)
- Perfil

## Desenvolvimento local

### Pré-requisitos

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL local (sem Docker)

### Windows — conectar BD de uma vez

**Passo 1** (só na primeira vez — cria banco no Postgres):

```powershell
cd C:\Users\Pichau\Documents\flow
git pull origin main
.\scripts\setup-all.ps1 -PostgresPassword "SUA_SENHA_POSTGRES"
```

**Passo 2** (sempre que for desenvolver):

```powershell
pnpm dev
```

O `pnpm dev` agora **conecta ao banco, aplica migrations e cria demo** automaticamente antes de subir API + web.

**Login:** `demo@financeflow.com` / `demo123456`

### Setup manual (passo a passo)

```bash
cp .env.example .env
pnpm install
pnpm --filter @financeflow/database migrate:deploy
pnpm db:seed
pnpm dev
```

> `pnpm install` e `pnpm dev` já rodam `prisma generate` automaticamente. Se a API acusar que `@financeflow/database` não existe, rode: `pnpm db:prepare`

**PostgreSQL local:** crie o banco e ajuste `DATABASE_URL` no `.env`:

```sql
CREATE USER financeflow WITH PASSWORD 'financeflow';
CREATE DATABASE financeflow OWNER financeflow;
```

```env
DATABASE_URL=postgresql://financeflow:financeflow@localhost:5432/financeflow
```

**Failed to fetch:** quase sempre a API não está rodando ou CORS bloqueou a porta do frontend. Confira se `apps/api` subiu em http://localhost:3001/api/v1. Se o Next.js usar outra porta (ex.: 3002), reinicie com `pnpm dev` após `git pull` (CORS em dev aceita qualquer porta localhost).

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1

### Usuário demo

- Email: `demo@financeflow.com`
- Senha: `demo123456`

## MCP Postgres (Cursor Desktop)

Para a IA consultar seu Postgres local diretamente no Cursor, veja [docs/MCP-POSTGRES.md](docs/MCP-POSTGRES.md).

Configuração rápida: `.env` com `DATABASE_URL` → Settings → MCP → ativar `financeflow-postgres`.

## Docker (stack completa)

```bash
docker compose up --build
```

Inclui serviço de backup automático (`pg_dump` diário em `./backups`).

## Testes

```bash
docker compose up db -d
pnpm --filter @financeflow/database migrate:deploy
pnpm test
pnpm --filter @financeflow/api test:e2e
```

## Estrutura

```
apps/
  api/     NestJS backend
  web/     Next.js frontend
packages/
  database/  Prisma schema e client
```
