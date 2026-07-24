# Cursor — Agentes, Subagentes e Skills

Esta pasta centraliza a customização do Agent do Cursor para o **FinanceFlow**.

## Estrutura

```text
.cursor/
├── README.md          # Este guia
├── agents/            # Subagentes customizados (delegação de tarefas)
├── skills/            # Skills (workflows reutilizáveis, invocáveis com /)
├── rules/             # Regras do projeto (.mdc)
└── mcp.json           # (opcional) servidores MCP do projeto
```

## Subagentes (`.cursor/agents/`)

Subagentes são assistentes especializados que o Agent principal pode delegar. Cada um roda em contexto isolado.

- Crie um arquivo `.md` com frontmatter YAML (`name`, `description`, `model`, etc.)
- Invocação: o Agent delega automaticamente quando relevante, ou peça explicitamente
- Documentação: https://cursor.com/docs/subagents

Exemplo incluído: `agents/revisor-financeflow.md`

## Skills (`.cursor/skills/`)

Skills ensinam o Agent a executar tarefas específicas. Podem ser invocadas com `/nome-da-skill` no chat.

- Cada skill é uma pasta com `SKILL.md` (obrigatório)
- Opcional: `scripts/`, `references/`, `assets/`
- Documentação: https://cursor.com/docs/skills

Exemplo incluído: `skills/controle-mensal/SKILL.md`

## Regras (`.cursor/rules/`)

Regras injetam instruções persistentes no contexto do Agent.

- Arquivos `.mdc` com frontmatter (`description`, `globs`, `alwaysApply`)
- Documentação: https://cursor.com/docs/rules

Exemplo incluído: `rules/financeflow-stack.mdc`

## Dicas rápidas

| Ação | Comando no chat |
|------|-----------------|
| Criar skill | `/create-skill` |
| Criar subagente | `/create-subagent` |
| Criar regra | `/create-rule` |
| Migrar regras antigas | `/migrate-to-skills` |

## Escopo

| Pasta | Visível no repositório | Escopo |
|-------|------------------------|--------|
| `.cursor/agents/` | Sim (commit no git) | Time / projeto |
| `.cursor/skills/` | Sim | Time / projeto |
| `.cursor/rules/` | Sim | Time / projeto |
| `~/.cursor/agents/` | Não (máquina local) | Só você |
| `~/.cursor/skills/` | Não | Só você |
