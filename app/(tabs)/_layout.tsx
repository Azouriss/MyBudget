import { Tabs } from 'expo-router';
import { ClipboardList, Ellipsis, House, Wallet } from 'lucide-react-native';
import { Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const lines = fontScale >= theme.layout.stackedFontScale ? 2 : 1;
  const height = Math.max(theme.size.navMinHeight,
    theme.size.icon.default + theme.typography.caption.lineHeight * fontScale * lines + theme.spacing.lg);
  return <Tabs screenOptions={{ headerShown: false,
    tabBarActiveTintColor: theme.colors.primaryDark,
    tabBarInactiveTintColor: theme.colors.textSubtle,
    tabBarActiveBackgroundColor: theme.colors.transparent,
    tabBarStyle: { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border,
      height: height + insets.bottom, paddingTop: theme.spacing.xs,
      width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center' },
    tabBarLabel: ({ children, color }) => <Text allowFontScaling style={{
      ...theme.typography.caption, color, textAlign: 'center', paddingBottom: theme.spacing.xs,
    }}>{children}</Text>,
    sceneStyle: { backgroundColor: theme.colors.background },
  }}>
    {[
      { name: 'index', title: 'Accueil', Icon: House },
      { name: 'history', title: 'Dépenses', Icon: ClipboardList },
      { name: 'budgets', title: 'Budget', Icon: Wallet },
      { name: 'settings', title: 'Plus', Icon: Ellipsis },
    ].map(({ name, title, Icon }) => <Tabs.Screen key={name} name={name} options={{ title,
      tabBarIcon: ({ color, focused }) => <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.medium, backgroundColor: focused ? theme.colors.primaryLight : theme.colors.transparent }}>
        <Icon color={color} size={theme.size.icon.medium} strokeWidth={theme.size.iconStroke} />
      </View>,
    }} />)}
  </Tabs>;
}
