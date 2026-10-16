// src/theme/shadows.ts
import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';

export const shadows = {
  none: { elevation: 0 },
  floating: { elevation: 2 },
  card: Platform.select({
    web: { boxShadow: '0px 4px 16px rgba(39, 59, 53, 0.045)' },
    default: { elevation: 1, shadowColor: colors.textPrimary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 },
  }),
} satisfies Record<string, ViewStyle>;
