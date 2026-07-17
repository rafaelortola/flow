# FinanceFlow

Sistema SaaS de controle financeiro pessoal.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn-style UI
- **Backend:** NestJS REST API
- **Database:** PostgreSQL + Prisma (na raiz, estilo JANIN)
- **Auth:** JWT + Refresh Token (HttpOnly cookie)

## Módulos

- Login / Cadastro
- Dashboard
- Receitas, Despesas, Categorias
- Dívidas, Parcelamentos
- Investimentos, Caixa
- Relatórios (PDF, Excel, CSV)
- Perfil

## Desenvolvimento local (Windows)

### 3 passos — igual JANIN

1. **Crie o banco** no pgAdmin ou psql:
   ```sql
   CREATE DATABASE financeflow;
   ```

2. **Configure o `.env`:**
   ```powershell
   copy .env.example .env
   ```
   Edite e coloque a senha do **postgres**:
   ```env
   DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/financeflow
   ```

3. **Instale e rode:**
   ```powershell
   pnpm install
   pnpm setup
   pnpm dev
   ```

**Login demo:** `demo@financeflow.com` / `demo123456`

### Setup automático (Windows)

Se preferir que o script faça tudo (cria banco, .env, push, seed):

```powershell
.\scripts\setup-all.ps1 -PostgresPassword "SUA_SENHA_DO_POSTGRES"
```

### URLs

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1

### Troubleshooting

| Problema | Solução |
|----------|---------|
| `role "financeflow" does not exist` | Use `postgres` no `.env` (não precisa criar usuário extra) |
| `Failed to fetch` / não conecta à API | A API não subiu. Rode `pnpm dev:api` e espere `API OK`. Teste: http://localhost:3001/api/v1/health |
| Porta 3001 em uso | Mude `PORT=3002` no `.env` e `NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1` |
| Senha com `@` ou `#` no postgres | Encode na URL: `@` → `%40`, `#` → `%23` |
| Frontend em outra porta (3002) | Normal se 3000 estiver ocupada — CORS aceita qualquer localhost |

## MCP Postgres (Cursor Desktop)

Veja [docs/MCP-POSTGRES.md](docs/MCP-POSTGRES.md).

## Docker (stack completa)

```bash
docker compose up --build
```

## Testes

```bash
pnpm test
pnpm --filter @financeflow/api test:e2e
```

## Estrutura

```
prisma/          Schema, seed e migrations
apps/
  api/           NestJS backend
  web/           Next.js frontend
```
