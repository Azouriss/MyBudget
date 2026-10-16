import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { theme } from '../theme';

export function SegmentedControl<T extends string>({ label, options, value, onChange, disabled = false }: {
  label: string; options: readonly { value: T; label: string }[];
  value: T; onChange: (value: T) => void; disabled?: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState<T | null>(null);
  return <View accessibilityRole="radiogroup" accessibilityLabel={label}
    style={[styles.group, fontScale >= theme.layout.stackedFontScale && styles.stacked]}>
    {options.map((option) => {
      const selected = value === option.value;
      return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
        accessibilityState={{ checked: selected, disabled }} disabled={disabled}
        onFocus={() => setFocused(option.value)} onBlur={() => setFocused(null)}
        onPress={() => onChange(option.value)} style={({ pressed }) => [styles.option,
          fontScale >= theme.layout.stackedFontScale && styles.verticalOption, {
          backgroundColor: disabled ? theme.colors.disabledBackground : pressed ? theme.colors.primaryLight
            : selected ? theme.colors.primary : theme.colors.transparent,
          borderColor: focused === option.value ? theme.colors.focusRing
            : theme.colors.transparent,
        }]}>
        <Text style={[styles.label, { color: selected && !disabled ? theme.colors.textOnPrimary : theme.colors.textPrimary }]}>{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: theme.spacing.xs, padding: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.full },
  stacked: { flexDirection: 'column' },
  verticalOption: { flex: 0 },
  option: { flex: 1, minHeight: theme.size.touchMin, minWidth: theme.size.touchMin,
    flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full, borderWidth: theme.size.focusWidth },
  label: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary, flexShrink: 1, textAlign: 'center' },
});
