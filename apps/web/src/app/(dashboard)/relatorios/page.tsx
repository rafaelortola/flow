'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiDownload } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface Report {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomes: Array<{ amount: string; description: string | null }>;
  expenses: Array<{ amount: string; description: string | null }>;
}

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6'];

export default function RelatoriosPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return apiFetch<Report>(`/reports${qs ? `?${qs}` : ''}`).then(setReport);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const pieData = report
    ? [
        { name: 'Receitas', value: report.totalIncome },
        { name: 'Despesas', value: report.totalExpense },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button onClick={() => load()}>Filtrar</Button>
          <Button variant="outline" onClick={() => apiDownload('/reports/export?format=csv', 'relatorio.csv')}>
            CSV
          </Button>
          <Button variant="outline" onClick={() => apiDownload('/reports/export?format=xlsx', 'relatorio.xlsx')}>
            Excel
          </Button>
          <Button variant="outline" onClick={() => apiDownload('/reports/export?format=pdf', 'relatorio.pdf')}>
            PDF
          </Button>
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Receitas</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(report.totalIncome)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(report.totalExpense)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-2xl font-bold">{formatCurrency(report.balance)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receitas vs Despesas</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
