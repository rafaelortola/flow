import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashEntryDto } from './dto/cash.dto';
import { paginate, paginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, page = 1, limit = 20) {
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.cashEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        ...paginate(page, limit),
      }),
      this.prisma.cashEntry.count({ where }),
    ]);
    return { data, meta: paginationMeta(total, page, limit) };
  }

  async getBalance(userId: string) {
    const latest = await this.prisma.cashEntry.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return { balance: latest ? Number(latest.balance) : 0 };
  }

  async create(userId: string, dto: CreateCashEntryDto) {
    const latest = await this.prisma.cashEntry.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    const currentBalance = latest ? Number(latest.balance) : 0;
    const delta = dto.type === 'IN' ? dto.amount : -dto.amount;
    const balance = currentBalance + delta;

    return this.prisma.cashEntry.create({
      data: {
        userId,
        type: dto.type,
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.description,
        balance,
      },
    });
  }
}
