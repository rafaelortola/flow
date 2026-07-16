import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CashService } from './cash.service';
import { CreateCashEntryDto } from './dto/cash.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.cashService.findAll(user.userId, query.page, query.limit);
  }

  @Get('balance')
  getBalance(@CurrentUser() user: AuthUser) {
    return this.cashService.getBalance(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCashEntryDto) {
    return this.cashService.create(user.userId, dto);
  }
}
