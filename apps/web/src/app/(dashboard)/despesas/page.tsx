'use client';

import { TransactionPage } from '@/components/transaction-page';

export default function DespesasPage() {
  return <TransactionPage type="expenses" title="Despesas" categoryType="EXPENSE" />;
}
