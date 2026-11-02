import { getLocale, t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { monthLabel, shiftMonth, monthBounds, periodLabel } from '../lib/dates';
import { useAppStore } from '../stores/useAppStore';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { decorativeIconProps } from './decorativeIconProps';
import { theme } from '../theme';
import { useDatabase } from '../db/DatabaseProvider';
import { createPeriodRepository } from '../features/payday/period';
import { useBudgetPeriod } from '../features/transactions/hooks';

export function MonthPicker() {
  useLanguage();
  const month = useAppStore((state) => state.month);
  const setMonth = useAppStore((state) => state.setMonth);
  const period = useBudgetPeriod(month);
  const current = createPeriodRepository(useDatabase()).monthForDate();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const [focused, setFocused] = useState<string | null>(null);
  const trigger = useRef<View>(null);
  const { width, fontScale } = useWindowDimensions();
  const large = fontScale >= theme.layout.stackedFontScale;
  const calendar = monthBounds(month);
  const customPeriod = period.start !== calendar.start || period.end !== calendar.end;
  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  function choose(value: string) { setMonth(value); close(); }
  return <View style={styles.container}>
    <View style={[styles.row, large && styles.stacked]}>
      <Pressable cssInterop={false} ref={trigger} accessibilityRole="button"
        accessibilityLabel={t('Choisir la période : {0}', [monthLabel(month)])}
        accessibilityState={{ expanded: open }} aria-expanded={open}
        onPress={() => { setYear(Number(month.slice(0, 4))); setOpen(true); }}
        onFocus={() => setFocused('trigger')} onBlur={() => setFocused(null)}
        style={({ pressed }) => [styles.trigger, { backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.transparent,
          borderColor: focused === 'trigger' ? theme.colors.focusRing : theme.colors.transparent }]}>
        <Text style={styles.label}>{monthLabel(month)}</Text>
        <ChevronDown size={theme.size.icon.small} color={theme.colors.textAction} {...decorativeIconProps} />
      </Pressable>
      <View style={styles.arrows}>
        <IconButton icon={ChevronLeft} label={t('Période précédente')} disabled={month === '1900-01'} onPress={() => setMonth(shiftMonth(month, -1))} />
        <IconButton icon={ChevronRight} label={t('Période suivante')} disabled={month === '2099-12'} onPress={() => setMonth(shiftMonth(month, 1))} />
      </View>
    </View>
    {customPeriod ? <Text style={styles.hint}>{periodLabel(period)}</Text> : null}
    {month !== current ? <Button title={t('Période actuelle')} variant="ghost" onPress={() => setMonth(current)} /> : null}
    <Modal visible={open} transparent animationType="none" onRequestClose={close}>
      <SafeAreaView style={styles.scrim}>
        <Pressable accessible={false} importantForAccessibility="no" style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            <View style={styles.row}>
              <Text accessibilityRole="header" style={styles.title}>{t('Choisir un mois')}</Text>
              <IconButton icon={X} label={t('Fermer le choix de période')} onPress={close} />
            </View>
            <View style={styles.year}>
              <IconButton icon={ChevronLeft} label={t('Année précédente')} disabled={year === 1900} onPress={() => setYear(year - 1)} />
              <Text accessibilityLiveRegion="polite" style={styles.yearLabel}>{year}</Text>
              <IconButton icon={ChevronRight} label={t('Année suivante')} disabled={year === 2099} onPress={() => setYear(year + 1)} />
            </View>
            <View accessibilityRole="radiogroup" accessibilityLabel={t('Mois')} style={styles.grid}>
              {Array.from({ length: 12 }, (_, index) => {
                const value = `${year}-${String(index + 1).padStart(2, '0')}`;
                const selected = value === month;
                const label = new Intl.DateTimeFormat(getLocale(), { month: 'long', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
                return <Pressable cssInterop={false} key={value} accessibilityRole="radio" accessibilityLabel={monthLabel(value)}
                  accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => choose(value)}
                  onFocus={() => setFocused(value)} onBlur={() => setFocused(null)}
                  style={({ pressed }) => [styles.option, { width: large ? '100%' : width < 360 ? '48%' : '31%',
                    backgroundColor: selected ? theme.colors.primary : pressed ? theme.colors.primaryLight : theme.colors.surfaceSecondary,
                    borderColor: focused === value ? theme.colors.focusRing : theme.colors.transparent }]}>
                  <Text style={[styles.optionLabel, selected && styles.selected]}>{label}</Text>
                </Pressable>;
              })}
            </View>
            <Button title={t('Période actuelle')} variant="secondary" onPress={() => choose(current)} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: theme.spacing.xs, marginBottom: theme.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  stacked: { flexWrap: 'wrap' },
  trigger: { flex: 1, minHeight: theme.size.touchMin, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.xs, borderWidth: theme.size.focusWidth, borderRadius: theme.radius.medium },
  label: { ...theme.typography.headingS, color: theme.colors.textPrimary, flexShrink: 1, textTransform: 'capitalize' },
  arrows: { flexDirection: 'row', gap: theme.spacing.xs, marginLeft: 'auto' },
  hint: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  scrim: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.scrim },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '100%', borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  dialogContent: { padding: theme.spacing.md, gap: theme.spacing.md },
  title: { ...theme.typography.headingM, color: theme.colors.textPrimary, flex: 1 },
  year: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yearLabel: { ...theme.typography.headingS, ...theme.typography.amount, color: theme.colors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm },
  option: { minHeight: theme.size.touchMin, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.sm,
    borderRadius: theme.radius.medium, borderWidth: theme.size.focusWidth },
  optionLabel: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, textTransform: 'capitalize', textAlign: 'center' },
  selected: { color: theme.colors.textOnPrimary },
});
