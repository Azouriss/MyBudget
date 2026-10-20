import { forwardRef, useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, ChevronLeft, ChevronRight, Keyboard as KeyboardIcon } from 'lucide-react-native';
import { calendarDateLabel, calendarDays, calendarSelection } from '../lib/calendar';
import { displayDate, localDateKey, monthLabel, shiftMonth } from '../lib/dates';
import { theme } from '../theme';
import { Button } from './Button';
import { FormField } from './FormField';
import { decorativeIconProps } from './decorativeIconProps';

type Props = { label: string; value: string; onChangeText: (value: string) => void;
  onBlur?: () => void; editable?: boolean; error?: string };

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function CalendarArrow({ previous = false, disabled, onPress }: { previous?: boolean; disabled: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  const Icon = previous ? ChevronLeft : ChevronRight;
  return <Pressable cssInterop={false} accessibilityRole="button"
    accessibilityLabel={previous ? 'Mois précédent du calendrier' : 'Mois suivant du calendrier'}
    disabled={disabled} accessibilityState={{ disabled }} aria-disabled={disabled}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress}
    style={({ pressed }) => [styles.arrow, {
      backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.surface,
      borderColor: focused ? theme.colors.focusRing : theme.colors.transparent,
    }]}>
    <Icon size={theme.size.icon.default} color={disabled ? theme.colors.disabledForeground : theme.colors.textAction} {...decorativeIconProps} />
  </Pressable>;
}

export const DateField = forwardRef<TextInput, Props>(function DateField({
  label, value, onChangeText, onBlur, editable = true, error,
}, ref) {
  const [manual, setManual] = useState(false);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => calendarSelection(value).slice(0, 7));
  const [focusedDay, setFocusedDay] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const trigger = useRef<View>(null);
  const { width } = useWindowDimensions();
  const gridWidth = Math.floor(Math.max(theme.size.touchMin * 7,
    Math.min(width - theme.spacing.sm * 2 - theme.spacing.md * 2, 392)) / 7) * 7;
  const today = localDateKey();
  // Invalid manual input is never replaced merely by opening or cancelling.
  const selected = calendarSelection(value);

  function showCalendar() {
    Keyboard.dismiss();
    setMonth(calendarSelection(value).slice(0, 7));
    setOpen(true);
  }
  function closeCalendar() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  function choose(date: string) {
    onChangeText(displayDate(date));
    onBlur?.();
    setManual(false);
    closeCalendar();
  }

  return <View style={styles.field}>
    {manual ? <FormField ref={ref} label={label} value={value} onChangeText={onChangeText} onBlur={onBlur}
      placeholder="JJ/MM/AAAA" maxLength={10} editable={editable} error={error}
      autoFocus keyboardType="numbers-and-punctuation" autoCorrect={false} returnKeyType="done" /> : <>
      <Text style={styles.label}>{label}</Text>
      <Pressable cssInterop={false} ref={trigger} accessibilityRole="button" accessibilityLabel="Ouvrir le calendrier"
        accessibilityHint={`Date actuelle : ${value || 'non renseignée'}. Choisir un jour dans le calendrier.`}
        accessibilityState={{ disabled: !editable, expanded: open }} aria-expanded={open} disabled={!editable}
        onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); onBlur?.(); }} onPress={showCalendar}
        style={({ pressed }) => [styles.input, { backgroundColor: !editable ? theme.colors.disabledBackground
          : pressed ? theme.colors.primaryLight : theme.colors.surface,
          borderColor: focused ? theme.colors.focusRing : error ? theme.colors.danger : theme.colors.controlBorder }]}>
        <CalendarDays size={theme.size.icon.medium} color={theme.colors.textSubtle} {...decorativeIconProps} />
        <Text style={styles.value}>{value || 'JJ/MM/AAAA'}</Text>
      </Pressable>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </>}
    <Button title={manual ? 'Choisir dans le calendrier' : 'Saisir au clavier'} variant="ghost"
      icon={manual ? CalendarDays : KeyboardIcon} disabled={!editable}
      onPress={manual ? showCalendar : () => setManual(true)} />
    <Modal visible={open && editable} transparent animationType="none" onRequestClose={closeCalendar}>
      <SafeAreaView style={styles.scrim}>
        <Pressable accessible={false} importantForAccessibility="no" style={StyleSheet.absoluteFill} onPress={closeCalendar} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.title}>Choisir une date</Text>
            <View style={styles.monthRow}>
              <CalendarArrow previous disabled={month === '1900-01'}
                onPress={() => setMonth(shiftMonth(month, -1))} />
              <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.month}>{monthLabel(month)}</Text>
              <CalendarArrow disabled={month === '2099-12'}
                onPress={() => setMonth(shiftMonth(month, 1))} />
            </View>
            {width < 384 ? <Text style={styles.help}>Balayez la semaine pour voir tous les jours.</Text> : null}
            <ScrollView horizontal contentContainerStyle={styles.horizontal} showsHorizontalScrollIndicator>
              <View style={{ width: gridWidth }}>
                <View style={styles.weekdays} accessible={false} importantForAccessibility="no-hide-descendants">
                  {weekdays.map((day, index) => <Text key={index} style={[styles.weekday, { width: gridWidth / 7 }]}>{day}</Text>)}
                </View>
                <View accessibilityRole="radiogroup" accessibilityLabel="Jour de la dépense" style={styles.days}>
                  {calendarDays(month).map((date, index) => date ? <Pressable cssInterop={false} key={date}
                    accessibilityRole="radio" accessibilityLabel={calendarDateLabel(date)}
                    accessibilityState={{ checked: date === selected }} aria-checked={date === selected}
                    onFocus={() => setFocusedDay(date)} onBlur={() => setFocusedDay(null)} onPress={() => choose(date)}
                    style={({ pressed }) => [styles.day, { width: gridWidth / 7,
                      backgroundColor: date === selected ? theme.colors.primary : pressed ? theme.colors.primaryLight : theme.colors.surface,
                      borderColor: focusedDay === date ? theme.colors.focusRing : date === today ? theme.colors.primary : theme.colors.transparent }]}>
                    <Text style={[styles.dayLabel, { color: date === selected ? theme.colors.textOnPrimary : theme.colors.textPrimary }]}>{Number(date.slice(8))}</Text>
                  </Pressable> : <View key={`blank-${index}`} style={[styles.day, { width: gridWidth / 7 }]} />)}
                </View>
              </View>
            </ScrollView>
            <Button title="Aujourd’hui" onPress={() => choose(today)} variant="secondary" />
            <Button title="Annuler le choix de date" onPress={closeCalendar} variant="ghost" />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
});

const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
  label: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary },
  input: { minHeight: theme.size.inputMinHeight, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderWidth: theme.size.focusWidth, borderRadius: theme.radius.medium },
  value: { ...theme.typography.body, color: theme.colors.textPrimary, flex: 1 },
  error: { ...theme.typography.bodySmall, color: theme.colors.dangerText },
  scrim: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.scrim, padding: theme.spacing.sm },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '100%', backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl, overflow: 'hidden' },
  dialogContent: { padding: theme.spacing.md, gap: theme.spacing.sm },
  title: { ...theme.typography.headingM, color: theme.colors.textPrimary },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  arrow: { width: theme.size.iconButton, height: theme.size.iconButton, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center', borderWidth: theme.size.focusWidth, borderRadius: theme.radius.medium },
  month: { ...theme.typography.body, color: theme.colors.textPrimary, fontFamily: theme.fontFamily.semibold,
    textTransform: 'capitalize', textAlign: 'center', flex: 1 },
  help: { ...theme.typography.caption, color: theme.colors.textSubtle },
  horizontal: { flexGrow: 1, justifyContent: 'center' },
  weekdays: { flexDirection: 'row' },
  weekday: { ...theme.typography.caption, textAlign: 'center', color: theme.colors.textSubtle, paddingVertical: theme.spacing.sm },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { minHeight: theme.size.touchMin, alignItems: 'center', justifyContent: 'center',
    paddingVertical: theme.spacing.sm, borderWidth: theme.size.focusWidth, borderColor: theme.colors.transparent, borderRadius: theme.radius.medium },
  dayLabel: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium },
});
