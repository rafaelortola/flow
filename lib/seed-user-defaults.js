const crypto = require('crypto');
const db = require('../db');

const EXPENSE_CATEGORIES = [
  'Moradia', 'Pet', 'Investimentos', 'Lanche', 'Empréstimos', 'Uber', 'Reajuste',
  'Saúde', 'Pagamentos', 'Acordo / Dívidas', 'Supermercado', 'Débito Avulso',
  'Presente', 'Vestuário', 'Despesas Rafael', 'Cartão de Crédito', 'Alimentação',
  'Assinatura', 'Salão de Beleza', 'Veículos', 'Compras Casa', 'Lazer', 'Impostos PJ',
  'Combustível', 'Viagem', 'Farmácia', 'Doação', 'Débito à Vista', 'Crédito à Vista',
  'Mesada Duda', 'Pedágio', 'Despesas Duda', 'Anuidade Cartão', 'Juros Cartão',
  'Despesas Erika', 'Ifood', 'C&A', 'Marcado Livre', 'Shoppe', 'Renner', 'Riachuelo',
  'Educação',
];

const INCOME_CATEGORIES = [
  'Salário', 'Freelance', 'Biz', 'EDS', 'DB4SERV', 'Empréstimo', 'Outros',
];

/**
 * Cria categorias padrão para um usuário novo.
 * Usa UUIDs para o id (PK global), evitando conflito entre usuários.
 * color/updatedAt explícitos para compatibilidade com schema Prisma legado.
 */
async function seedDefaultCategories(userId, queryFn = db.query.bind(db)) {
  const rows = [
    ...EXPENSE_CATEGORIES.map((name) => ({ name, type: 'EXPENSE' })),
    ...INCOME_CATEGORIES.map((name) => ({ name, type: 'INCOME' })),
  ];

  for (const row of rows) {
    const exists = await queryFn(
      `SELECT id FROM categories WHERE "userId" = $1 AND name = $2`,
      [userId, row.name],
    );
    if (exists.rowCount > 0) continue;

    await queryFn(
      `INSERT INTO categories (id, "userId", name, type, color, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [crypto.randomUUID(), userId, row.name, row.type, '#6366f1'],
    );
  }
}

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  seedDefaultCategories,
};
