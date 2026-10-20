import { t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { router } from 'expo-router';
import { View } from 'react-native';
import { EmptyState } from '../src/components/EmptyState';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { theme } from '../src/theme';

export default function NotFoundScreen() {
  useLanguage();
  return <ScreenContainer inTabs={false}><View style={{ flex: 1, justifyContent: 'center', padding: theme.layout.gutter }}>
    <EmptyState title={t("Écran introuvable")} description={t("Retrouvez vos transactions depuis l’accueil.")}
      actionLabel={t("Retour à l’accueil")} onAdd={() => router.replace('/')} />
  </View></ScreenContainer>;
}
