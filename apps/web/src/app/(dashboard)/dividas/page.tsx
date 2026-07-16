'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Debt {
  id: string;
  creditor: string;
  totalAmount: string;
  remaining: string;
  dueDate: string | null;
  installments: Array<{ id: string; number: number; amount: string; dueDate: string; paid: boolean }>;
}

export default function DividasPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [creditor, setCreditor] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [dueDate, setDueDate] = useState('');

  const load = () => apiFetch<Debt[]>('/debts').then(setDebts);

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await apiFetch('/debts', {
      method: 'POST',
      body: JSON.stringify({
        creditor,
        totalAmount: parseFloat(totalAmount),
        installments: parseInt(installments, 10),
        dueDate: dueDate || undefined,
      }),
    });
    setCreditor('');
    setTotalAmount('');
    await load();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/debts/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dívidas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nova dívida</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Input placeholder="Credor" value={creditor} onChange={(e) => setCreditor(e.target.value)} required />
            <Input type="number" step="0.01" placeholder="Valor total" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
            <Input type="number" min="1" placeholder="Parcelas" value={installments} onChange={(e) => setInstallments(e.target.value)} />
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {debts.map((debt) => (
          <Card key={debt.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{debt.creditor}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(Number(debt.totalAmount))} · Restante:{' '}
                  {formatCurrency(Number(debt.remaining))}
                  {debt.dueDate && ` · Vencimento: ${formatDate(debt.dueDate)}`}
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(debt.id)}>
                Excluir
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
