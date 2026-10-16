// src/theme/spacing.ts
export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24,
  '2xl': 32, '3xl': 40, '4xl': 48,
} as const;

export const layout = {
  gutter: 20,
  contentMaxWidth: 600,
  compactContentWidth: 360,
  compactTransactionWidth: 280,
  stackedFontScale: 1.3,
} as const;

export const size = {
  touchMin: 48,
  buttonMinHeight: 56,
  iconButton: 48,
  fab: 56,
  inputMinHeight: 56,
  amountMinHeight: 80,
  rowMinHeight: 72,
  navMinHeight: 64,
  progressHeight: 8,
  chart: 200,
  chartStroke: 24,
  borderWidth: 1,
  focusWidth: 2,
  focusGap: 2,
  iconStroke: 1.6,
  icon: { small: 16, medium: 20, default: 24, large: 28 },
} as const;
