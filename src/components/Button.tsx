import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { theme } from '../theme';
import { decorativeIconProps } from './decorativeIconProps';

type Props = {
  title: string; onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';
  pill?: boolean;
  disabled?: boolean; loading?: boolean; icon?: LucideIcon;
};

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, icon: Icon, pill = false }: Props) {
  const [focused, setFocused] = useState(false);
  const primary = variant === 'primary' || variant === 'destructive';
  const danger = variant === 'danger';
  const foreground = disabled ? theme.colors.disabledForeground
    : primary ? theme.colors.textOnPrimary : danger ? theme.colors.dangerText : theme.colors.textAction;
  return <View style={[styles.frame, pill && styles.pill, { borderColor: focused ? theme.colors.focusRing : theme.colors.transparent }]}>
    {/* NativeWind's native interop flattens style callbacks; let Pressable resolve its own states. */}
    <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading} onPress={onPress}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.button, variant === 'ghost' && styles.ghost, pill && styles.pill, {
        backgroundColor: disabled ? theme.colors.disabledBackground
          : variant === 'destructive' ? (pressed ? theme.colors.dangerText : theme.colors.danger)
          : primary ? (pressed ? theme.colors.primaryDark : theme.colors.primary)
          : danger ? (pressed ? theme.colors.surface : theme.colors.dangerBackground) : pressed ? theme.colors.primaryLight
          : variant === 'ghost' ? theme.colors.transparent : theme.colors.surface,
        borderColor: variant === 'secondary' ? theme.colors.controlBorder : theme.colors.transparent,
      }]}>
      {loading ? <ActivityIndicator color={foreground} accessible={false} />
        : Icon ? <Icon size={theme.size.icon.medium} strokeWidth={theme.size.iconStroke} color={foreground} {...decorativeIconProps} /> : null}
      <Text allowFontScaling style={[styles.label, { color: foreground }]}>{title}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  frame: { borderWidth: theme.size.focusWidth, padding: theme.size.focusGap, borderRadius: theme.radius.xl },
  button: { minHeight: theme.size.buttonMinHeight, minWidth: theme.size.touchMin,
    borderWidth: theme.size.borderWidth, borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  ghost: { minHeight: theme.size.touchMin, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md },
  pill: { borderRadius: theme.radius.full },
  label: { ...theme.typography.button, textAlign: 'center', flexShrink: 1 },
});
