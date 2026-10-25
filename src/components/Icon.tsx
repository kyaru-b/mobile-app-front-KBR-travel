import type { ReactNode } from 'react';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { color as palette, size as sizes } from '@/theme';

import type { ColorName } from './Text';

const ICONS = {
  bell: (
    <>
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M21 21l-4.35-4.35" />
    </>
  ),
  pin: (
    <>
      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <Circle cx={12} cy={10} r={3} />
    </>
  ),
  back: <Path d="M15 18l-6-6 6-6" />,
  chevron: <Path d="M9 18l6-6-6-6" />,
  close: <Path d="M18 6L6 18M6 6l12 12" />,
  heart: (
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
  ),
  chat: (
    <Path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.2a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5z" />
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  home: (
    <>
      <Path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V13h6v9" />
    </>
  ),
  mountain: <Path d="M2 20L9.5 7l4.5 7.5 2.5-3.5L22 20z" />,
  user: (
    <>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </>
  ),
  users: (
    <>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  car: (
    <>
      <Path d="M5 16V11l2-5h10l2 5v5z" />
      <Path d="M3 11h18" />
      <Circle cx={7.5} cy={16.5} r={1.5} />
      <Circle cx={16.5} cy={16.5} r={1.5} />
    </>
  ),
  route: (
    <>
      <Circle cx={6} cy={19} r={2} />
      <Circle cx={18} cy={5} r={2} />
      <Path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16" />
    </>
  ),
  send: <Path d="M5 12h14M13 6l6 6-6 6" />,
  edit: <Path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  alert: (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 8v4M12 16h.01" />
    </>
  ),
  wifiOff: (
    <Path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
  ),
  qr: (
    <>
      <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" />
      <Path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </>
  ),
  wallet: (
    <>
      <Path d="M20 7H5a2 2 0 0 1 0-4h13v4" />
      <Path d="M3 5v14a2 2 0 0 0 2 2h15V7" />
      <Path d="M16 14h.01" />
    </>
  ),
  ticket: (
    <Path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4zM13 5v2M13 11v2M13 17v2" />
  ),
  shield: <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  clock: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  check: <Path d="M20 6L9 17l-5-5" />,
  calendar: (
    <>
      <Path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS | 'star';

type Props = {
  name: IconName;
  color?: ColorName;
  size?: number;
  strokeWidth?: number;
};

export function Icon({ name, color = 'ink', size = sizes.icon, strokeWidth = 2 }: Props) {
  const stroke = palette[color];
  if (name === 'star') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
          fill={stroke}
        />
      </Svg>
    );
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </Svg>
  );
}
