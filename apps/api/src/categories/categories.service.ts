import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType } from '@financeflow/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.ensureOwned(userId, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    return this.prisma.category.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }
}
