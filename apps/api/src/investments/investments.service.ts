import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestmentDto, UpdateInvestmentDto } from './dto/investments.dto';

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.investment.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  create(userId: string, dto: CreateInvestmentDto) {
    return this.prisma.investment.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        amount: dto.amount,
        currentValue: dto.currentValue,
        date: new Date(dto.date),
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto) {
    await this.ensureOwned(userId, id);
    return this.prisma.investment.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    return this.prisma.investment.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string) {
    const investment = await this.prisma.investment.findFirst({ where: { id, userId } });
    if (!investment) throw new NotFoundException('Investimento não encontrado');
    return investment;
  }
}
