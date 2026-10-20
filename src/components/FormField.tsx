import { t } from '../i18n/locale';
import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { theme } from '../theme';
import { decorativeIconProps } from './decorativeIconProps';

type Props = Omit<TextInputProps, 'style'> & { label: string; error?: string; amount?: boolean; suffix?: string; leadingIcon?: LucideIcon };

export const FormField = forwardRef<TextInput, Props>(function FormField({
  label, error, amount = false, suffix, leadingIcon: Icon, onFocus, onBlur, editable = true, ...input
}, ref) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.focusFrame, { borderColor: focused ? theme.colors.focusRing : theme.colors.transparent }]}>
      <View style={[styles.inputContainer, { backgroundColor: editable ? theme.colors.surface : theme.colors.disabledBackground,
        borderColor: error ? theme.colors.danger : theme.colors.controlBorder }]}>
      {Icon ? <Icon size={theme.size.icon.medium} color={theme.colors.textSubtle} {...decorativeIconProps} /> : null}
      <TextInput {...input} ref={ref} accessibilityLabel={label} accessibilityHint={t(error)}
        accessibilityState={{ disabled: !editable }} editable={editable}
        allowFontScaling placeholderTextColor={theme.colors.textSubtle}
        cursorColor={theme.colors.primaryDark} underlineColorAndroid={theme.colors.transparent}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[styles.input, amount && styles.amount, {
          color: editable ? theme.colors.textPrimary : theme.colors.disabledForeground,
        }]} />
      {suffix ? <Text style={[styles.suffix, amount && styles.amountSuffix]}>{suffix}</Text> : null}
      </View>
    </View>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{t(error)}</Text> : null}
  </View>;
});

const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
  label: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary },
  focusFrame: { borderWidth: theme.size.focusWidth, padding: theme.size.focusGap,
    borderRadius: theme.radius.large, marginHorizontal: -(theme.size.focusWidth + theme.size.focusGap) },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, borderWidth: theme.size.borderWidth,
    borderRadius: theme.radius.medium, paddingHorizontal: theme.spacing.lg },
  input: { ...theme.typography.body, color: theme.colors.textPrimary, flex: 1, minWidth: 0,
    minHeight: theme.size.inputMinHeight, paddingVertical: theme.spacing.md },
  amount: { ...theme.typography.display, fontFamily: theme.fontFamily.regular, ...theme.typography.amount, minHeight: theme.size.amountMinHeight },
  suffix: { ...theme.typography.body, color: theme.colors.textSubtle, textAlignVertical: 'center' },
  amountSuffix: { ...theme.typography.display, fontFamily: theme.fontFamily.regular },
  error: { ...theme.typography.bodySmall, color: theme.colors.dangerText },
});
