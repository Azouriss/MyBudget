import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ScreenHeading } from '../../src/components/ScreenHeading';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { Button } from '../../src/components/Button';
import { Disclosure } from '../../src/components/Disclosure';
import { AppHeader } from '../../src/components/AppHeader';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { createPaydayRepository } from '../../src/features/payday/repository';
import { useAppStore } from '../../src/stores/useAppStore';
import { theme } from '../../src/theme';

export default function SettingsScreen() {
  const web = Platform.OS === 'web';
  const db = useDatabase();
  const revision = useAppStore((state) => state.revision);
  const [payday, setPayday] = useState<number | null>(null);
  const [paydayStatus, setPaydayStatus] = useState('Chargement du jour de paie…');

  useEffect(() => {
    try {
      const settings = createPaydayRepository(db).settings();
      setPayday(settings?.day ?? null);
      setPaydayStatus('Jour de paie non défini.');
    } catch {
      setPayday(null);
      setPaydayStatus('Le jour de paie n’a pas pu être chargé. Rouvrez les paramètres pour réessayer.');
    }
  }, [db, revision]);

  return <ScreenContainer>
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader />
      <ScreenHeading title="Paramètres" />
      <View style={styles.sections}>
        <SurfaceCard style={{ gap: theme.spacing.md }}>
          <Text style={styles.label}>Paie & abonnements</Text>
          <Text accessibilityLiveRegion="polite" style={payday === null ? styles.body : styles.payday}>
            {payday === null ? paydayStatus : `Paie le ${payday === 1 ? '1er' : payday} du mois.`}
          </Text>
          <Button title="Jour de paie et rappels" variant="secondary" onPress={() => router.push('/payday')} />
          <Button title="Dépenses récurrentes" variant="ghost" onPress={() => router.push('/recurring')} />
        </SurfaceCard>
        <SurfaceCard style={{ gap: theme.spacing.md }}>
          <Text style={styles.label}>Vos outils</Text>
          <Button title="Sauvegardes et exports" variant="secondary" onPress={() => router.push('/data-transfer')} />
          <Button title="Importer un relevé CSV" variant="secondary" onPress={() => router.push('/csv-import')} />
          <Button title="Favoris et saisie express" variant="secondary" onPress={() => router.push('/quick-entry')} />
          <Button title="Budget de paie à paie" variant="secondary" onPress={() => router.push('/pay-cycle')} />
          <Button title="Répartition et remboursements" variant="secondary" onPress={() => router.push('/expense-details')} />
          <Button title="Comprendre mon mois" variant="secondary" onPress={() => router.push('/month-review')} />
          <Button title="Renouvellements" variant="secondary" onPress={() => router.push('/renewals')} />
        </SurfaceCard>
        <Disclosure title="À propos et données">
          <Text style={styles.body}>{web ? 'Aperçu web · Euro (EUR)' : 'Hors ligne · Euro (EUR)'}</Text>
          <Text style={styles.body}>{web
            ? 'Cet aperçu nécessite le serveur local. Ses données sont séparées de celles d’Android.'
            : 'Vos données restent sur ce téléphone. Les mises à jour conservent vos données.'}</Text>
          <Text style={styles.body}>{web
            ? 'Effacer les données du navigateur supprime les transactions de test.'
            : 'Désinstaller l’app ou effacer ses données supprime vos transactions. Pensez aux sauvegardes.'}</Text>
        </Disclosure>
        <View style={styles.about}>
          <Text style={styles.body}>Version {Constants.expoConfig?.version ?? 'indisponible'}</Text>
        </View>

      </View>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing['2xl'] },
  sections: { gap: theme.spacing.xl },
  body: { ...theme.typography.body, color: theme.colors.textSubtle },
  payday: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.primaryDark },
  label: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  about: { alignItems: 'center', paddingVertical: theme.spacing.sm },
});
