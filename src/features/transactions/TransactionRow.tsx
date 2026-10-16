import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Category } from '../../db/schema';
import { CategoryIcon } from '../../components/CategoryIcon';
import { formatMoney } from '../../lib/money';
import { shortDate } from '../../lib/dates';
import { theme } from '../../theme';
import type { Transaction } from './types';
import { ChevronRight } from 'lucide-react-native';
import { decorativeIconProps } from '../../components/decorativeIconProps';

export function TransactionRow({ transaction, category, last = false }: {
  transaction: Transaction; category?: Category; last?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const stacked = Math.min(width, theme.layout.contentMaxWidth) - 2 * theme.layout.gutter < theme.layout.compactTransactionWidth
    || fontScale >= theme.layout.stackedFontScale;
  const income = transaction.kind === 'income';
  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${transaction.label}, ${income ? 'revenu' : 'dépense'} de ${formatMoney(transaction.amountCents)}, ${category?.label ?? 'Catégorie'}, ${shortDate(transaction.occurredOn)}. Modifier.`}
    onPress={() => router.push({ pathname: '/transaction', params: { id: transaction.id } })}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.row, {
      backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.transparent,
      borderBottomWidth: focused ? theme.size.focusWidth : last ? 0 : theme.size.borderWidth,
      borderBottomColor: focused ? theme.colors.focusRing : theme.colors.border,
      borderColor: focused ? theme.colors.focusRing : theme.colors.transparent,
    }]}>
    <CategoryIcon category={category} />
    <View style={styles.content}>
      <View style={[styles.details, stacked && styles.stacked]}>
        <View style={styles.copy}>
          <Text style={styles.label}>{transaction.label}</Text>
          <Text style={styles.meta}>{category?.label ?? 'Catégorie'}{income ? ' · Revenu' : ''}</Text>
        </View>
        <View style={styles.amountColumn}><Text style={[styles.amount, { color: income ? theme.colors.success : theme.colors.textPrimary }]}>
          {income ? '+' : '−'}{formatMoney(transaction.amountCents)}
        </Text><Text style={styles.date}>{shortDate(transaction.occurredOn)}</Text></View>
      </View>
    </View>
    <ChevronRight size={theme.size.icon.small} color={theme.colors.textSubtle} {...decorativeIconProps} />
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
  amountColumn: { alignItems: 'flex-end', gap: theme.spacing.xs, flexShrink: 1 },
  date: { ...theme.typography.caption, color: theme.colors.textSubtle, textAlign: 'right' },
  amount: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold, ...theme.typography.amount, textAlign: 'right', flexShrink: 1 },
});
