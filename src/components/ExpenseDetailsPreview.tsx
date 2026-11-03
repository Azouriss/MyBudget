import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Category } from '../db/schema';
import type { ExpenseCategoryBreakdown } from '../lib/expenseHierarchy';
import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { theme } from '../theme';
import { ExpenseSankey } from './ExpenseSankey';

export function ExpenseDetailsPreview({ groups, categories }: {
  groups: ExpenseCategoryBreakdown[]; categories: Category[];
}) {
  useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const active = groups.find(group => group.categoryId === selected) ?? groups[0];
  if (!active) return null;
  return <View style={styles.container} testID="expense-detail-preview">
    <ScrollView horizontal contentContainerStyle={styles.scroll}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('Catégorie du diagramme')} style={styles.options}>
        {groups.map(group => {
          const checked = group.categoryId === active.categoryId;
          return <Pressable cssInterop={false} key={group.categoryId} accessibilityRole="radio"
            accessibilityState={{ checked }} aria-checked={checked} onPress={() => setSelected(group.categoryId)}
            onFocus={() => setFocused(group.categoryId)} onBlur={() => setFocused(null)}
            style={({ pressed }) => [styles.option, { backgroundColor: checked ? theme.colors.primary
              : pressed ? theme.colors.primaryLight : theme.colors.surfaceSecondary,
            borderColor: focused === group.categoryId ? theme.colors.focusRing : theme.colors.transparent }]}>
            <Text style={[styles.optionLabel, checked && styles.selected]}>{t(categories.find(c => c.id === group.categoryId)?.label ?? 'Catégorie')}</Text>
          </Pressable>;
        })}
      </View>
    </ScrollView>
    <ExpenseSankey key={active.categoryId} group={active} category={categories.find(c => c.id === active.categoryId)} preview />
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md },
  scroll: { paddingBottom: theme.spacing.xs },
  options: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  option: { minHeight: theme.size.touchMin, justifyContent: 'center', paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm, borderWidth: theme.size.focusWidth, borderRadius: theme.radius.full },
  optionLabel: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary, maxWidth: 240 },
  selected: { color: theme.colors.textOnPrimary },
});
