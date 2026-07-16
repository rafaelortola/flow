import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/incomes.dto';
import { paginate, paginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class IncomesService {
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
      this.prisma.income.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.income.count({ where }),
    ]);

    return { data, meta: paginationMeta(total, page, limit) };
  }

  create(userId: string, dto: CreateIncomeDto) {
    return this.prisma.income.create({
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

  async update(userId: string, id: string, dto: UpdateIncomeDto) {
    await this.ensureOwned(userId, id);
    return this.prisma.income.update({
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
    return this.prisma.income.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string) {
    const income = await this.prisma.income.findFirst({ where: { id, userId } });
    if (!income) throw new NotFoundException('Receita não encontrada');
    return income;
  }
}
