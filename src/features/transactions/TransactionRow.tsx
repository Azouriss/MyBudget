import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Category } from '../../db/schema';
import { CategoryIcon } from '../../components/CategoryIcon';
import { formatMoney } from '../../lib/money';
import { shortDate } from '../../lib/dates';
import { theme } from '../../theme';
import { recurringId, type Transaction } from './types';
import { ChevronRight, Repeat2 } from 'lucide-react-native';
import { decorativeIconProps } from '../../components/decorativeIconProps';
import { getExpenseSubcategory } from '../categories/subcategories';

export function TransactionRow({ transaction, category, last = false, variant = 'default' }: {
  transaction: Transaction; category?: Category; last?: boolean; variant?: 'default' | 'history';
}) {
  useLanguage();
  const [focused, setFocused] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const history = variant === 'history';
  const stacked = Math.min(width, theme.layout.contentMaxWidth) - 2 * theme.layout.gutter < theme.layout.compactTransactionWidth
    || fontScale >= theme.layout.stackedFontScale;
  const income = transaction.kind === 'income';
  const ruleId = recurringId(transaction);
  const recurring = !!ruleId;
  const planned = !!transaction.isPlanned;
  const subcategory = getExpenseSubcategory(transaction.subcategoryId);
  const categoryLabel = `${t(category?.label ?? "Catégorie")}${subcategory ? ` · ${t(subcategory.label)}` : ''}`;
  return <Pressable cssInterop={false} accessibilityRole="button"
    accessibilityLabel={t("{0}, {1}{2}{3} de {4}, {5}, {6}. {7}", [transaction.label, income ? t("revenu") : t("dépense"), recurring ? t(" récurrente") : '', planned ? t(" prévue") : '', formatMoney(transaction.amountCents), categoryLabel, shortDate(transaction.occurredOn), planned ? t("Gérer la récurrence.") : t("Modifier.")])}
    onPress={() => router.push(planned && ruleId
      ? { pathname: '/recurring-expense', params: { id: ruleId } }
      : { pathname: '/transaction', params: { id: transaction.id } })}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.row, history && styles.historyRow, {
      backgroundColor: pressed ? theme.colors.primaryLight : history ? theme.colors.surface : theme.colors.transparent,
      borderWidth: focused || !history ? theme.size.focusWidth : theme.size.borderWidth,
      borderBottomWidth: focused ? theme.size.focusWidth : history ? theme.size.borderWidth : last ? 0 : theme.size.borderWidth,
      borderBottomColor: focused ? theme.colors.focusRing : theme.colors.border,
      borderColor: focused ? theme.colors.focusRing : history ? theme.colors.border : theme.colors.transparent,
    }]}>
    <CategoryIcon category={category} />
    <View style={styles.content}>
      <View style={[styles.details, history && !stacked && styles.historyDetails, stacked && styles.stacked]}>
        <View style={[styles.copy, history && !stacked && styles.historyCopy]}>
          <Text style={[styles.label, history && styles.historyLabel]}>{transaction.label}</Text>
          <Text style={styles.meta}>{categoryLabel}{transaction.reimbursement || transaction.categoryId === 'reimbursements' ? t(" · Remboursement reçu") : income ? t(" · Revenu") : ''}</Text>
          {recurring ? <View style={[styles.recurring, history && styles.recurringBadge]}>
            <Repeat2 size={theme.size.icon.small} color={theme.colors.textAction} {...decorativeIconProps} />
            <Text style={styles.recurringLabel}>{planned ? t("Récurrente · Prévue") : t("Récurrente")}</Text>
          </View> : null}
        </View>
        <View style={[styles.amountColumn, history && styles.historyAmountColumn]}><Text style={[styles.amount, history && styles.historyAmount, { color: income ? theme.colors.success : theme.colors.textPrimary }]}>
          {income ? '+' : '−'}{formatMoney(transaction.amountCents)}
        </Text>{!history ? <Text style={styles.date}>{shortDate(transaction.occurredOn)}</Text> : null}</View>
      </View>
    </View>
    {!history ? <ChevronRight size={theme.size.icon.small} color={theme.colors.textSubtle} {...decorativeIconProps} /> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { minHeight: theme.size.rowMinHeight, paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: theme.spacing.md, borderWidth: theme.size.focusWidth, borderRadius: theme.radius.small },
  content: { flex: 1, minWidth: 0 },
  details: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  stacked: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.sm },
  copy: { flex: 1, gap: theme.spacing.xs },
  label: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary },
  meta: { ...theme.typography.caption, color: theme.colors.textSubtle },
  recurring: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  recurringLabel: { ...theme.typography.caption, color: theme.colors.textAction, flexShrink: 1 },
  amountColumn: { alignItems: 'flex-end', gap: theme.spacing.xs, flexShrink: 1 },
  date: { ...theme.typography.caption, color: theme.colors.textSubtle, textAlign: 'right' },
  amount: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold, ...theme.typography.amount, textAlign: 'right', flexShrink: 1 },
  historyRow: { borderRadius: theme.radius.large, marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.lg },
  historyLabel: { fontFamily: theme.fontFamily.semibold },
  historyDetails: { flexWrap: 'wrap', gap: theme.spacing.sm },
  historyCopy: { flexBasis: '50%', flexShrink: 0 },
  historyAmountColumn: { marginLeft: 'auto', maxWidth: '100%' },
  historyAmount: { fontSize: theme.typography.body.fontSize, lineHeight: theme.typography.body.lineHeight },
  recurringBadge: { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.small },
});
