import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { currentMonth, monthLabel, shiftMonth } from '../lib/dates';
import { useAppStore } from '../stores/useAppStore';
import { IconButton } from './IconButton';
import { theme } from '../theme';

export function MonthPicker() {
  useLanguage();
  const month = useAppStore((state) => state.month);
  const setMonth = useAppStore((state) => state.setMonth);
  const isCurrent = month === currentMonth();
  const [focused, setFocused] = useState(false);
  return <View style={styles.row}>
    <IconButton icon={ChevronLeft} label={t("Mois précédent")} disabled={month === '1900-01'}
      onPress={() => setMonth(shiftMonth(month, -1))} />
    <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={t("{0}. Revenir au mois actuel", [monthLabel(month)])}
      onPress={() => setMonth(currentMonth())}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.month, pressed && styles.pressed,
        { borderColor: focused ? theme.colors.focusRing : theme.colors.transparent }]}>
      <Text style={styles.label}>{monthLabel(month)}</Text>
      {!isCurrent ? <Text style={styles.hint}>{t("Revenir au mois actuel")}</Text> : null}
    </Pressable>
    <IconButton icon={ChevronRight} label={t("Mois suivant")} disabled={month === '2099-12'}
      onPress={() => setMonth(shiftMonth(month, 1))} />
  </View>;
}

const styles = StyleSheet.create({
  row: { width: '100%', alignSelf: 'stretch', flexShrink: 0, minHeight: theme.size.touchMin + 2 * theme.size.borderWidth,
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.lg,
    borderWidth: theme.size.borderWidth, borderColor: theme.colors.border, borderRadius: theme.radius.medium },
  month: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, alignSelf: 'stretch',
    minHeight: theme.size.touchMin, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs, paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.medium, borderWidth: theme.size.focusWidth },
  pressed: { backgroundColor: theme.colors.primaryLight },
  label: { ...theme.typography.body, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary,
    alignSelf: 'stretch', textTransform: 'capitalize', textAlign: 'center' },
  hint: { ...theme.typography.bodySmall, color: theme.colors.textAction, alignSelf: 'stretch', textAlign: 'center' },
});
