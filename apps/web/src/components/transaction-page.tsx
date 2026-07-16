'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Category {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: string;
  date: string;
  description: string | null;
  category: Category | null;
}

interface Props {
  type: 'incomes' | 'expenses';
  title: string;
  categoryType: 'INCOME' | 'EXPENSE';
}

export function TransactionPage({ type, title, categoryType }: Props) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const load = async () => {
    const [list, cats] = await Promise.all([
      apiFetch<{ data: Transaction[] }>(`/${type}?limit=50`),
      apiFetch<Category[]>(`/categories?type=${categoryType}`),
    ]);
    setItems(list.data);
    setCategories(cats);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [type, categoryType]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await apiFetch(`/${type}`, {
      method: 'POST',
      body: JSON.stringify({
        amount: parseFloat(amount),
        date,
        description: description || undefined,
        categoryId: categoryId || undefined,
      }),
    });
    setAmount('');
    setDescription('');
    await load();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/${type}/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova {title.slice(0, -1).toLowerCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input
              placeholder="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">{item.description ?? 'Sem descrição'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(item.date)} · {item.category?.name ?? 'Sem categoria'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(Number(item.amount))}</span>
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
