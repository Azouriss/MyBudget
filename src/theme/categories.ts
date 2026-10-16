import {
  BriefcaseBusiness, Car, Gamepad2, Heart, House, ShoppingBasket, Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, type ColorToken } from './colors';

export type DefaultCategoryId =
  | 'food' | 'housing' | 'transport' | 'leisure' | 'health'
  | 'other-expense' | 'salary' | 'other-income';

type CategoryVisual = {
  icon: LucideIcon;
  chart: string;
  iconColor: string;
  background: string;
};

function visual(icon: LucideIcon, chart: ColorToken, background: ColorToken, iconColor: ColorToken = 'textPrimary'): CategoryVisual {
  return {
    icon,
    chart: colors[chart],
    iconColor: colors[iconColor],
    background: colors[background],
  };
}

export const categoryVisuals = {
  food: visual(ShoppingBasket, 'chartSage', 'primaryLight', 'primaryDark'),
  housing: visual(House, 'chartSand', 'peachBackground'),
  transport: visual(Car, 'chartBlue', 'blueBackground'),
  leisure: visual(Gamepad2, 'chartPeach', 'sandBackground'),
  health: visual(Heart, 'chartRose', 'roseBackground'),
  'other-expense': visual(Wallet, 'chartStone', 'surfaceSecondary'),
  salary: visual(BriefcaseBusiness, 'chartSage', 'successBackground', 'primaryDark'),
  'other-income': visual(Wallet, 'chartBlue', 'blueBackground'),
} satisfies Record<DefaultCategoryId, CategoryVisual>;
