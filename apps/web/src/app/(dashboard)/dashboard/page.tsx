'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalDebtRemaining: number;
  totalInvestments: number;
  cashBalance: number;
  expensesByCategory: Array<{
    categoryId: string | null;
    category: { name: string; color: string } | null;
    total: number;
  }>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiFetch<Summary>('/dashboard/summary').then(setSummary).catch(console.error);
  }, []);

  const chartData =
    summary?.expensesByCategory.map((item) => ({
      name: item.category?.name ?? 'Sem categoria',
      total: item.total,
      fill: item.category?.color ?? '#6366f1',
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas finanças</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(summary?.totalIncome ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(summary?.totalExpense ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary?.balance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Dívidas restantes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalDebtRemaining ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Investimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalInvestments ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary?.cashBalance ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
