import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { useAppStore } from '../../stores/useAppStore';
import { settingsStyles } from '../../components/SettingsPage';
import { Button } from '../../components/Button';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useNavigation } from 'expo-router';
import { useConfirmation } from '../../components/ConfirmationProvider';

export function useDraftGuard(dirty: boolean, busy: boolean) {
  const navigation = useNavigation(), confirm = useConfirmation();
  usePreventRemove(dirty || busy, ({ data }) => {
    if (busy) return;
    void confirm({ title: 'Quitter sans enregistrer ?', message: 'La saisie en cours sera perdue.', confirmLabel: 'Quitter' })
      .then((yes) => { if (yes) navigation.dispatch(data.action); });
  });
}

export function useLocalQuery<T>(read: () => T) {
  const revision = useAppStore((s) => s.revision);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ data?: T; error: boolean; revision: number }>({ error: false, revision: -1 });
  const reader = useRef(read); reader.current = read;
  useEffect(() => { try { setState({ data: reader.current(), error: false, revision }); }
    catch { setState({ error: true, revision }); } }, [revision, retry]);
  return { data: state.revision === revision ? state.data : undefined, error: state.error, retry: () => setRetry((n) => n + 1) };
}
export function useOperation() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  async function run(action: () => void | boolean | Promise<void | boolean>, success?: string) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const result = await action(); if (success && result !== false) useAppStore.getState().showNotice(success); }
    catch (e) { setError(e instanceof Error && e.name !== 'ZodError' && !/SQL|constraint|sqlite/i.test(e.message)
      ? e.message : 'Opération impossible. Vérifiez les champs ; les modifications de cette opération n’ont pas été appliquées.'); }
    finally { useAppStore.getState().invalidate(); lock.current = false; setBusy(false); }
  }
  return { busy, error, run };
}
export function QueryFeedback({ error, retry }: { error: boolean; retry: () => void }) {
  return <><Text style={settingsStyles.copy}>{error ? 'Chargement impossible.' : 'Chargement…'}</Text>
    {error ? <Button title="Réessayer" onPress={retry} /> : null}</>;
}
export function OperationError({ message }: { message: string }) {
  return message ? <Text accessibilityRole="alert" style={settingsStyles.error}>{message}</Text> : null;
}
