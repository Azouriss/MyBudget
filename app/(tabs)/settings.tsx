import { useEffect, useState } from 'react';
import { Database, LockKeyhole, Wallet, WifiOff } from 'lucide-react-native';
import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ScreenHeading } from '../../src/components/ScreenHeading';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SurfaceCard } from '../../src/components/SurfaceCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { Button } from '../../src/components/Button';
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
      setPaydayStatus('Aucun jour de paie défini.');
    } catch {
      setPayday(null);
      setPaydayStatus('Le jour de paie n’a pas pu être chargé. Rouvrez les paramètres pour réessayer.');
    }
  }, [db, revision]);

  return <ScreenContainer>
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader />
      <ScreenHeading title="À votre rythme" />
      <View style={styles.sections}>
        <SurfaceCard featured>
          <LockKeyhole color={theme.colors.primaryDark} size={theme.size.icon.large} />
          <Text style={styles.featureTitle}>Votre budget, chez vous</Text>
          <Text style={styles.body}>Aucun compte à créer, aucune connexion bancaire.
            {web ? ' Les transactions de cet aperçu restent dans le stockage de ce navigateur, séparées de votre téléphone.'
              : ' Vos transactions restent dans la base locale de votre téléphone.'}</Text>
        </SurfaceCard>
        <SurfaceCard style={{ gap: theme.spacing.md }}>
          <Text style={styles.label}>Paie & abonnements</Text>
          <Text accessibilityLiveRegion="polite" style={payday === null ? styles.body : styles.payday}>
            {payday === null ? paydayStatus : `Jour de paie : le ${payday === 1 ? '1er' : payday} de chaque mois.`}
          </Text>
          <Text style={styles.body}>Choisissez votre jour de paie et gérez les dépenses qui reviennent.</Text>
          <Button title="Jour de paie et rappels" variant="secondary" onPress={() => router.push('/payday')} />
          <Button title="Dépenses récurrentes" variant="ghost" onPress={() => router.push('/recurring')} />
        </SurfaceCard>
        <View>
          <SectionHeader title="Au quotidien" />
          <SurfaceCard style={styles.rows}>
            <View style={styles.row}><Wallet color={theme.colors.primaryDark} size={theme.size.icon.default} />
              <View style={styles.copy}><Text style={styles.label}>Devise</Text><Text style={styles.body}>Euro · EUR</Text></View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}><WifiOff color={theme.colors.primaryDark} size={theme.size.icon.default} />
              <View style={styles.copy}><Text style={styles.label}>{web ? 'Aperçu sur ordinateur' : 'Disponible hors ligne'}</Text>
                <Text style={styles.body}>{web ? 'Le serveur local doit rester lancé pour ouvrir cet aperçu.'
                  : 'L’application installée fonctionne sans Internet ni service distant.'}</Text></View>
            </View>
          </SurfaceCard>
        </View>
        <View>
          <SectionHeader title="Vos données" />
          <SurfaceCard style={styles.row}><Database color={theme.colors.primaryDark} size={theme.size.icon.default} />
            <View style={styles.copy}><Text style={styles.label}>Conservation locale</Text>
              <Text style={styles.body}>{web
                ? 'Effacer les données du navigateur supprime les transactions de test. Cet aperçu ne synchronise pas vos données avec Android.'
                : 'Une mise à jour signée avec la même clé conserve vos transactions. Désinstaller l’application ou effacer ses données supprime la base locale.'}</Text>
            </View>
          </SurfaceCard>
        </View>
        <SurfaceCard>
          <Text style={styles.label}>À venir</Text>
          <Text style={styles.body}>Catégories personnalisées et sauvegardes JSON/CSV avec import et export. Ces fonctions ne sont pas encore disponibles.</Text>
        </SurfaceCard>
        <View style={styles.about}>
          <Text style={styles.label}>MyBudget</Text>
          <Text style={styles.body}>Version {Constants.expoConfig?.version ?? 'indisponible'} · Sauge & Crème</Text>
        </View>

      </View>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing['2xl'] },
  sections: { gap: theme.spacing.xl },
  featureTitle: { ...theme.typography.headingM, color: theme.colors.textPrimary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  body: { ...theme.typography.body, color: theme.colors.textSubtle },
  payday: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.primaryDark },
  label: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  rows: { gap: theme.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.lg },
  copy: { flex: 1, minWidth: 0 },
  divider: { height: theme.size.borderWidth, backgroundColor: theme.colors.border },
  about: { alignItems: 'center', paddingVertical: theme.spacing.sm },
});
