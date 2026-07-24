---
name: revisao-valores
description: Audita somatórias de cartões, despesas Mensal (12 meses) e Parcelado em todos os meses do FinanceFlow. Invocável com /revisao-valores.
paths:
  - lib/validate-values.js
  - scripts/validate-values.js
  - lib/card-invoices.js
  - lib/card-limits.js
  - lib/month-summary.js
  - public/js/mes.js
  - public/js/ui-helpers.js
---

# Revisão de Valores — FinanceFlow

## Objetivo

Garantir que todas as somatórias e recorrências estão corretas em **todos os meses** com dados no banco.

## Execução rápida

```bash
npm run validate
npm run validate -- --json
npm run validate -- --email demo@financeflow.com
```

Exit code: `0` = OK, `1` = problemas encontrados, `2` = erro de execução.

## Checklist de validação

### Cartões
- [ ] Fatura = soma das compras (sem placeholder)
- [ ] Placeholder zerado quando há compras
- [ ] Todos os meses com movimentação verificados

### Mensal
- [ ] 12 despesas consecutivas a partir do mês inicial
- [ ] `debt_type = 'Mensal'`, sem campos de parcelamento

### Parcelado
- [ ] N parcelas nos N meses consecutivos corretos
- [ ] `debt_type = 'Parcelado'`
- [ ] Labels: `1 de N`, …, `Última Parcela`

### Resumo mensal
- [ ] `totalDespesas` bate com grupos + faturas

## Subagente relacionado

Delegue auditorias extensas ao subagente `revisão de valores` (`.cursor/agents/revisao-valores.md`).
