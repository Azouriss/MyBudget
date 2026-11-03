import { Text, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import type { LucideIcon } from 'lucide-react-native';

export function SectionHeader({ title, action, actionIcon, onAction }: {
  title: string; action?: string; actionIcon?: LucideIcon; onAction?: () => void;
}) {
  return <View style={styles.row}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {action && onAction ? actionIcon
      ? <IconButton icon={actionIcon} label={action} onPress={onAction} />
      : <Button title={action} onPress={onAction} variant="ghost" /> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
    gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  title: { ...theme.typography.headingS, color: theme.colors.textPrimary, flexShrink: 1 },
});
