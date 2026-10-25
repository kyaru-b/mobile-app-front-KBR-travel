import type { TextStyle } from 'react-native';

/** Имена шрифтов совпадают с ключами, под которыми они загружаются в app/_layout.tsx. */
export const fontFamily = {
  display: 'Unbounded_700Bold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const text = {
  /** Заголовок экрана: «в горы вместе», «Направления». */
  h1: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  /** Название выезда на обложке. */
  h2: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  /** Заголовок большой карточки, имя в профиле. */
  h3: { fontFamily: fontFamily.display, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 17, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 17 },
  captionStrong: { fontFamily: fontFamily.bold, fontSize: 13, lineHeight: 17 },
  small: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fontFamily.extrabold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  button: { fontFamily: fontFamily.extrabold, fontSize: 16, lineHeight: 20 },
  tab: { fontFamily: fontFamily.bold, fontSize: 11, lineHeight: 14 },
  code: { fontFamily: fontFamily.extrabold, fontSize: 24, lineHeight: 30 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof text;
