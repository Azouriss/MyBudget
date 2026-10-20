import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { useAppStore } from '../stores/useAppStore';
import { theme } from '../theme';
import { Button } from './Button';
import { SurfaceCard } from './SurfaceCard';

export function QueryState({ error }: { error: boolean }) {
  useLanguage();
  const invalidate = useAppStore((state) => state.invalidate);
  return <SurfaceCard style={styles.card}>
    {error ? <>
      <TriangleAlert size={theme.size.icon.default} color={theme.colors.dangerText} />
      <Text accessibilityRole="alert" style={styles.error}>{t("Impossible de lire les transactions. Vos données sont conservées.")}</Text>
      <Button title={t("Réessayer")} onPress={invalidate} variant="secondary" />
    </> : <>
      <ActivityIndicator color={theme.colors.primaryDark} accessibilityLabel={t("Chargement des transactions")} />
      <Text style={styles.copy} accessibilityLiveRegion="polite">{t("Chargement des transactions…")}</Text>
    </>}
  </SurfaceCard>;
}

const styles = StyleSheet.create({
  card: { padding: theme.spacing.xl, gap: theme.spacing.lg, alignItems: 'center' },
  copy: { ...theme.typography.body, color: theme.colors.textSubtle, textAlign: 'center' },
  error: { ...theme.typography.body, color: theme.colors.dangerText, textAlign: 'center' },
});
