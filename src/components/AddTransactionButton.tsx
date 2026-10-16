import { Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Button } from './Button';
import { theme } from '../theme';

export function AddTransactionButton() {
  const { fontScale } = useWindowDimensions();
  return <View style={[styles.position, fontScale >= theme.layout.stackedFontScale && styles.expanded]}>
    <Button title="Ajouter" icon={Plus} pill onPress={() => router.push('/transaction')} />
  </View>;
}

export const FAB_RESERVE = theme.size.fab + 2 * theme.spacing.lg;

const styles = StyleSheet.create({
  position: { position: 'absolute', right: theme.layout.gutter, bottom: theme.spacing.lg,
    borderRadius: theme.radius.full, backgroundColor: theme.colors.background, ...theme.shadows.floating },
  expanded: { position: 'relative', right: undefined, bottom: undefined, margin: theme.layout.gutter },
});
