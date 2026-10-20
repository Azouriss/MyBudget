import { t } from '../../src/i18n/locale';
import { useLanguage } from '../../src/i18n/useLanguage';
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
import { createProfileRepository } from '../../src/features/profile/repository';
import { profileLanguageLabel, type Profile } from '../../src/features/profile/validation';
import { useAppStore } from '../../src/stores/useAppStore';
import { theme } from '../../src/theme';

export default function SettingsScreen() {
  useLanguage();
  const web = Platform.OS === 'web';
  const db = useDatabase();
  const revision = useAppStore((state) => state.revision);
  const [payday, setPayday] = useState<number | null>(null);
  const [paydayStatus, setPaydayStatus] = useState('Chargement du jour de paie…');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState('Chargement du profil…');

  useEffect(() => {
    try {
      setProfile(createProfileRepository(db).get());
    } catch {
      setProfile(null);
      setProfileStatus('Impossible de charger le profil.');
    }
  }, [db, revision]);

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
      <ScreenHeading title={t("Paramètres")} />
      <View style={styles.sections}>
        <SurfaceCard style={{ gap: theme.spacing.md }}>
          <Text style={styles.label}>{t("Profil")}</Text>
          {profile ? <>
            <Text style={styles.profileName}>{[profile.firstName, profile.lastName].filter(Boolean).join(' ') || t("Mon profil")}</Text>
            <Text style={styles.body}>{t("Langue du profil : ")}{profileLanguageLabel(profile.language)}</Text>
          </> : <Text accessibilityLiveRegion="polite" style={styles.body}>{t(profileStatus)}</Text>}
          <Button title={t("Modifier mon profil")} variant="secondary" onPress={() => router.push('/profile')} />
        </SurfaceCard>
        <SurfaceCard style={{ gap: theme.spacing.md }}>
          <Text style={styles.label}>{t("Paie & abonnements")}</Text>
          <Text accessibilityLiveRegion="polite" style={payday === null ? styles.body : styles.payday}>
            {payday === null ? t(paydayStatus) : t("Paie le {0} du mois.", [payday === 1 ? t("1er") : payday])}
          </Text>
          <Button title={t("Jour de paie et rappels")} variant="secondary" onPress={() => router.push('/payday')} />
          <Button title={t("Dépenses récurrentes")} variant="ghost" onPress={() => router.push('/recurring')} />
        </SurfaceCard>
        <SurfaceCard style={{ gap: theme.spacing.md }}>
          <Text style={styles.label}>{t("Vos outils")}</Text>
          <Button title={t("Sauvegardes et exports")} variant="secondary" onPress={() => router.push('/data-transfer')} />
          <Button title={t("Importer un relevé CSV")} variant="secondary" onPress={() => router.push('/csv-import')} />
          <Button title={t("Favoris et saisie express")} variant="secondary" onPress={() => router.push('/quick-entry')} />
          <Button title={t("Budget de paie à paie")} variant="secondary" onPress={() => router.push('/pay-cycle')} />
          <Button title={t("Répartition et remboursements")} variant="secondary" onPress={() => router.push('/expense-details')} />
          <Button title={t("Comprendre mon mois")} variant="secondary" onPress={() => router.push('/month-review')} />
          <Button title={t("Renouvellements")} variant="secondary" onPress={() => router.push('/renewals')} />
        </SurfaceCard>
        <Disclosure title={t("À propos et données")}>
          <Text style={styles.body}>{web ? t("Aperçu web · Euro (EUR)") : t("Hors ligne · Euro (EUR)")}</Text>
          <Text style={styles.body}>{web
            ? t("Cet aperçu nécessite le serveur local. Ses données sont séparées de celles d’Android.")
            : t("Vos données restent sur ce téléphone. Les mises à jour conservent vos données.")}</Text>
          <Text style={styles.body}>{web
            ? t("Effacer les données du navigateur supprime les transactions de test.")
            : t("Désinstaller l’app ou effacer ses données supprime vos transactions. Pensez aux sauvegardes.")}</Text>
        </Disclosure>
        <View style={styles.about}>
          <Text style={styles.body}>{t("Version ")}{Constants.expoConfig?.version ?? t('indisponible')}</Text>
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
  profileName: { ...theme.typography.headingM, color: theme.colors.textPrimary },
  label: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  about: { alignItems: 'center', paddingVertical: theme.spacing.sm },
});
