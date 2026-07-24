---
name: controle-mensal
description: Implementa ou corrige funcionalidades do Controle Mensal (mes.html, mes.js), modais de despesa/recebível, grids e abas de cartão.
paths:
  - public/mes.html
  - public/js/mes.js
  - routes/expenses.js
  - routes/cards.js
  - lib/card-invoices.js
  - lib/card-limits.js
  - lib/sync-card-expenses.js
---

# Controle Mensal — FinanceFlow

## Contexto

- Página principal: `public/mes.html` + `public/js/mes.js`
- Grupos de despesa: `essential`, `nonessential`, `debt`, `card`
- Cartões: abas por cartão, compras vs placeholder de fatura (`isInvoicePlaceholder` em `lib/card-invoices.js`)
- Modal compartilhado: campos com classe `hidden` precisam de CSS específico em `.modal-content label.hidden`

## Convenções

- Labels e textos de UI em **português**
- Formatação monetária: `formatMoney()` / locale `pt-BR`
- Branch de feature: `cursor/<descricao>-591b`
- Não duplicar lógica de fatura — reutilizar `lib/card-invoices.js` e `lib/month-summary.js`

## Ao alterar modais de cartão

- Modo **fatura**: placeholder (nome = cartão, sem parcelamento)
- Modo **compra**: nome, categoria, tipo da dívida, quantidade de parcelas (só se Parcelado)
- `isCardInvoiceItem()` em `mes.js` distingue fatura de compra

## Checklist antes de concluir

- [ ] Selectors de mês/ano atualizam dados ao clicar Atualizar
- [ ] Tipo da dívida oculta/mostra quantidade de parcelas corretamente
- [ ] Fatura do cartão bate com total das compras na tabela
