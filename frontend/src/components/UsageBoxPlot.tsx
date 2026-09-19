import { motion } from "framer-motion";
import type { UsageGroupStats } from "../lib/api";

const W = 320;
const H = 220;
const PAD_TOP = 20;
const PAD_BOTTOM = 34;
const PAD_LEFT = 42;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

function Group({
  stats,
  x,
  color,
  scale,
  delay,
}: {
  stats: UsageGroupStats;
  x: number;
  color: string;
  scale: (v: number) => number;
  delay: number;
}) {
  const boxW = 74;
  const yMin = scale(stats.min);
  const yMax = scale(stats.max);
  const yQ1 = scale(stats.q1);
  const yQ3 = scale(stats.q3);
  const yMedian = scale(stats.median);

  return (
    <g>
      <motion.line
        x1={x}
        x2={x}
        initial={{ y1: yMedian, y2: yMedian, opacity: 0 }}
        animate={{ y1: yMax, y2: yMin, opacity: 1 }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1.5}
      />
      <motion.line
        x1={x - 9}
        x2={x + 9}
        y1={yMax}
        y2={yMax}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.55, duration: 0.25 }}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1.5}
      />
      <motion.line
        x1={x - 9}
        x2={x + 9}
        y1={yMin}
        y2={yMin}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.55, duration: 0.25 }}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1.5}
      />
      <motion.rect
        x={x - boxW / 2}
        width={boxW}
        rx={6}
        initial={{ y: yMedian, height: 0, opacity: 0 }}
        animate={{ y: yQ3, height: Math.max(yQ1 - yQ3, 1), opacity: 1 }}
        transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={1.5}
      />
      <motion.line
        x1={x - boxW / 2}
        x2={x + boxW / 2}
        y1={yMedian}
        y2={yMedian}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.45, duration: 0.3 }}
        stroke={color}
        strokeWidth={2}
      />
      <text
        x={x}
        y={H - 10}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="#F1F5F9"
        fontFamily="Inter Tight, sans-serif"
      >
        {stats.label}
      </text>
      <text
        x={x}
        y={yMedian - 8}
        textAnchor="middle"
        fontSize={10}
        fill={color}
        fontFamily="JetBrains Mono, monospace"
      >
        {stats.median}
      </text>
    </g>
  );
}

export function UsageBoxPlot({
  retained,
  canceled,
}: {
  retained: UsageGroupStats;
  canceled: UsageGroupStats;
}) {
  const maxVal = Math.max(1, Math.ceil(Math.max(retained.max, canceled.max) * 1.15));
  const scale = (v: number) => PAD_TOP + PLOT_H * (1 - v / maxVal);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD_LEFT}
            x2={W - 10}
            y1={scale(t)}
            y2={scale(t)}
            stroke="rgba(255,255,255,0.06)"
          />
          <text
            x={PAD_LEFT - 6}
            y={scale(t) + 3}
            textAnchor="end"
            fontSize={9}
            fill="#64748B"
            fontFamily="JetBrains Mono, monospace"
          >
            {t}
          </text>
        </g>
      ))}
      <Group stats={retained} x={130} color="#3B82F6" scale={scale} delay={0.1} />
      <Group stats={canceled} x={230} color="#f87171" scale={scale} delay={0.28} />
    </svg>
  );
}
