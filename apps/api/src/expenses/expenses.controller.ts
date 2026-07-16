import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expenses.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { DateRangeQueryDto } from '../common/dto/pagination.dto';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    return this.expensesService.findAll(user.userId, query.page, query.limit, query.from, query.to);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expensesService.remove(user.userId, id);
  }
}
