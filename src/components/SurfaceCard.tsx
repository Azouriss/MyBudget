import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../theme';

export function SurfaceCard({ children, featured = false, style }: {
  children: ReactNode; featured?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, featured && styles.featured, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border,
    borderWidth: theme.size.borderWidth, borderRadius: theme.radius.large, padding: theme.spacing.lg, ...theme.shadows.card },
  featured: { backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.large, padding: theme.spacing.xl },
});
