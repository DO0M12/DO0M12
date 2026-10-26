import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { C, F } from '@/lib/theme';

/** Seven rounded bars on a shared 0–100 scale; the last bar (today) is highlighted. */
export function WeekBars({ values, labels }: { values: (number | null)[]; labels: string[] }) {
  const [w, setW] = useState(0);
  const H = 132;
  const bw = 30;
  const step = w ? (w - bw) / (values.length - 1) : 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
      {w ? (
        <Svg width={w} height={H}>
          {values.map((s, i) => {
            const x = i * step;
            const last = i === values.length - 1;
            const h = s ? (84 * s) / 100 : 0;
            return (
              <G key={i}>
                <Rect x={x} y={22} width={bw} height={84} rx={7} fill={C.raised} />
                {s ? <Rect x={x} y={22 + 84 - h} width={bw} height={h} rx={7} fill={last ? C.orange : C.ink} opacity={last ? 1 : 0.8} /> : null}
                <SvgText x={x + bw / 2} y={14} fontSize={11} fontFamily={F.num} fill={C.muted} textAnchor="middle">
                  {s == null ? '–' : String(s)}
                </SvgText>
                <SvgText x={x + bw / 2} y={126} fontSize={11} fontFamily={F.semibold} fill={C.muted} textAnchor="middle">
                  {labels[i]}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

/** Line + soft area for a series over `span` days; missing days are skipped. */
export function Trend({ points, span, color = C.orange, height = 100 }: { points: [number, number][]; span: number; color?: string; height?: number }) {
  const [w, setW] = useState(0);
  if (points.length < 2) return null;
  const ys = points.map((p) => p[1]);
  const pad = Math.max(0.5, (Math.max(...ys) - Math.min(...ys)) * 0.15);
  const lo = Math.min(...ys) - pad;
  const hi = Math.max(...ys) + pad;
  const bottom = height - 14;
  const X = (x: number) => 6 + (x / (span - 1)) * (w - 12);
  const Y = (y: number) => bottom - ((y - lo) / (hi - lo)) * (bottom - 14);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w ? (
        <Svg width={w} height={height}>
          {[14, (14 + bottom) / 2, bottom].map((gy) => (
            <Line key={gy} x1={0} x2={w} y1={gy} y2={gy} stroke={C.line} strokeDasharray={gy === bottom ? undefined : '2 4'} />
          ))}
          <Path d={`${line} L${X(last[0])} ${bottom} L${X(points[0][0])} ${bottom} Z`} fill={color} opacity={0.12} />
          <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          <Circle cx={X(last[0])} cy={Y(last[1])} r={4} fill={color} stroke={C.surface} strokeWidth={2} />
        </Svg>
      ) : null}
    </View>
  );
}
