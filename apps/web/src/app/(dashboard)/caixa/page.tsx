'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CashEntry {
  id: string;
  type: 'IN' | 'OUT';
  amount: string;
  date: string;
  description: string | null;
  balance: string;
}

export default function CaixaPage() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  const load = async () => {
    const [list, bal] = await Promise.all([
      apiFetch<{ data: CashEntry[] }>('/cash?limit=50'),
      apiFetch<{ balance: number }>('/cash/balance'),
    ]);
    setEntries(list.data);
    setBalance(bal.balance);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await apiFetch('/cash', {
      method: 'POST',
      body: JSON.stringify({
        type,
        amount: parseFloat(amount),
        date,
        description: description || undefined,
      }),
    });
    setAmount('');
    setDescription('');
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Caixa</h1>
        <p className="text-xl font-semibold">Saldo: {formatCurrency(balance)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={type} onChange={(e) => setType(e.target.value as 'IN' | 'OUT')}>
              <option value="IN">Entrada</option>
              <option value="OUT">Saída</option>
            </Select>
            <Input type="number" step="0.01" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{entry.description ?? (entry.type === 'IN' ? 'Entrada' : 'Saída')}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(entry.date)}</p>
                </div>
                <div className="text-right">
                  <p className={entry.type === 'IN' ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                    {entry.type === 'IN' ? '+' : '-'}
                    {formatCurrency(Number(entry.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo: {formatCurrency(Number(entry.balance))}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
