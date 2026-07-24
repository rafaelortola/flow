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
 */
async function seedDefaultCategories(userId, queryFn = db.query.bind(db)) {
  for (const name of EXPENSE_CATEGORIES) {
    const exists = await queryFn(
      `SELECT id FROM categories WHERE "userId" = $1 AND name = $2`,
      [userId, name],
    );
    if (exists.rowCount === 0) {
      await queryFn(
        `INSERT INTO categories (id, "userId", name, type, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'EXPENSE', NOW(), NOW())`,
        [crypto.randomUUID(), userId, name],
      );
    }
  }

  for (const name of INCOME_CATEGORIES) {
    const exists = await queryFn(
      `SELECT id FROM categories WHERE "userId" = $1 AND name = $2`,
      [userId, name],
    );
    if (exists.rowCount === 0) {
      await queryFn(
        `INSERT INTO categories (id, "userId", name, type, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'INCOME', NOW(), NOW())`,
        [crypto.randomUUID(), userId, name],
      );
    }
  }
}

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  seedDefaultCategories,
};
