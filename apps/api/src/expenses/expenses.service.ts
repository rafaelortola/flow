import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expenses.dto';
import { paginate, paginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, page = 1, limit = 20, from?: string, to?: string) {
    const where = {
      userId,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, meta: paginationMeta(total, page, limit) };
  }

  create(userId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        userId,
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.description,
        categoryId: dto.categoryId,
      },
      include: { category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    await this.ensureOwned(userId, id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    return this.prisma.expense.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, userId } });
    if (!expense) throw new NotFoundException('Despesa não encontrada');
    return expense;
  }
}
