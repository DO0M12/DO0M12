import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { C, F } from '@/lib/theme';
import { T } from './ui';

const R = 44;
const CIRC = 2 * Math.PI * R;

/** Whoop-style score dial: track, colored arc from 12 o'clock, number in the middle. */
export function Ring({ score, color, size = 104 }: { score: number | null; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Circle cx={50} cy={50} r={R} stroke={C.raised} strokeWidth={7} fill="none" />
        {score ? (
          <Circle
            cx={50}
            cy={50}
            r={R}
            stroke={color}
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(CIRC * score) / 100} ${CIRC}`}
            transform="rotate(-90 50 50)"
          />
        ) : null}
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T style={{ fontFamily: F.numBold, fontSize: size * 0.31, color: C.ink, fontVariant: ['tabular-nums'] }}>{score == null ? '—' : score}</T>
        {score != null ? <T style={{ fontFamily: F.num, fontSize: size * 0.14, color: C.muted }}>%</T> : null}
      </View>
    </View>
  );
}
