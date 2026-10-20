import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { Wallet } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Button } from './Button';
import { SurfaceCard } from './SurfaceCard';

export function EmptyState({ title, description, onAdd, actionLabel = t("Ajouter une transaction") }: {
  title: string; description: string; onAdd?: () => void; actionLabel?: string;
}) {
  useLanguage();
  return <SurfaceCard style={styles.card}>
    <View style={styles.icon}><Wallet color={theme.colors.primaryDark} size={theme.size.icon.large} strokeWidth={theme.size.iconStroke} /></View>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {onAdd ? <Button title={actionLabel} onPress={onAdd} /> : null}
  </SurfaceCard>;
}

const styles = StyleSheet.create({
  card: { padding: theme.spacing.xl, gap: theme.spacing.md },
  icon: { alignSelf: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.large },
  title: { ...theme.typography.headingS, color: theme.colors.textPrimary, textAlign: 'center' },
  description: { ...theme.typography.bodySmall, color: theme.colors.textSubtle, textAlign: 'center' },
});
