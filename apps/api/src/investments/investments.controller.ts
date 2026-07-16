import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto, UpdateInvestmentDto } from './dto/investments.dto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.investmentsService.findAll(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestmentDto) {
    return this.investmentsService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    return this.investmentsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.investmentsService.remove(user.userId, id);
  }
}
