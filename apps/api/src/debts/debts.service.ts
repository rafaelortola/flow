import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtDto, MarkInstallmentPaidDto, UpdateDebtDto } from './dto/debts.dto';

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.debt.findMany({
      where: { userId },
      include: { installments: { orderBy: { number: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateDebtDto) {
    const installmentsCount = dto.installments ?? 1;
    const installmentAmount = dto.totalAmount / installmentsCount;
    const baseDate = dto.dueDate ? new Date(dto.dueDate) : new Date();

    return this.prisma.debt.create({
      data: {
        userId,
        creditor: dto.creditor,
        totalAmount: dto.totalAmount,
        remaining: dto.totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        description: dto.description,
        installments: {
          create: Array.from({ length: installmentsCount }, (_, i) => ({
            number: i + 1,
            amount: installmentAmount,
            dueDate: new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate()),
          })),
        },
      },
      include: { installments: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateDebtDto) {
    await this.ensureOwned(userId, id);
    return this.prisma.debt.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
      },
      include: { installments: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    return this.prisma.debt.delete({ where: { id } });
  }

  async markInstallment(userId: string, debtId: string, installmentId: string, dto: MarkInstallmentPaidDto) {
    await this.ensureOwned(userId, debtId);
    const installment = await this.prisma.installment.findFirst({
      where: { id: installmentId, debtId },
    });
    if (!installment) throw new NotFoundException('Parcela não encontrada');

    const paid = dto.paid ?? true;
    const updated = await this.prisma.installment.update({
      where: { id: installmentId },
      data: { paid, paidAt: paid ? new Date() : null },
    });

    if (paid && !installment.paid) {
      await this.prisma.debt.update({
        where: { id: debtId },
        data: { remaining: { decrement: installment.amount } },
      });
    } else if (!paid && installment.paid) {
      await this.prisma.debt.update({
        where: { id: debtId },
        data: { remaining: { increment: installment.amount } },
      });
    }

    return updated;
  }

  private async ensureOwned(userId: string, id: string) {
    const debt = await this.prisma.debt.findFirst({ where: { id, userId } });
    if (!debt) throw new NotFoundException('Dívida não encontrada');
    return debt;
  }
}
