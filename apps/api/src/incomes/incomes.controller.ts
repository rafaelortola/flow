import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IncomesService } from './incomes.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/incomes.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { DateRangeQueryDto } from '../common/dto/pagination.dto';

@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    return this.incomesService.findAll(user.userId, query.page, query.limit, query.from, query.to);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateIncomeDto) {
    return this.incomesService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ) {
    return this.incomesService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.incomesService.remove(user.userId, id);
  }
}
