

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;


const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'magnifyingglass': 'search',
  'line.3.horizontal.decrease.circle': 'filter-list',
  'line.3.horizontal.decrease.circle.fill': 'filter-list',
  'list.bullet': 'list',
  'map': 'map',
  'map.fill': 'map',
  'heart.fill': 'favorite',
  'clock.fill': 'schedule',
  'bell.fill': 'notifications',
  'person.circle.fill': 'account-circle',
  'rectangle.portrait.and.arrow.right': 'exit-to-app',
  'eye': 'visibility',
  'eye.slash': 'visibility-off',
  'car.fill': 'directions-car',
  'bicycle': 'directions-bike',
  'figure.walk': 'directions-walk',
  'tag.fill': 'local-offer',
  'xmark.circle.fill': 'cancel',
  'lock.fill': 'lock',
} as IconMapping;


export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
