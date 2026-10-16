import { Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import type { Category } from '../db/schema';
import { theme } from '../theme';
import type { DefaultCategoryId } from '../theme/categories';

export function categoryVisual(category?: Category) {
  const id = category?.id;
  return id && Object.hasOwn(theme.categoryVisuals, id)
    ? theme.categoryVisuals[id as DefaultCategoryId]
    : { icon: Wallet, chart: theme.colors.textSubtle,
      iconColor: theme.colors.primaryDark, background: theme.colors.primaryLight };
}

export function CategoryIcon({ category, size = theme.spacing['3xl'] }: { category?: Category; size?: number }) {
  const visual = categoryVisual(category);
  const Icon = visual.icon;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{
    width: size, height: size, backgroundColor: visual.background,
    borderRadius: theme.radius.full, alignItems: 'center', justifyContent: 'center',
  }}><Icon color={visual.iconColor} size={theme.size.icon.default} strokeWidth={theme.size.iconStroke} /></View>;
}
