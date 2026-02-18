interface BodyParams {
  shoulderW: number;
  waistW: number;
  hipW: number;
}

const CX = 20;
const HEAD_CY = 7;
const HEAD_R = 6;
const NECK_TOP = 15;
const SHOULDER_Y = 21;
const WAIST_Y = 38;
const HIP_Y = 49;
const LEG_BOT = 62;
const GAP = 2.5; // half-gap between legs

function makePath({ shoulderW, waistW, hipW }: BodyParams): string {
  const sl = CX - shoulderW;
  const sr = CX + shoulderW;
  const wl = CX - waistW;
  const wr = CX + waistW;
  const hl = CX - hipW;
  const hr = CX + hipW;
  const lgl = CX - GAP;
  const lgr = CX + GAP;

  return [
    `M ${CX - 2.5} ${NECK_TOP}`,
    `C ${CX - 2.5} ${SHOULDER_Y - 3} ${sl + 3} ${SHOULDER_Y - 4} ${sl} ${SHOULDER_Y}`,
    `C ${sl - 1} ${WAIST_Y - 7} ${wl} ${WAIST_Y - 3} ${wl} ${WAIST_Y}`,
    `C ${wl} ${WAIST_Y + 3} ${hl} ${HIP_Y - 4} ${hl} ${HIP_Y}`,
    `L ${hl} ${LEG_BOT}`,
    `L ${lgl} ${LEG_BOT}`,
    `L ${lgl} ${HIP_Y}`,
    `L ${lgr} ${HIP_Y}`,
    `L ${lgr} ${LEG_BOT}`,
    `L ${hr} ${LEG_BOT}`,
    `L ${hr} ${HIP_Y}`,
    `C ${hr} ${HIP_Y - 4} ${wr} ${WAIST_Y + 3} ${wr} ${WAIST_Y}`,
    `C ${wr} ${WAIST_Y - 3} ${sr + 1} ${SHOULDER_Y - 7} ${sr} ${SHOULDER_Y}`,
    `C ${sr - 3} ${SHOULDER_Y - 4} ${CX + 2.5} ${SHOULDER_Y - 3} ${CX + 2.5} ${NECK_TOP}`,
    `Z`,
  ].join(" ");
}

const BODY_TYPES: Record<string, BodyParams> = {
  "Obeso":                 { shoulderW: 11, waistW: 14, hipW: 11 },
  "Sobrepeso":             { shoulderW: 10, waistW: 11, hipW: 10 },
  "Grosso Conjunto":       { shoulderW: 13, waistW: 9,  hipW: 10 },
  "Falta de Exercício":    { shoulderW: 8,  waistW: 10, hipW: 9  },
  "Equilibrado":           { shoulderW: 8,  waistW: 7,  hipW: 8  },
  "Musculoso Equilibrado": { shoulderW: 12, waistW: 5,  hipW: 8  },
  "Magro":                 { shoulderW: 5,  waistW: 4,  hipW: 5  },
  "Magro Equilibrado":     { shoulderW: 6,  waistW: 5,  hipW: 6  },
  "Magro Musculoso":       { shoulderW: 9,  waistW: 4,  hipW: 6  },
};

interface Props {
  bodyType: string;
  color?: string;
  width?: number;
  height?: number;
}

export default function BodyTypeIcon({ bodyType, color = "currentColor", width = 26, height = 42 }: Props) {
  const params = BODY_TYPES[bodyType] ?? BODY_TYPES["Equilibrado"];
  const path = makePath(params);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 66"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx={CX} cy={HEAD_CY} r={HEAD_R} />
      <path d={path} />
    </svg>
  );
}
