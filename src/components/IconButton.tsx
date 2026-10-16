import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { theme } from '../theme';
import { decorativeIconProps } from './decorativeIconProps';

export function IconButton({ icon: Icon, label, onPress, disabled = false }: {
  icon: LucideIcon; label: string; onPress: () => void; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.button, {
      backgroundColor: disabled ? theme.colors.disabledBackground : pressed ? theme.colors.primaryLight : theme.colors.surface,
      borderColor: focused ? theme.colors.focusRing : theme.colors.transparent,
    }]}>
    <Icon size={theme.size.icon.default} strokeWidth={theme.size.iconStroke}
      color={disabled ? theme.colors.disabledForeground : theme.colors.textAction} {...decorativeIconProps} />
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { width: theme.size.iconButton, height: theme.size.iconButton, flexShrink: 0, borderRadius: theme.radius.medium,
    borderWidth: theme.size.focusWidth, alignItems: 'center', justifyContent: 'center' },
});
