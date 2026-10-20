import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { getDatabase, type AppDatabase } from './client';
import { DatabaseVersionError } from './migrateSafely';
import { theme } from '../theme';
import { Button } from '../components/Button';
import { RenewalRuntime } from '../features/renewals/RenewalRuntime';

const DatabaseContext = createContext<AppDatabase | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [failed, setFailed] = useState(false);
  const [requiresUpdate, setRequiresUpdate] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    setRequiresUpdate(false);
    getDatabase().then((database) => { if (active) setDb(database); }).catch((error: unknown) => {
      if (active) {
        setRequiresUpdate(error instanceof DatabaseVersionError);
        setFailed(true);
      }
    });
    return () => { active = false; };
  }, [attempt]);
  if (db) return <DatabaseContext.Provider value={db}>{children}<RenewalRuntime db={db} /></DatabaseContext.Provider>;
  return <View style={styles.screen}>
    {failed ? <>
      <Text accessibilityRole="header" style={styles.title}>{requiresUpdate ? t("Mise à jour nécessaire") : t("Ouverture impossible")}</Text>
      <Text style={styles.copy}>{requiresUpdate
        ? t("Cette version ne peut pas ouvrir vos données. Installez une version plus récente sans désinstaller l’application. Vos données n’ont pas été réinitialisées.")
        : t("La base locale n’a pas pu être ouverte. Vos données n’ont pas été réinitialisées.")}</Text>
      {Platform.OS === 'web' ? <Text style={styles.copy}>{t("Si MyBudget est ouvert dans un autre onglet, fermez-le, puis rechargez cette page.")}</Text> : null}
      <Button title={t("Réessayer")} onPress={() => setAttempt((value) => value + 1)} />
    </> : <>
      <ActivityIndicator color={theme.colors.primaryDark} size="large" />
      <Text accessibilityLiveRegion="polite" style={styles.copy}>{t("Ouverture de votre espace…")}</Text>
    </>}
  </View>;
}

export function useDatabase(): AppDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('Base locale indisponible.');
  return db;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background,
    padding: theme.layout.gutter, gap: theme.spacing.lg },
  title: { ...theme.typography.headingL, color: theme.colors.textPrimary },
  copy: { ...theme.typography.body, color: theme.colors.textSubtle, textAlign: 'center' },
});
