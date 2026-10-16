import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenContainer } from './ScreenContainer';
import { IconButton } from './IconButton';
import { theme } from '../theme';

export function SettingsPage({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return <ScreenContainer inTabs={false} footer={footer}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={settingsStyles.page}>
    <View style={settingsStyles.header}><IconButton icon={ArrowLeft} label="Retour aux paramètres" onPress={() => {
      if (router.canGoBack()) router.back(); else router.replace('/settings');
    }} /><Text accessibilityRole="header" style={settingsStyles.title}>{title}</Text></View>
    <View style={settingsStyles.fields}>{children}</View>
  </ScrollView></ScreenContainer>;
}
export const settingsStyles = StyleSheet.create({
  page: { paddingHorizontal: theme.layout.gutter, paddingBottom: theme.spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.lg },
  title: { ...theme.typography.headingM, color: theme.colors.textPrimary, flex: 1 },
  fields: { gap: theme.spacing.lg },
  label: { ...theme.typography.body, fontFamily: theme.fontFamily.semibold, color: theme.colors.textPrimary },
  copy: { ...theme.typography.bodySmall, color: theme.colors.textSubtle },
  error: { ...theme.typography.bodySmall, color: theme.colors.dangerText },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  card: { gap: theme.spacing.md },
});
