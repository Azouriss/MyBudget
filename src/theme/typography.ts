import type { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  editorial: 'PlayfairDisplay-Regular',
  editorialSemibold: 'PlayfairDisplay-SemiBold',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40 },
  brand: { fontFamily: fontFamily.editorialSemibold, fontSize: 25, lineHeight: 34 },
  editorial: { fontFamily: fontFamily.editorial, fontSize: 28, lineHeight: 38 },
  financial: { fontFamily: fontFamily.editorialSemibold, fontSize: 34, lineHeight: 44 },
  headingXL: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 36 },
  headingL: { fontFamily: fontFamily.semibold, fontSize: 24, lineHeight: 32 },
  headingM: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 28 },
  headingS: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 18 },
  button: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  amount: { fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
