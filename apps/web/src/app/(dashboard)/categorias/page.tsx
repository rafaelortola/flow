'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [color, setColor] = useState('#6366f1');

  const load = () => apiFetch<Category[]>('/categories').then(setCategories);

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, type, color }),
    });
    setName('');
    await load();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/categories/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Categorias</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4">
            <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <Select value={type} onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </Select>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {cat.type === 'INCOME' ? 'Receita' : 'Despesa'}
                  </span>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(cat.id)}>
                  Excluir
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
