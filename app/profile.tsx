import { setLanguage, t } from '../src/i18n/locale';
import { useLanguage } from '../src/i18n/useLanguage';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { SettingsPage, settingsStyles as styles } from '../src/components/SettingsPage';
import { SurfaceCard } from '../src/components/SurfaceCard';
import { useConfirmation } from '../src/components/ConfirmationProvider';
import { useDatabase } from '../src/db/DatabaseProvider';
import { createProfileRepository } from '../src/features/profile/repository';
import { defaultProfile, profileLanguages, profileSchema, type Profile } from '../src/features/profile/validation';
import { useAppStore } from '../src/stores/useAppStore';

export default function ProfileScreen() {
  useLanguage();
  const db = useDatabase();
  const navigation = useNavigation();
  const confirm = useConfirmation();
  const busy = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const { control, reset, handleSubmit, setFocus, formState: { errors, isDirty, isSubmitting } } = useForm<Profile>({
    defaultValues: defaultProfile, resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    try {
      reset(createProfileRepository(db).get());
      setLoaded(true);
    } catch { setError('Impossible de charger le profil. Rouvrez cet écran pour réessayer.'); }
  }, [db, reset]);

  usePreventRemove(isDirty, ({ data }) => {
    if (!busy.current) void confirm({ title: t("Quitter sans enregistrer ?"),
      message: t("Les modifications du profil seront perdues."), confirmLabel: t("Quitter") })
      .then((ok) => { if (ok) navigation.dispatch(data.action); });
  });

  const save = handleSubmit((values) => {
    if (!loaded || busy.current) return;
    busy.current = true;
    setError('');
    try {
      const profile = createProfileRepository(db).save(values);
      reset(profile);
      setLanguage(profile.language);
      Keyboard.dismiss();
      useAppStore.getState().invalidate();
      useAppStore.getState().showNotice('Profil enregistré');
    } catch { setError('Impossible d’enregistrer. Votre saisie est conservée.'); }
    finally { busy.current = false; }
  });
  const disabled = !loaded || isSubmitting;

  return <SettingsPage title={t("Mon profil")} footer={<Button title={t("Enregistrer mon profil")} onPress={() => void save()}
    disabled={disabled || !isDirty} loading={isSubmitting} />}>
    <SurfaceCard style={styles.card}>
      <Text style={styles.label}>{t("Identité")}</Text>
      <Text style={styles.copy}>{t("Prénom et nom facultatifs, conservés sur cet appareil.")}</Text>
      <Controller control={control} name="firstName" render={({ field }) => <FormField label={t("Prénom")}
        ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
        error={errors.firstName?.message} editable={!disabled} autoComplete="given-name" textContentType="givenName"
        autoCapitalize="words" autoCorrect={false} maxLength={80} returnKeyType="next" onSubmitEditing={() => setFocus('lastName')} />} />
      <Controller control={control} name="lastName" render={({ field }) => <FormField label={t("Nom")}
        ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
        error={errors.lastName?.message} editable={!disabled} autoComplete="family-name" textContentType="familyName"
        autoCapitalize="words" autoCorrect={false} maxLength={80} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />} />
    </SurfaceCard>
    <SurfaceCard style={styles.card}>
      <Text style={styles.label}>{t("Langue du profil")}</Text>
      <Controller control={control} name="language" render={({ field }) => <SegmentedControl label={t("Langue du profil")}
        options={profileLanguages} value={field.value} onChange={field.onChange} disabled={disabled} />} />
    </SurfaceCard>
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{t(error)}</Text> : null}
  </SettingsPage>;
}
