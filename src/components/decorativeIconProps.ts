import { Platform } from 'react-native';

// SVG's web renderer forwards `accessible` to the DOM, where it is not a boolean attribute.
export const decorativeIconProps = Platform.OS === 'web'
  ? { 'aria-hidden': true as const }
  : { accessible: false as const };
