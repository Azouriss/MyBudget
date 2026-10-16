import { router } from 'expo-router';
import { View } from 'react-native';
import { EmptyState } from '../src/components/EmptyState';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { theme } from '../src/theme';

export default function NotFoundScreen() {
  return <ScreenContainer inTabs={false}><View style={{ flex: 1, justifyContent: 'center', padding: theme.layout.gutter }}>
    <EmptyState title="Écran introuvable" description="Retrouvez vos transactions depuis l’accueil."
      actionLabel="Retour à l’accueil" onAdd={() => router.replace('/')} />
  </View></ScreenContainer>;
}
