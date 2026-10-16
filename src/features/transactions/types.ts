export type TransactionKind = 'expense' | 'income';
export type Transaction = {
  id: string;
  kind: TransactionKind;
  amountCents: number;
  label: string;
  categoryId: string;
  subcategoryId?: string | null;
  occurredOn: string;
  createdAt: number;
  updatedAt: number;
  recurringExpenseId?: string | null;
  recurringOccurrenceOn?: string | null;
  /** Read-only forecast of a future recurrence; never persisted as a transaction. */
  isPlanned?: boolean;
};

export type TransactionDraft = Pick<Transaction,
  'kind' | 'amountCents' | 'label' | 'categoryId' | 'subcategoryId' | 'occurredOn'
>;
