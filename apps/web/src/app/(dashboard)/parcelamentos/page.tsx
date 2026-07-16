'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Installment {
  id: string;
  number: number;
  amount: string;
  dueDate: string;
  paid: boolean;
  debt: { id: string; creditor: string };
}

export default function ParcelamentosPage() {
  const [installments, setInstallments] = useState<Installment[]>([]);

  const load = async () => {
    const debts = await apiFetch<
      Array<{ id: string; creditor: string; installments: Omit<Installment, 'debt'>[] }>
    >('/debts');
    const all = debts.flatMap((debt) =>
      debt.installments.map((inst) => ({ ...inst, debt: { id: debt.id, creditor: debt.creditor } })),
    );
    setInstallments(all.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const togglePaid = async (debtId: string, installmentId: string, paid: boolean) => {
    await apiFetch(`/debts/${debtId}/installments/${installmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ paid: !paid }),
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Parcelamentos</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {installments.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma parcela encontrada.</p>
            )}
            {installments.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">
                    {inst.debt.creditor} — Parcela {inst.number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vencimento: {formatDate(inst.dueDate)} · {formatCurrency(Number(inst.amount))}
                  </p>
                </div>
                <Button
                  variant={inst.paid ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => togglePaid(inst.debt.id, inst.id, inst.paid)}
                >
                  {inst.paid ? 'Paga' : 'Marcar paga'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
