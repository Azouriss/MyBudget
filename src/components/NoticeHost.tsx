import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../stores/useAppStore';
import { theme } from '../theme';
import { NoticePopup } from './NoticePopup';

export function NoticeHost() {
  const notice = useAppStore((state) => state.notice);
  const noticeId = useAppStore((state) => state.noticeId);
  const clear = useAppStore((state) => state.clearNotice);
  const insets = useSafeAreaInsets();
  const dismiss = useCallback(() => clear(noticeId), [clear, noticeId]);
  if (!notice) return null;
  return <View pointerEvents="box-none" style={[styles.position, { top: insets.top + theme.spacing.lg }]}>
    <NoticePopup key={noticeId} message={notice} onDismiss={dismiss} />
  </View>;
}

const styles = StyleSheet.create({
  position: { position: 'absolute', left: theme.layout.gutter, right: theme.layout.gutter,
    alignItems: 'center', zIndex: 10 },
});
