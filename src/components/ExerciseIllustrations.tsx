import { Defs, LinearGradient as SvgGradient, Stop, Circle, G, Line, Path, Rect, Ellipse } from 'react-native-svg';

type PoseProps = {
  color: string;
  size?: number;
};

function GradientBg({ color, size }: { color: string; size: number }) {
  return (
    <G>
      <Defs>
        <SvgGradient id={`grad_${color.replace('#','')}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </SvgGradient>
      </Defs>
      <Rect x={0} y={0} width={size} height={size} rx={18} ry={18} fill={`url(#grad_${color.replace('#','')})`} />
    </G>
  );
}

function Head({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={8} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={cx - 2.5} cy={cy - 1} r={1} fill="#fff" opacity={0.8} />
      <Circle cx={cx + 2.5} cy={cy - 1} r={1} fill="#fff" opacity={0.8} />
      <Path d={`M${cx - 3} ${cy + 3} Q${cx} ${cy + 5} ${cx + 3} ${cy + 3}`} stroke="#fff" strokeWidth={1} fill="none" opacity={0.6} />
    </G>
  );
}

function Torso({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  return <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />;
}

function UpperArm({ from, elbow, to, color }: { from: { x: number; y: number }; elbow: { x: number; y: number }; to: { x: number; y: number }; color: string }) {
  return (
    <G>
      <Line x1={from.x} y1={from.y} x2={elbow.x} y2={elbow.y} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <Line x1={elbow.x} y1={elbow.y} x2={to.x} y2={to.y} stroke="#fff" strokeWidth={2.8} strokeLinecap="round" />
    </G>
  );
}

function Forearm({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  return <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#fff" strokeWidth={2.8} strokeLinecap="round" />;
}

function LegPart({ from, knee, foot }: { from: { x: number; y: number }; knee: { x: number; y: number }; foot: { x: number; y: number } }) {
  return (
    <G>
      <Line x1={from.x} y1={from.y} x2={knee.x} y2={knee.y} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={knee.x} y1={knee.y} x2={foot.x} y2={foot.y} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
    </G>
  );
}

function WeightDisc({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2.5} opacity={0.7} />
      <Circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
    </G>
  );
}

function BarbellBar({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.6} />;
}

function ActionArc({ from, to, color }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }) {
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 10;
  return <Path d={`M${from.x} ${from.y} Q${midX} ${midY} ${to.x} ${to.y}`} stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.5} strokeDasharray="3,3" />;
}

function GlowDot({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={4} fill={color} opacity={0.4} />
      <Circle cx={cx} cy={cy} r={2} fill={color} opacity={0.7} />
    </G>
  );
}

export function ChestPress({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={34} cy={48} />
      <Torso from={{ x: 40, y: 48 }} to={{ x: 58, y: 52 }} />
      <UpperArm from={{ x: 42, y: 48 }} elbow={{ x: 48, y: 34 }} to={{ x: 46, y: 26 }} color={color} />
      <UpperArm from={{ x: 52, y: 48 }} elbow={{ x: 58, y: 34 }} to={{ x: 56, y: 26 }} color={color} />
      <LegPart from={{ x: 58, y: 52 }} knee={{ x: 68, y: 66 }} foot={{ x: 74, y: 62 }} />
      <LegPart from={{ x: 58, y: 52 }} knee={{ x: 66, y: 70 }} foot={{ x: 78, y: 66 }} />
      <ActionArc from={{ x: 46, y: 34 }} to={{ x: 46, y: 26 }} color={color} />
      <ActionArc from={{ x: 56, y: 34 }} to={{ x: 56, y: 26 }} color={color} />
      <WeightDisc cx={46} cy={26} r={4} color={color} />
      <WeightDisc cx={56} cy={26} r={4} color={color} />
      <GlowDot cx={30} cy={20} color={color} />
      <GlowDot cx={68} cy={22} color={color} />
    </G>
  );
}

export function BackRow({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={72} cy={24} />
      <Line x1={68} y1={32} x2={52} y2={52} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <UpperArm from={{ x: 60, y: 38 }} elbow={{ x: 48, y: 30 }} to={{ x: 42, y: 26 }} color={color} />
      <UpperArm from={{ x: 56, y: 42 }} elbow={{ x: 44, y: 34 }} to={{ x: 38, y: 30 }} color={color} />
      <LegPart from={{ x: 52, y: 52 }} knee={{ x: 44, y: 72 }} foot={{ x: 36, y: 76 }} />
      <LegPart from={{ x: 52, y: 52 }} knee={{ x: 58, y: 70 }} foot={{ x: 54, y: 78 }} />
      <BarbellBar x1={38} y1={26} x2={16} y2={18} color={color} />
      <WeightDisc cx={16} cy={18} r={5} color={color} />
      <ActionArc from={{ x: 48, y: 30 }} to={{ x: 42, y: 26 }} color={color} />
      <GlowDot cx={20} cy={12} color={color} />
    </G>
  );
}

export function Squat({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={50} cy={14} />
      <Torso from={{ x: 50, y: 22 }} to={{ x: 50, y: 46 }} />
      <Forearm from={{ x: 50, y: 30 }} to={{ x: 34, y: 42 }} />
      <Forearm from={{ x: 50, y: 30 }} to={{ x: 66, y: 42 }} />
      <LegPart from={{ x: 50, y: 46 }} knee={{ x: 36, y: 68 }} foot={{ x: 30, y: 60 }} />
      <LegPart from={{ x: 50, y: 46 }} knee={{ x: 64, y: 68 }} foot={{ x: 70, y: 60 }} />
      <ActionArc from={{ x: 50, y: 46 }} to={{ x: 36, y: 68 }} color={color} />
      <ActionArc from={{ x: 50, y: 46 }} to={{ x: 64, y: 68 }} color={color} />
      <BarbellBar x1={32} y1={28} x2={68} y2={28} color={color} />
      <WeightDisc cx={32} cy={28} r={5} color={color} />
      <WeightDisc cx={68} cy={28} r={5} color={color} />
      <GlowDot cx={50} cy={4} color={color} />
      <GlowDot cx={24} cy={40} color={color} />
      <GlowDot cx={76} cy={40} color={color} />
    </G>
  );
}

export function OverheadPress({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={50} cy={16} />
      <Torso from={{ x: 50, y: 24 }} to={{ x: 50, y: 50 }} />
      <UpperArm from={{ x: 50, y: 30 }} elbow={{ x: 48, y: 16 }} to={{ x: 42, y: 6 }} color={color} />
      <UpperArm from={{ x: 50, y: 30 }} elbow={{ x: 52, y: 16 }} to={{ x: 58, y: 6 }} color={color} />
      <LegPart from={{ x: 50, y: 50 }} knee={{ x: 42, y: 70 }} foot={{ x: 36, y: 74 }} />
      <LegPart from={{ x: 50, y: 50 }} knee={{ x: 58, y: 70 }} foot={{ x: 64, y: 74 }} />
      <ActionArc from={{ x: 48, y: 16 }} to={{ x: 42, y: 6 }} color={color} />
      <ActionArc from={{ x: 52, y: 16 }} to={{ x: 58, y: 6 }} color={color} />
      <WeightDisc cx={42} cy={6} r={5} color={color} />
      <WeightDisc cx={58} cy={6} r={5} color={color} />
      <GlowDot cx={50} cy={-2} color={color} />
    </G>
  );
}

export function BicepCurl({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={50} cy={14} />
      <Torso from={{ x: 50, y: 22 }} to={{ x: 50, y: 50 }} />
      <UpperArm from={{ x: 46, y: 32 }} elbow={{ x: 30, y: 38 }} to={{ x: 34, y: 26 }} color={color} />
      <UpperArm from={{ x: 54, y: 32 }} elbow={{ x: 70, y: 38 }} to={{ x: 66, y: 26 }} color={color} />
      <LegPart from={{ x: 50, y: 50 }} knee={{ x: 42, y: 68 }} foot={{ x: 36, y: 74 }} />
      <LegPart from={{ x: 50, y: 50 }} knee={{ x: 58, y: 68 }} foot={{ x: 64, y: 74 }} />
      <ActionArc from={{ x: 30, y: 38 }} to={{ x: 34, y: 26 }} color={color} />
      <ActionArc from={{ x: 70, y: 38 }} to={{ x: 66, y: 26 }} color={color} />
      <WeightDisc cx={34} cy={26} r={4} color={color} />
      <WeightDisc cx={66} cy={26} r={4} color={color} />
      <GlowDot cx={28} cy={48} color={color} />
      <GlowDot cx={72} cy={48} color={color} />
    </G>
  );
}

export function Crunch({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={36} cy={38} />
      <Line x1={42} y1={44} x2={60} y2={56} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <Forearm from={{ x: 46, y: 46 }} to={{ x: 42, y: 36 }} />
      <Forearm from={{ x: 50, y: 48 }} to={{ x: 46, y: 38 }} />
      <LegPart from={{ x: 60, y: 56 }} knee={{ x: 58, y: 72 }} foot={{ x: 56, y: 78 }} />
      <LegPart from={{ x: 60, y: 56 }} knee={{ x: 66, y: 70 }} foot={{ x: 68, y: 78 }} />
      <ActionArc from={{ x: 42, y: 44 }} to={{ x: 36, y: 38 }} color={color} />
      <GlowDot cx={28} cy={28} color={color} />
    </G>
  );
}

export function Running({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={54} cy={14} />
      <Line x1={52} y1={22} x2={44} y2={48} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <UpperArm from={{ x: 50, y: 28 }} elbow={{ x: 64, y: 24 }} to={{ x: 72, y: 30 }} color={color} />
      <UpperArm from={{ x: 48, y: 32 }} elbow={{ x: 34, y: 34 }} to={{ x: 28, y: 42 }} color={color} />
      <LegPart from={{ x: 44, y: 48 }} knee={{ x: 56, y: 64 }} foot={{ x: 68, y: 72 }} />
      <LegPart from={{ x: 44, y: 48 }} knee={{ x: 32, y: 62 }} foot={{ x: 24, y: 70 }} />
      <GlowDot cx={72} cy={16} color={color} />
      <GlowDot cx={28} cy={52} color={color} />
      <Line x1={54} y1={-2} x2={54} y2={6} stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
      <Line x1={48} y1={-4} x2={48} y2={4} stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.3} />
      <Line x1={60} y1={-4} x2={60} y2={4} stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.3} />
    </G>
  );
}

export function FullBody({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={50} cy={14} />
      <Torso from={{ x: 50, y: 22 }} to={{ x: 50, y: 50 }} />
      <Forearm from={{ x: 50, y: 30 }} to={{ x: 28, y: 18 }} />
      <Forearm from={{ x: 50, y: 30 }} to={{ x: 72, y: 18 }} />
      <LegPart from={{ x: 50, y: 50 }} knee={{ x: 34, y: 68 }} foot={{ x: 28, y: 78 }} />
      <LegPart from={{ x: 50, y: 50 }} knee={{ x: 66, y: 68 }} foot={{ x: 72, y: 78 }} />
      <GlowDot cx={28} cy={12} color={color} />
      <GlowDot cx={72} cy={12} color={color} />
      <GlowDot cx={50} cy={4} color={color} />
    </G>
  );
}

export function Cardio({ color, size }: PoseProps) {
  return Running({ color, size });
}

export function Flexibility({ color, size }: PoseProps) {
  const s = size ?? 100;
  return (
    <G>
      <GradientBg color={color} size={s} />
      <Head cx={28} cy={22} />
      <Line x1={34} y1={28} x2={50} y2={48} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <Forearm from={{ x: 38, y: 32 }} to={{ x: 56, y: 20 }} />
      <Forearm from={{ x: 36, y: 36 }} to={{ x: 24, y: 40 }} />
      <LegPart from={{ x: 50, y: 48 }} knee={{ x: 50, y: 66 }} foot={{ x: 44, y: 74 }} />
      <LegPart from={{ x: 50, y: 48 }} knee={{ x: 66, y: 56 }} foot={{ x: 78, y: 62 }} />
      <ActionArc from={{ x: 38, y: 32 }} to={{ x: 56, y: 20 }} color={color} />
      <GlowDot cx={22} cy={14} color={color} />
      <GlowDot cx={76} cy={52} color={color} />
    </G>
  );
}

export function Custom({ color, size }: PoseProps) {
  return FullBody({ color, size });
}

export function getExerciseIllustration(category: string) {
  const map: Record<string, React.FC<PoseProps>> = {
    Chest: ChestPress,
    Back: BackRow,
    Legs: Squat,
    Shoulders: OverheadPress,
    Arms: BicepCurl,
    Core: Crunch,
    Cardio: Cardio,
    'Full Body': FullBody,
    Flexibility: Flexibility,
    Custom: Custom,
  };
  return map[category] ?? FullBody;
}
