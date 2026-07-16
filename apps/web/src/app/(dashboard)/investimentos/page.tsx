'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Investment {
  id: string;
  name: string;
  type: string;
  amount: string;
  currentValue: string;
  date: string;
}

export default function InvestimentosPage() {
  const [items, setItems] = useState<Investment[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = () => apiFetch<Investment[]>('/investments').then(setItems);

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await apiFetch('/investments', {
      method: 'POST',
      body: JSON.stringify({
        name,
        type,
        amount: parseFloat(amount),
        currentValue: parseFloat(currentValue || amount),
        date,
      }),
    });
    setName('');
    setType('');
    setAmount('');
    setCurrentValue('');
    await load();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/investments/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Investimentos</h1>

      <Card>
        <CardHeader>
          <CardTitle>Novo investimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="Tipo" value={type} onChange={(e) => setType(e.target.value)} required />
            <Input type="number" step="0.01" placeholder="Investido" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Input type="number" step="0.01" placeholder="Valor atual" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.type} · {formatDate(item.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(item.currentValue))}</p>
                    <p className="text-xs text-muted-foreground">
                      Investido: {formatCurrency(Number(item.amount))}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
