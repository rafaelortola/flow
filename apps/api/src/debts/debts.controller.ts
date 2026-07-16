import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { CreateDebtDto, MarkInstallmentPaidDto, UpdateDebtDto } from './dto/debts.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.debtsService.findAll(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDebtDto,
  ) {
    return this.debtsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.debtsService.remove(user.userId, id);
  }

  @Patch(':debtId/installments/:installmentId')
  markInstallment(
    @CurrentUser() user: AuthUser,
    @Param('debtId') debtId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: MarkInstallmentPaidDto,
  ) {
    return this.debtsService.markInstallment(user.userId, debtId, installmentId, dto);
  }
}
