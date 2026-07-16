import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, from?: string, to?: string) {
    const now = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const dateFilter = { gte: start, lte: end };

    const [
      incomeAgg,
      expenseAgg,
      debtAgg,
      investmentAgg,
      latestCash,
      expenseByCategory,
    ] = await Promise.all([
      this.prisma.income.aggregate({
        where: { userId, date: dateFilter },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, date: dateFilter },
        _sum: { amount: true },
      }),
      this.prisma.debt.aggregate({
        where: { userId },
        _sum: { remaining: true, totalAmount: true },
      }),
      this.prisma.investment.aggregate({
        where: { userId },
        _sum: { currentValue: true, amount: true },
      }),
      this.prisma.cashEntry.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId, date: dateFilter },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);

    const categories = await this.prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return {
      period: { from: start, to: end },
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      totalDebtRemaining: Number(debtAgg._sum.remaining ?? 0),
      totalDebt: Number(debtAgg._sum.totalAmount ?? 0),
      totalInvestments: Number(investmentAgg._sum.currentValue ?? 0),
      totalInvested: Number(investmentAgg._sum.amount ?? 0),
      cashBalance: latestCash ? Number(latestCash.balance) : 0,
      expensesByCategory: expenseByCategory.map((item) => ({
        categoryId: item.categoryId,
        category: item.categoryId ? categoryMap.get(item.categoryId) : null,
        total: Number(item._sum.amount ?? 0),
      })),
    };
  }
}
