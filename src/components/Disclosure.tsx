import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { decorativeIconProps } from './decorativeIconProps';
import { theme } from '../theme';

export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const Icon = expanded ? ChevronUp : ChevronDown;

  return <View style={styles.container}>
    <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={title}
      aria-expanded={expanded} onPress={() => setExpanded((value) => !value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.toggle, {
        backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.transparent,
        borderColor: focused ? theme.colors.focusRing : theme.colors.transparent,
      }]}>
      <Text style={styles.title}>{title}</Text>
      <Icon size={theme.size.icon.medium} color={theme.colors.textAction} {...decorativeIconProps} />
    </Pressable>
    {expanded ? <View style={styles.content}>{children}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  toggle: { minHeight: theme.size.touchMin, flexDirection: 'row', alignItems: 'center',
    gap: theme.spacing.md, padding: theme.spacing.sm, borderWidth: theme.size.focusWidth,
    borderRadius: theme.radius.medium },
  title: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold,
    color: theme.colors.textAction, flex: 1, minWidth: 0 },
  content: { gap: theme.spacing.md, paddingHorizontal: theme.spacing.sm },
});
