'use client';

import { TransactionPage } from '@/components/transaction-page';

export default function ReceitasPage() {
  return (
    <TransactionPage
      type="incomes"
      title="Recebíveis"
      entityName="recebível"
      categoryType="INCOME"
      submitLabel="Salvar"
    />
  );
}
