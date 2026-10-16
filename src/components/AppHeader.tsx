import { router } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { BrandMark } from './BrandMark';
import { IconButton } from './IconButton';

export function AppHeader({ profile = false }: { profile?: boolean }) {
  return <View style={styles.row}>
    <View style={styles.brand} accessibilityRole="header" accessibilityLabel="Mon Budget">
      <BrandMark /><Text style={styles.title}>Mon Budget</Text>
    </View>
    {profile ? <IconButton icon={UserRound} label="Ouvrir les paramètres" onPress={() => router.push('/settings')} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md,
    paddingTop: theme.spacing.lg, marginBottom: theme.spacing.lg, minHeight: 64 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flexShrink: 1 },
  title: { ...theme.typography.brand, color: theme.colors.textPrimary, flexShrink: 1 },
});
