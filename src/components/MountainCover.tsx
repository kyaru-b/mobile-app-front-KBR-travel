import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, Polygon, Rect } from 'react-native-svg';

import { color, coverPalette } from '@/theme';

type Variant = 'hero' | 'card' | 'tile' | 'thumb';

/** Формы гор в системе координат 360×200; низ картинки всегда виден. */
const SHAPES: Record<Variant, { peaks: string; snow: string; ground: string }> = {
  hero: {
    peaks: '0,200 0,125 60,85 110,115 180,22 245,95 295,62 360,105 360,200',
    snow: '180,22 164,44 174,41 181,50 189,40 198,45',
    ground: '0,200 0,150 100,132 200,148 290,124 360,138 360,200',
  },
  card: {
    peaks: '0,200 0,150 70,100 115,135 190,35 255,115 300,85 360,130 360,200',
    snow: '190,35 175,55 184,52 191,61 199,51 207,56',
    ground: '0,200 0,178 90,160 185,175 275,155 360,170 360,200',
  },
  tile: {
    peaks: '0,200 0,140 60,90 105,125 185,30 255,110 305,75 360,120 360,200',
    snow: '185,30 170,52 180,48 186,58 194,47 203,53',
    ground: '',
  },
  thumb: {
    peaks: '0,200 0,150 80,80 130,120 190,40 280,130 360,90 360,200',
    snow: '190,40 174,62 184,58 191,68 199,56 208,62',
    ground: '',
  },
};

type Props = {
  /** Ключ палитры направления из темы (covers). */
  cover: string | undefined;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** SVG-иллюстрация гор, цвет зависит от направления. */
export function MountainCover({ cover, variant = 'card', style, children }: Props) {
  const palette = coverPalette(cover);
  const shape = SHAPES[variant];
  return (
    <View style={[styles.root, { backgroundColor: palette.sky }, style]}>
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 360 200"
        preserveAspectRatio="xMidYMax slice"
      >
        <Rect x={0} y={0} width={360} height={200} fill={palette.sky} />
        <Polygon points={shape.peaks} fill={palette.mountain} />
        <Polygon points={shape.snow} fill={color.white} />
        {palette.lake ? (
          <Ellipse cx={180} cy={188} rx={130} ry={14} fill={palette.lake} />
        ) : (
          shape.ground !== '' &&
          palette.ground && <Polygon points={shape.ground} fill={palette.ground} />
        )}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
