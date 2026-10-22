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
  recurringIncomeId?: string | null;
  recurringIncomeOn?: string | null;
  /** Received reimbursement and the original expense allocations. */
  reimbursement?: { expenseId: string; parts: { categoryId: string; amountCents: number }[] };
  /** Read-only forecast of a future recurrence; never persisted as a transaction. */
  isPlanned?: boolean;
  /** Category allocations of the same payment; never additional transactions. */
  splits?: { categoryId: string; amountCents: number }[];
};

export type TransactionDraft = Pick<Transaction,
  'kind' | 'amountCents' | 'label' | 'categoryId' | 'subcategoryId' | 'occurredOn'
>;

export function recurringId(entry: Transaction): string | null | undefined {
  return entry.recurringExpenseId ?? entry.recurringIncomeId;
}
