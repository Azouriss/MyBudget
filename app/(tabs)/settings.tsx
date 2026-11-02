import { t } from '../../src/i18n/locale';
import { useLanguage } from '../../src/i18n/useLanguage';
import { useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';
import { CalendarDays, ChevronRight, Download, FileInput, Repeat2, UserRound, Zap, type LucideIcon } from 'lucide-react-native';
import { decorativeIconProps } from '../../src/components/decorativeIconProps';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ScreenHeading } from '../../src/components/ScreenHeading';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SurfaceCard } from '../../src/components/SurfaceCard';
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
        <SurfaceCard style={styles.group}>
          <SettingsRow icon={UserRound} label={t("Profil et langue")} detail={profile ? profileLanguageLabel(profile.language) : t(profileStatus)} href="/profile" last />
        </SurfaceCard>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.label}>{t("Au quotidien")}</Text>
          <SurfaceCard style={styles.group}>
            <SettingsRow icon={CalendarDays} label={t("Jour de paie")} detail={payday === null ? t(paydayStatus) : t("Le {0} du mois", [payday])} href="/payday" />
            <SettingsRow icon={Repeat2} label={t("Récurrences")} href="/recurring" />
            <SettingsRow icon={Zap} label={t("Saisie express")} href="/quick-entry" last />
          </SurfaceCard>
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.label}>{t("Mes données")}</Text>
          <SurfaceCard style={styles.group}>
            <SettingsRow icon={Download} label={t("Sauvegardes et exports")} href="/data-transfer" />
            <SettingsRow icon={FileInput} label={t("Importer un relevé CSV")} href="/csv-import" last />
          </SurfaceCard>
        </View>
        <Disclosure title={t("Autres outils")}>
          <SurfaceCard style={styles.group}>
            <SettingsRow label={t("Budget de paie à paie")} href="/pay-cycle" />
            <SettingsRow label={t("Répartition et remboursements")} href="/expense-details" />
            <SettingsRow label={t("Comprendre mon mois")} href="/month-review" />
            <SettingsRow label={t("Renouvellements")} href="/renewals" last />
          </SurfaceCard>
        </Disclosure>
        <Disclosure title={t("À propos et données")}>
          <Text style={styles.body}>{web ? t("Aperçu web · Euro (EUR)") : t("Hors ligne · Euro (EUR)")}</Text>
          <Text style={styles.body}>{web
            ? t("Cet aperçu nécessite le serveur local. Ses données sont séparées de celles d’Android.")
            : t("Vos données restent sur ce téléphone. Les mises à jour conservent vos données.")}</Text>
          <Text style={styles.body}>{web
            ? t("Effacer les données du navigateur supprime les transactions de test.")
            : t("Désinstaller l’app ou effacer ses données supprime vos transactions. Pensez aux sauvegardes.")}</Text>
          <Text style={styles.body}>{t("Version ")}{Constants.expoConfig?.version ?? t('indisponible')}</Text>
        </Disclosure>
      </View>
    </ScrollView>
  </ScreenContainer>;
}

function SettingsRow({ icon: Icon, label, detail, href, last = false }: { icon?: LucideIcon; label: string; detail?: string; href: Href; last?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={detail ? `${label}, ${detail}` : label}
    onPress={() => router.push(href)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.row, last && styles.last, {
      backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.transparent,
      borderColor: focused ? theme.colors.focusRing : theme.colors.transparent,
    }]}>
    {Icon ? <View style={styles.icon}><Icon size={theme.size.icon.medium} color={theme.colors.textAction} {...decorativeIconProps} /></View> : null}
    <View style={styles.rowCopy}>
      <Text style={styles.rowLabel}>{label}</Text>
      {detail ? <Text style={styles.body}>{detail}</Text> : null}
    </View>
    <ChevronRight size={theme.size.icon.small} color={theme.colors.textSubtle} {...decorativeIconProps} />
  </Pressable>;
}
const styles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing['2xl'] },
  sections: { gap: theme.spacing.lg },
  section: { gap: theme.spacing.sm },
  group: { padding: theme.spacing.xs },
  body: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  label: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold, color: theme.colors.textSubtle },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.size.touchMin,
    padding: theme.spacing.md, borderWidth: theme.size.focusWidth, borderRadius: theme.radius.medium,
    borderBottomWidth: theme.size.borderWidth, borderBottomColor: theme.colors.border },
  last: { borderBottomWidth: 0 },
  rowCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  rowLabel: { ...theme.typography.body, fontFamily: theme.fontFamily.medium, color: theme.colors.textPrimary },
  icon: { padding: theme.spacing.sm, borderRadius: theme.radius.medium, backgroundColor: theme.colors.primaryLight },
});
