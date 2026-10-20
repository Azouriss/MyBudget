import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import Svg, { Circle, type CircleProps } from 'react-native-svg';
import { theme } from '../theme';
import { decorativeIconProps } from './decorativeIconProps';

export const NOTICE_DURATION_MS = 3000;
// Animated adds a native layout prop that SVG would otherwise forward to the web DOM.
const CountdownCircle = forwardRef<Circle, CircleProps & { collapsable?: boolean }>(
  function CountdownCircle({ collapsable: _collapsable, ...props }, ref) {
    return <Circle ref={ref} {...props} />;
  },
);
const AnimatedCircle = Animated.createAnimatedComponent(CountdownCircle);
const ringSize = theme.size.iconButton - 2 * theme.spacing.xs;
const ringRadius = (ringSize - theme.size.focusWidth) / 2;
const circumference = 2 * Math.PI * ringRadius;

export function NoticePopup({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useLanguage();
  const progress = useRef(new Animated.Value(1)).current;
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let active = true;
    let duration = NOTICE_DURATION_MS;
    let reducedMotion = true;
    let timer: ReturnType<typeof setTimeout>;
    let animation: Animated.CompositeAnimation | undefined;

    function schedule() {
      clearTimeout(timer);
      animation?.stop();
      const remaining = Math.max(0, startedAt + duration - Date.now());
      progress.setValue(reducedMotion ? 1 : remaining / duration);
      timer = setTimeout(() => { if (active) onDismiss(); }, remaining);
      if (!reducedMotion) {
        animation = Animated.timing(progress, { toValue: 0, duration: remaining,
          easing: Easing.linear, useNativeDriver: false, isInteraction: false });
        animation.start();
      }
    }

    schedule();
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (active) { reducedMotion = enabled; schedule(); }
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) { reducedMotion = enabled; schedule(); }
    }).catch(() => { /* Keep the countdown static when the motion preference is unavailable. */ });
    if (Platform.OS === 'android') {
      void AccessibilityInfo.getRecommendedTimeoutMillis(NOTICE_DURATION_MS).then((recommended) => {
        if (active && Number.isFinite(recommended) && recommended > duration) {
          duration = recommended;
          schedule();
        }
      }).catch(() => { /* The default three-second deadline remains active. */ });
    }
    return () => { active = false; clearTimeout(timer); animation?.stop(); listener.remove(); };
  }, [onDismiss, progress]);

  return <View style={styles.notice}>
    <View style={styles.icon}>
      <Check size={theme.size.icon.default} color={theme.colors.successText} {...decorativeIconProps} />
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.copy}>{t(message)}</Text>
    <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={t("Fermer le message")}
      onPress={onDismiss} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.close, {
        backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.transparent,
        borderColor: focused ? theme.colors.focusRing : theme.colors.transparent,
      }]}>
      <View pointerEvents="none" style={styles.ring}>
        <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} {...decorativeIconProps}>
          <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none"
            stroke={theme.colors.border} strokeWidth={theme.size.focusWidth} />
          <AnimatedCircle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none"
            stroke={theme.colors.primary} strokeWidth={theme.size.focusWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`} />
        </Svg>
      </View>
      <X size={theme.size.icon.medium} color={theme.colors.textAction} {...decorativeIconProps} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  notice: { width: '100%', maxWidth: theme.layout.contentMaxWidth - 2 * theme.layout.gutter,
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderWidth: theme.size.borderWidth,
    borderColor: theme.colors.border, borderRadius: theme.radius.medium,
    ...theme.shadows.card, ...theme.shadows.floating },
  icon: { width: theme.size.icon.default, flexShrink: 0, alignItems: 'center' },
  copy: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, flex: 1, minWidth: 0 },
  close: { width: theme.size.iconButton, height: theme.size.iconButton, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center', borderWidth: theme.size.focusWidth, borderRadius: theme.radius.full },
  ring: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
