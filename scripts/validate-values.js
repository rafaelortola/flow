#!/usr/bin/env node
/**
 * Valida somatórias de cartões, despesas Mensal (12 meses) e Parcelado (parcelas corretas).
 *
 * Uso:
 *   npm run validate
 *   npm run validate -- --email demo@financeflow.com
 *   npm run validate -- --json
 */
require('dotenv').config();
const { validateValues, resolveUserId } = require('../lib/validate-values');

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };
const SEVERITY_LABEL = { critical: 'Crítico', high: 'Alto', medium: 'Médio' };

function parseArgs(argv) {
  const args = { email: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--email' && argv[i + 1]) {
      args.email = argv[++i];
    } else if (argv[i] === '--json') {
      args.json = true;
    }
  }
  return args;
}

function printHumanReport(report) {
  console.log('\n=== Revisão de Valores — FinanceFlow ===\n');
  console.log(`Usuário: ${report.userId}`);
  console.log(`Períodos verificados: ${report.periodsChecked}`);
  console.log(`Problemas: ${report.issueCount} (Crítico: ${report.bySeverity.critical}, Alto: ${report.bySeverity.high}, Médio: ${report.bySeverity.medium})\n`);

  if (report.ok) {
    console.log('OK — Nenhuma inconsistência encontrada.\n');
    return;
  }

  const sorted = [...report.issues].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );

  for (const issue of sorted) {
    const label = SEVERITY_LABEL[issue.severity] || issue.severity;
    console.log(`[${label}] ${issue.category}: ${issue.message}`);
  }

  console.log('\nCorrija os itens acima no código ou nos dados e execute novamente: npm run validate\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const userId = await resolveUserId(args.email);

  if (!userId) {
    console.error('Usuário não encontrado. Rode npm run setup ou informe --email.');
    process.exit(1);
  }

  const report = await validateValues(userId);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  const msg = err.message || String(err);
  if (!msg || msg.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
    console.error('Erro na validação: banco de dados indisponível. Configure DATABASE_URL no .env e rode npm run setup.');
  } else {
    console.error('Erro na validação:', msg);
  }
  process.exit(2);
});
