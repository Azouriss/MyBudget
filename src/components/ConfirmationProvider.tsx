import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Button } from './Button';

type Confirmation = { title: string; message: string; confirmLabel: string; destructive?: boolean };
type Confirm = (options: Confirmation) => Promise<boolean>;
const Context = createContext<Confirm | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const [request, setRequest] = useState<Confirmation | null>(null);
  const resolve = useRef<((confirmed: boolean) => void) | null>(null);
  const confirm = useCallback<Confirm>((options) => {
    if (resolve.current) return Promise.resolve(false);
    return new Promise<boolean>((done) => { resolve.current = done; setRequest(options); });
  }, []);
  function close(confirmed: boolean) {
    const done = resolve.current;
    resolve.current = null;
    setRequest(null);
    done?.(confirmed);
  }
  return <Context.Provider value={confirm}>
    <View style={styles.root} importantForAccessibility={request ? 'no-hide-descendants' : 'auto'}>{children}</View>
    <Modal visible={!!request} transparent animationType="none" onRequestClose={() => close(false)}>
      <View style={styles.scrim}>
        <Pressable accessible={false} importantForAccessibility="no" style={StyleSheet.absoluteFill}
          onPress={() => close(false)} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            <Text accessibilityRole="header" style={styles.title}>{t(request?.title)}</Text>
            <Text style={styles.copy}>{t(request?.message)}</Text>
            <Button title={t("Annuler")} onPress={() => close(false)} variant="secondary" />
            <Button title={t(request?.confirmLabel ?? "Confirmer")} onPress={() => close(true)}
              variant={request?.destructive ? 'destructive' : 'primary'} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </Context.Provider>;
}

export function useConfirmation() {
  const confirm = useContext(Context);
  if (!confirm) throw new Error('ConfirmationProvider manquant.');
  return confirm;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { flex: 1, backgroundColor: theme.colors.scrim, justifyContent: 'center', alignItems: 'center', padding: theme.layout.gutter },
  dialog: { width: '100%', maxWidth: theme.layout.contentMaxWidth, maxHeight: '90%',
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, overflow: 'hidden' },
  dialogContent: { padding: theme.spacing.xl, gap: theme.spacing.md },
  title: { ...theme.typography.headingM, color: theme.colors.textPrimary },
  copy: { ...theme.typography.body, color: theme.colors.textSubtle },
});
