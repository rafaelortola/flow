import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CategoryType } from '@financeflow/database';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/categories.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('type') type?: CategoryType) {
    return this.categoriesService.findAll(user.userId, type);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriesService.remove(user.userId, id);
  }
}
