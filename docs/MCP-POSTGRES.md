# MCP Postgres — FinanceFlow

Conecta o **Cursor Desktop** ao seu PostgreSQL local via [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

## O que a IA consegue fazer

| Ferramenta | Descrição |
|------------|-----------|
| `query` | Executar SQL **somente leitura** (SELECT) |
| Recursos | Ver schema das tabelas (`users`, `incomes`, `expenses`, etc.) |

> **Importante:** o servidor oficial `@modelcontextprotocol/server-postgres` é **read-only**.  
> Para INSERT/UPDATE/DELETE automáticos pela IA, seria necessário um MCP customizado (opção 2).

## Pré-requisitos

1. **Cursor Desktop** (não funciona no Cloud Agent — ele não acessa seu `localhost`)
2. PostgreSQL local rodando
3. Arquivo `.env` na raiz com `DATABASE_URL` (mesmo do FinanceFlow)

```env
DATABASE_URL=postgresql://financeflow:financeflow@localhost:5432/financeflow
```

## Configuração

### Opção A — Projeto (recomendado)

Depois do `git pull`, o arquivo [`.cursor/mcp.json`](../.cursor/mcp.json) **já vem no repositório**.  
Abra a pasta `flow` no Cursor — **não precisa** copiar nada para `C:\Users\Pichau\.cursor\mcp.json`.

### Opção B — Global (`~/.cursor/mcp.json`)

Se colocar no MCP **global** do Windows, use **caminho absoluto** (caminho relativo `scripts/...` **não funciona**):

```json
{
  "mcpServers": {
    "financeflow-postgres": {
      "command": "node",
      "args": ["C:/Users/Pichau/Documents/flow/scripts/mcp-postgres.js"]
    }
  }
}
```

> Ajuste o caminho se seu clone estiver em outro lugar.

### Ativar no Cursor

1. Abra o projeto `flow` no **Cursor Desktop**
2. **Settings** → **Features** → **MCP** (ou **Tools & MCP**)
3. Confirme que `financeflow-postgres` aparece e está **ligado** (verde)
4. Se não aparecer: **Reload Window** (`Ctrl+Shift+P` → "Developer: Reload Window")

## Testar

No chat do Cursor, peça algo como:

- "Liste as tabelas do banco financeflow"
- "Quantos usuários existem na tabela users?"
- "Mostre as últimas 5 despesas do usuário demo"

A IA usará a ferramenta MCP `query` automaticamente.

## Configuração global (opcional)

Para usar em **todos** os projetos, copie para:

- **Windows:** `C:\Users\SEU_USUARIO\.cursor\mcp.json`
- **Mac/Linux:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "financeflow-postgres": {
      "command": "node",
      "args": ["C:/Users/Pichau/Documents/flow/scripts/mcp-postgres.js"]
    }
  }
}
```

(Ajuste o caminho absoluto do seu clone.)

## Segurança

- Não commite `.env` (já está no `.gitignore`)
- O MCP oficial roda queries em transação **READ ONLY**
- Para produção, use usuário Postgres com permissão só leitura

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `Cannot find module ... mcp-postgres.js` | Você não está na pasta do projeto. Rode `cd C:\Users\Pichau\Documents\flow` primeiro, **ou** use caminho absoluto no MCP global |
| MCP vermelho / offline | Verifique se Postgres está rodando e `DATABASE_URL` no `.env` |
| `DATABASE_URL not found` | Rode `copy .env.example .env` e preencha |
| IA não usa o MCP | Confirme Cursor Desktop + MCP ligado + reinicie a janela |
| Cloud Agent não consulta | Normal — use Cursor na sua máquina |

## Teste manual no terminal

**Tem que estar na pasta do projeto:**

```powershell
cd C:\Users\Pichau\Documents\flow
pnpm mcp:postgres:check
pnpm mcp:postgres
```

Ou:

```powershell
cd C:\Users\Pichau\Documents\flow
node scripts/mcp-postgres.js
```

Se rodar de `C:\Users\Pichau>` vai dar `Cannot find module` — isso é normal.

O processo fica aguardando (stdio). **Ctrl+C** para sair. Se conectou, não aparece erro de `DATABASE_URL`.
