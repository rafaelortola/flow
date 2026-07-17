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

## Configuração (já incluída no projeto)

O arquivo [`.cursor/mcp.json`](../.cursor/mcp.json) aponta para [`scripts/mcp-postgres.js`](../scripts/mcp-postgres.js), que lê o `.env` e inicia o MCP **sem colocar senha no JSON**.

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
| MCP vermelho / offline | Verifique se Postgres está rodando e `DATABASE_URL` no `.env` |
| `DATABASE_URL not found` | Rode `copy .env.example .env` e preencha |
| IA não usa o MCP | Confirme Cursor Desktop + MCP ligado + reinicie a janela |
| Cloud Agent não consulta | Normal — use Cursor na sua máquina |

## Teste manual no terminal

```powershell
node scripts/mcp-postgres.js
```

Se não der erro imediato, o MCP está conseguindo conectar (o processo fica aguardando stdio — use Ctrl+C para sair).
