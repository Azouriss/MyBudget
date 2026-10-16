import { formToDraft, transactionDraftSchema, transactionFormSchema } from '../validation';

const valid = { kind: 'expense' as const, amount: '42,29', label: '  Courses  ', categoryId: 'food', date: '15/10/2026' };

describe('validation des transactions', () => {
  it('produit un objet normalisé et un montant entier', () => {
    expect(formToDraft(valid)).toEqual({
      kind: 'expense', amountCents: 4229, label: 'Courses', categoryId: 'food', subcategoryId: null, occurredOn: '2026-10-15',
    });
  });

  it('refuse les erreurs de formulaire avant toute écriture', () => {
    for (const invalid of [
      { ...valid, amount: '12,345' }, { ...valid, label: ' ' },
      { ...valid, label: 'a'.repeat(81) }, { ...valid, categoryId: '' },
      { ...valid, date: '31/02/2026' }, { ...valid, kind: 'transfer' },
    ]) {
      expect(transactionFormSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('valide aussi les entrées au niveau du dépôt', () => {
    const draft = formToDraft(valid);
    expect(transactionDraftSchema.safeParse({ ...draft, amountCents: 0 }).success).toBe(false);
    expect(transactionDraftSchema.safeParse({ ...draft, amountCents: 42.29 }).success).toBe(false);
    expect(transactionDraftSchema.safeParse({ ...draft, occurredOn: '2026-02-30' }).success).toBe(false);
    expect(transactionDraftSchema.safeParse({ ...draft, unexpected: true }).success).toBe(false);
  });

  it('conserve une sous-catégorie valide et permet de la retirer', () => {
    expect(formToDraft({ ...valid, subcategoryId: 'food-groceries' }).subcategoryId).toBe('food-groceries');
    expect(formToDraft({ ...valid, subcategoryId: null }).subcategoryId).toBeNull();
  });

  it('refuse les sous-catégories inconnues, incompatibles et associées aux revenus', () => {
    for (const values of [
      { ...valid, subcategoryId: 'unknown' },
      { ...valid, subcategoryId: '' },
      { ...valid, subcategoryId: 'transport-fuel' },
      { ...valid, kind: 'income', categoryId: 'salary', subcategoryId: 'food-groceries' },
    ]) {
      expect(transactionFormSchema.safeParse(values).success).toBe(false);
      expect(transactionDraftSchema.safeParse({ ...formToDraft(valid),
        kind: values.kind, categoryId: values.categoryId, subcategoryId: values.subcategoryId }).success).toBe(false);
    }
    expect(formToDraft({ ...valid, kind: 'income', categoryId: 'salary' }).subcategoryId).toBeNull();
  });
});
