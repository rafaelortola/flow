import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReportData(userId: string, from?: string, to?: string) {
    const now = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dateFilter = { gte: start, lte: end };

    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({
        where: { userId, date: dateFilter },
        include: { category: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: { userId, date: dateFilter },
        include: { category: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      period: { from: start, to: end },
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomes,
      expenses,
    };
  }

  async exportCsv(userId: string, from?: string, to?: string): Promise<string> {
    const data = await this.getReportData(userId, from, to);
    const lines = [
      'Tipo,Data,Descrição,Categoria,Valor',
      ...data.incomes.map(
        (i) =>
          `Receita,${i.date.toISOString().slice(0, 10)},${this.escapeCsv(i.description ?? '')},${this.escapeCsv(i.category?.name ?? '')},${i.amount}`,
      ),
      ...data.expenses.map(
        (e) =>
          `Despesa,${e.date.toISOString().slice(0, 10)},${this.escapeCsv(e.description ?? '')},${this.escapeCsv(e.category?.name ?? '')},${e.amount}`,
      ),
    ];
    return lines.join('\n');
  }

  async exportExcel(userId: string, from?: string, to?: string): Promise<Buffer> {
    const data = await this.getReportData(userId, from, to);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Relatório');

    sheet.columns = [
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Data', key: 'date', width: 14 },
      { header: 'Descrição', key: 'description', width: 30 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Valor', key: 'amount', width: 14 },
    ];

    for (const i of data.incomes) {
      sheet.addRow({
        type: 'Receita',
        date: i.date.toISOString().slice(0, 10),
        description: i.description ?? '',
        category: i.category?.name ?? '',
        amount: Number(i.amount),
      });
    }
    for (const e of data.expenses) {
      sheet.addRow({
        type: 'Despesa',
        date: e.date.toISOString().slice(0, 10),
        description: e.description ?? '',
        category: e.category?.name ?? '',
        amount: Number(e.amount),
      });
    }

    sheet.addRow({});
    sheet.addRow({ type: 'Total Receitas', amount: data.totalIncome });
    sheet.addRow({ type: 'Total Despesas', amount: data.totalExpense });
    sheet.addRow({ type: 'Saldo', amount: data.balance });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportPdf(userId: string, from?: string, to?: string): Promise<Buffer> {
    const data = await this.getReportData(userId, from, to);
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('FinanceFlow - Relatório', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Período: ${data.period.from.toLocaleDateString('pt-BR')} - ${data.period.to.toLocaleDateString('pt-BR')}`);
      doc.moveDown();
      doc.text(`Total Receitas: R$ ${data.totalIncome.toFixed(2)}`);
      doc.text(`Total Despesas: R$ ${data.totalExpense.toFixed(2)}`);
      doc.text(`Saldo: R$ ${data.balance.toFixed(2)}`);
      doc.moveDown();

      doc.text('Receitas:', { underline: true });
      for (const i of data.incomes) {
        doc.text(
          `${i.date.toLocaleDateString('pt-BR')} - ${i.description ?? 'Sem descrição'} - R$ ${Number(i.amount).toFixed(2)}`,
        );
      }
      doc.moveDown();
      doc.text('Despesas:', { underline: true });
      for (const e of data.expenses) {
        doc.text(
          `${e.date.toLocaleDateString('pt-BR')} - ${e.description ?? 'Sem descrição'} - R$ ${Number(e.amount).toFixed(2)}`,
        );
      }

      doc.end();
    });
  }

  sendExport(res: Response, format: string, filename: string, content: Buffer | string) {
    const contentTypes: Record<string, string> = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
    };
    res.setHeader('Content-Type', contentTypes[format] ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }

  private escapeCsv(value: string) {
    if (value.includes(',') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
