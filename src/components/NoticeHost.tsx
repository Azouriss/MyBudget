import { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../stores/useAppStore';
import { theme } from '../theme';
import { decorativeIconProps } from './decorativeIconProps';
import { IconButton } from './IconButton';

export function NoticeHost() {
  const notice = useAppStore((state) => state.notice);
  const clear = useAppStore((state) => state.clearNotice);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!notice) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const reader = await AccessibilityInfo.isScreenReaderEnabled();
      if (reader || !active) return;
      const delay = Platform.OS === 'android'
        ? await AccessibilityInfo.getRecommendedTimeoutMillis(5000) : 5000;
      if (active) timer = setTimeout(clear, delay);
    })().catch(() => { /* Keep the message dismissible if the platform API fails. */ });
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [notice, clear]);
  if (!notice) return null;
  return <View pointerEvents="box-none" style={[styles.position, { bottom: insets.bottom + theme.size.navMinHeight + theme.spacing.lg }]}>
    <View style={styles.notice}>
    <Check size={theme.size.icon.default} color={theme.colors.successText} {...decorativeIconProps} />
    <Text accessibilityLiveRegion="polite" style={styles.copy}>{notice}</Text>
    <IconButton icon={X} label="Fermer le message" onPress={clear} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  position: { position: 'absolute', left: theme.layout.gutter, right: theme.layout.gutter, alignItems: 'center' },
  notice: { width: '100%', maxWidth: theme.layout.contentMaxWidth - 2 * theme.layout.gutter,
    flexDirection: 'row', alignItems: 'center',
    gap: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: theme.colors.surface,
    borderWidth: theme.size.borderWidth, borderColor: theme.colors.controlBorder, borderRadius: theme.radius.medium },
  copy: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, flex: 1 },
});
