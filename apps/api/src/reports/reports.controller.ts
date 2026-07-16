import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getReport(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getReportData(user.userId, from, to);
  }

  @Get('export')
  async exportReport(
    @CurrentUser() user: AuthUser,
    @Query('format') format: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const fmt = (format ?? 'csv').toLowerCase();
    const timestamp = new Date().toISOString().slice(0, 10);

    if (fmt === 'csv') {
      const content = await this.reportsService.exportCsv(user.userId, from, to);
      return this.reportsService.sendExport(res, 'csv', `relatorio-${timestamp}.csv`, content);
    }
    if (fmt === 'xlsx') {
      const content = await this.reportsService.exportExcel(user.userId, from, to);
      return this.reportsService.sendExport(res, 'xlsx', `relatorio-${timestamp}.xlsx`, content);
    }
    if (fmt === 'pdf') {
      const content = await this.reportsService.exportPdf(user.userId, from, to);
      return this.reportsService.sendExport(res, 'pdf', `relatorio-${timestamp}.pdf`, content);
    }

    const content = await this.reportsService.exportCsv(user.userId, from, to);
    return this.reportsService.sendExport(res, 'csv', `relatorio-${timestamp}.csv`, content);
  }
}
