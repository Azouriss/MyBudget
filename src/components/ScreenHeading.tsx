import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { theme } from '../theme';

export function ScreenHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <View style={styles.row}>
    <View style={styles.copy}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    </View>
    {action}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingTop: theme.spacing.lg, marginBottom: theme.spacing.lg },
  copy: { flex: 1, gap: theme.spacing.xs },
  eyebrow: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  title: { ...theme.typography.editorial, color: theme.colors.textPrimary },
});
