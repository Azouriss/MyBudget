import { Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../theme';
import { decorativeIconProps } from './decorativeIconProps';

export function BrandMark({ size = 38 }: { size?: number }) {
  return <Image source={require('../../assets/branding/mybudget-mark.png')}
    style={{ width: size, height: size, borderRadius: size * 17 / 64 }}
    resizeMode="contain" fadeDuration={0} accessible={false} alt=""
    accessibilityIgnoresInvertColors />;
}

export function BotanicalSprig({ size = 72, mirrored = false }: { size?: number; mirrored?: boolean }) {
  return <Svg width={size * 0.65} height={size} viewBox="0 0 52 80" {...decorativeIconProps}>
    <Path d={mirrored ? 'M41 77C35 53 19 28 12 4' : 'M11 77C17 53 33 28 40 4'} stroke={theme.colors.eucalyptus} strokeWidth="1.2" fill="none" />
    <Path d="M24 52C8 51 4 38 6 29C17 33 24 40 24 52ZM30 39C29 24 35 13 46 7C47 24 42 34 30 39ZM18 65C7 63 1 54 2 45C13 49 18 56 18 65ZM34 27C21 26 16 17 17 8C28 11 34 17 34 27ZM24 55C27 42 37 38 49 38C44 50 36 55 24 55Z" fill={theme.colors.secondary} opacity="0.8" />
    <Path d="M24 52L9 34M30 39L43 12M18 65L5 50M34 27L20 12M24 55L44 41" stroke={theme.colors.eucalyptus} strokeWidth="0.7" fill="none" />
  </Svg>;
}
