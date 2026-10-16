import tokens from './tokens.json';

export const palette = tokens.palette;
const accessiblePalette = tokens.accessible;

export const colors = {
  ...palette,
  ...accessiblePalette,
  successText: palette.success,
  textOnPrimary: palette.surface,
  textAction: palette.primaryDark,
  controlBorder: palette.textMuted,
  focusRing: palette.primaryDark,
  disabledBackground: palette.surfaceSecondary,
  disabledForeground: accessiblePalette.textSubtle,
  chartTrack: palette.surfaceSecondary,
  scrim: 'rgba(39, 59, 53, 0.24)',
  transparent: 'transparent',
} as const;

export const componentColors = {
  primaryButton: {
    background: colors.primary,
    pressedBackground: colors.primaryDark,
    foreground: colors.textOnPrimary,
  },
  secondaryButton: {
    background: colors.surface,
    pressedBackground: colors.primaryLight,
    foreground: colors.textAction,
    border: colors.controlBorder,
  },
  ghostButton: {
    background: colors.transparent,
    pressedBackground: colors.primaryLight,
    foreground: colors.textAction,
  },
  input: {
    background: colors.surface,
    foreground: colors.textPrimary,
    placeholder: colors.textSubtle,
    border: colors.controlBorder,
    errorBorder: colors.danger,
    errorText: colors.dangerText,
  },
  budget: {
    normal: colors.primary,
    warning: colors.warning,
    exceeded: colors.danger,
    track: colors.chartTrack,
  },
} as const;

export type ColorToken = keyof typeof colors;
