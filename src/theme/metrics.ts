/** Отступы, шаг 4. Поля экрана — space.screen. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 20,
} as const;

export const radius = {
  badge: 10,
  icon: 14,
  field: 16,
  card: 18,
  large: 24,
  pill: 999,
} as const;

/** Фиксированные размеры элементов. Минимальная область нажатия — size.touch. */
export const size = {
  touch: 44,
  hairline: 1,
  border: 1.5,
  focusBorder: 2,
  icon: 22,
  iconSm: 16,
  dot: 8,
  avatarSm: 28,
  avatar: 44,
  avatarLg: 64,
  thumb: 52,
  button: 54,
  fab: 52,
  tabBar: 64,
  coverHero: 300,
  coverCard: 150,
  coverTile: 112,
  seat: 14,
  codeCell: 56,
  bubbleMaxWidth: '78%',
  bannerOffset: 6,
} as const;

export const shadow = {
  card: {
    shadowColor: '#14161A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  fab: {
    shadowColor: '#FF8A3D',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

export const motion = {
  searchDebounceMs: 300,
  skeletonPulseMs: 800,
  toastMs: 2800,
} as const;

export const opacity = {
  pressed: 0.85,
  disabled: 0.45,
  muted: 0.7,
} as const;
