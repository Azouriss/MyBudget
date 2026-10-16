import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

export function ScreenContainer({ children, footer, inTabs = true }: {
  children: ReactNode; footer?: ReactNode; inTabs?: boolean;
}) {
  return (
    <SafeAreaView edges={inTabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <View style={styles.column}>
        <View style={styles.content}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  column: { flex: 1, width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center' },
  content: { flex: 1 },
  footer: { paddingHorizontal: theme.layout.gutter, paddingVertical: theme.spacing.lg },
});
