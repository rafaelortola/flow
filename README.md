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

### Setup

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm --filter @financeflow/database migrate:deploy
pnpm db:seed
pnpm dev
```

**PostgreSQL local:** crie o banco e ajuste `DATABASE_URL` no `.env`:

```sql
CREATE USER financeflow WITH PASSWORD 'financeflow';
CREATE DATABASE financeflow OWNER financeflow;
```

```env
DATABASE_URL=postgresql://financeflow:financeflow@localhost:5432/financeflow
```

**Windows + pnpm 11:** se aparecer `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, o projeto já inclui `minimumReleaseAge: 0` em `pnpm-workspace.yaml`. Atualize o repositório (`git pull`) e rode `pnpm install` de novo.

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1

### Usuário demo

- Email: `demo@financeflow.com`
- Senha: `demo123456`

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
