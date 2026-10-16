import { colors, componentColors } from './colors';
import { typography, fontFamily } from './typography';
import { spacing, layout, size } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { motion } from './motion';
import { categoryVisuals } from './categories';

export const theme = {
  colors, components: componentColors, typography, fontFamily,
  spacing, layout, size, radius, shadows, motion, categoryVisuals,
} as const;

export type Theme = typeof theme;
export type { ColorToken } from './colors';
export type { TypographyToken } from './typography';
