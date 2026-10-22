import type { Category } from '../../db/schema';
import { colors } from '../../theme/colors';

export const defaultCategories: Category[] = [
  { id: 'food', label: 'Alimentation', kind: 'expense', color: colors.primary, icon: 'shopping', position: 0 },
  { id: 'housing', label: 'Logement', kind: 'expense', color: colors.info, icon: 'home', position: 1 },
  { id: 'transport', label: 'Transport', kind: 'expense', color: colors.warning, icon: 'car', position: 2 },
  { id: 'leisure', label: 'Loisirs', kind: 'expense', color: colors.accent, icon: 'sparkles', position: 3 },
  { id: 'health', label: 'Santé', kind: 'expense', color: colors.primaryDark, icon: 'heart', position: 4 },
  { id: 'other-expense', label: 'Autres dépenses', kind: 'expense', color: colors.textSecondary, icon: 'wallet', position: 5 },
  { id: 'salary', label: 'Salaire', kind: 'income', color: colors.success, icon: 'briefcase', position: 6 },
  { id: 'other-income', label: 'Autres revenus', kind: 'income', color: colors.infoText, icon: 'wallet', position: 7 },
  { id: 'benefits', label: 'CAF et aides', kind: 'income', color: colors.success, icon: 'home', position: 8 },
  { id: 'reimbursements', label: 'Remboursements', kind: 'income', color: colors.textSecondary, icon: 'wallet', position: 9 },
];
