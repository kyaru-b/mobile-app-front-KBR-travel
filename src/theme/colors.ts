export const color = {
  bg: '#F3F4F7',
  surface: '#FFFFFF',
  ink: '#14161A',
  muted: '#555B68',
  border: '#D9DCE3',
  accent: '#2F5BFF',
  accentSoft: '#E6ECFF',
  accent2: '#FF8A3D',
  success: '#0B6B42',
  successBg: '#E2F6EC',
  warning: '#B4570F',
  warningBg: '#FFF0E3',
  danger: '#D33A2C',
  dangerBg: '#FDE8E6',
  white: '#FFFFFF',
  overlay: 'rgba(20, 22, 26, 0.45)',
  skeleton: '#E4E6EC',
  /** Подложка сегментного переключателя. */
  track: '#E6E8EE',
  transparent: 'transparent',
} as const;

/** Фоны кругов с инициалами, выбираются по хэшу имени. */
export const avatarColors = ['#FFD9C2', '#D4F0E1', '#EADCF8', '#D6E2FF', '#FFE7A8'] as const;

export type CoverPalette = {
  sky: string;
  mountain: string;
  ground?: string;
  lake?: string;
};

/** Палитры SVG-обложек гор по slug направления (directions.slug из db/seed.sql). */
export const covers = {
  elbrus: { sky: '#C3D4F6', mountain: '#2F5BFF', ground: '#14161A' },
  cheget: { sky: '#CDEDEB', mountain: '#0E7C74', ground: '#14161A' },
  'blue-lakes': { sky: '#CFE1F5', mountain: '#2F79C7', lake: '#EEF5FD' },
  'chegem-waterfalls': { sky: '#E1DAF8', mountain: '#6B3FE0', lake: '#F3EFFD' },
  'upper-balkaria': { sky: '#D3EBDC', mountain: '#0B6B42', ground: '#14161A' },
  bezengi: { sky: '#DCE1EA', mountain: '#55606F', ground: '#14161A' },
  'jily-su': { sky: '#FDE8D4', mountain: '#C2510F', ground: '#14161A' },
  dombay: { sky: '#D7DBE4', mountain: '#3A3F4B', ground: '#14161A' },
} satisfies Record<string, CoverPalette>;

export type CoverKey = keyof typeof covers;

export function coverPalette(key: string | null | undefined): CoverPalette {
  return key && key in covers ? covers[key as CoverKey] : covers.elbrus;
}
