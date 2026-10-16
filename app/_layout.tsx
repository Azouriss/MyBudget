import '../global.css';
import 'react-native-reanimated';
import { useEffect, useState, type ReactNode } from 'react';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '../src/db/DatabaseProvider';
import { ConfirmationProvider } from '../src/components/ConfirmationProvider';
import { FinanceRuntime } from '../src/features/payday/FinanceRuntime';
import { NoticeHost } from '../src/components/NoticeHost';
import { theme } from '../src/theme';

const fonts = {
  'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  'PlayfairDisplay-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
  'PlayfairDisplay-SemiBold': require('../assets/fonts/PlayfairDisplay-SemiBold.ttf'),
};

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: theme.colors.primary,
    background: theme.colors.background, card: theme.colors.surface,
    text: theme.colors.textPrimary, border: theme.colors.border,
    notification: theme.colors.danger },
};

function FontGate({ children, retry }: { children: ReactNode; retry: () => void }) {
  const [loaded, error] = useFonts(fonts);
  if (!loaded) return <View style={styles.loading}>
    {error ? <>
      <Text style={styles.fallbackText}>Impossible de charger les polices de MyBudget.</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.fallbackText}>Réessayer</Text></Pressable>
    </> : <ActivityIndicator color={theme.colors.primaryDark} accessibilityLabel="Chargement de MyBudget" />}
  </View>;
  return children;
}

function Navigation() {
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReducedMotion(enabled); })
      .catch(() => { if (active) setReducedMotion(true); });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  return <ThemeProvider value={navigationTheme}><SafeAreaProvider>
    <StatusBar style="dark" />
    <ConfirmationProvider>
      <DatabaseProvider>
        <Stack screenOptions={{ headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: reducedMotion ? 'none' : 'slide_from_right',
          animationDuration: reducedMotion ? theme.motion.reduced : theme.motion.standard,
        }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="transaction" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="payday" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="recurring" />
          <Stack.Screen name="recurring-expense" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="budget" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="provision" options={{ presentation: 'modal', gestureEnabled: false }} />
        </Stack>
        <FinanceRuntime />
        <NoticeHost />
      </DatabaseProvider>
    </ConfirmationProvider>
  </SafeAreaProvider></ThemeProvider>;
}

export default function RootLayout() {
  const [attempt, setAttempt] = useState(0);
  return <FontGate key={attempt} retry={() => setAttempt((value) => value + 1)}><Navigation /></FontGate>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: theme.layout.gutter, gap: theme.spacing.lg },
  fallbackText: { fontSize: theme.typography.body.fontSize, lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textPrimary, textAlign: 'center' },
  retry: { minHeight: theme.size.touchMin, padding: theme.spacing.lg,
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.medium },
});
