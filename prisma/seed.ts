import { PrismaClient, CategoryType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo123456', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@financeflow.com' },
    update: {
      passwordHash,
      name: 'Usuário Demo',
    },
    create: {
      email: 'demo@financeflow.com',
      passwordHash,
      name: 'Usuário Demo',
    },
  });

  const salaryCategory = await prisma.category.upsert({
    where: { id: 'seed-salary-category' },
    update: {},
    create: {
      id: 'seed-salary-category',
      userId: user.id,
      name: 'Salário',
      type: CategoryType.INCOME,
      color: '#22c55e',
    },
  });

  const foodCategory = await prisma.category.upsert({
    where: { id: 'seed-food-category' },
    update: {},
    create: {
      id: 'seed-food-category',
      userId: user.id,
      name: 'Alimentação',
      type: CategoryType.EXPENSE,
      color: '#ef4444',
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.income.createMany({
    data: [
      {
        userId: user.id,
        categoryId: salaryCategory.id,
        amount: 8500,
        date: monthStart,
        description: 'Salário mensal',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.expense.createMany({
    data: [
      {
        userId: user.id,
        categoryId: foodCategory.id,
        amount: 450,
        date: monthStart,
        description: 'Supermercado',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed:', { user: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
