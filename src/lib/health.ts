// Health & Body Type calculation utilities

export interface BodyMetrics {
  weight: number;      // kg
  height: number;      // cm
  age: number;
  bodyFat: number;     // %
  muscle: number;      // kg
}

export interface BMIResult {
  value: number;
  classification: string;
}

export interface BodyTypeResult {
  type: string;
  description: string;
}

export function calculateBMI(weight: number, heightCm: number): BMIResult {
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  const value = Math.round(bmi * 10) / 10;

  let classification = "";
  if (bmi < 18.5) classification = "Abaixo do peso";
  else if (bmi < 25) classification = "Peso normal";
  else if (bmi < 30) classification = "Sobrepeso";
  else classification = "Obeso";

  return { value, classification };
}

export function calculateBodyType(
  weight: number,
  heightCm: number,
  age: number,
  imc: number,
  gorduraCorporal: number,
  musculo: number
): BodyTypeResult {
  // Muscle ratio relative to weight as proxy for "high muscle"
  const muscleRatio = (musculo / weight) * 100;
  const highMuscle = muscleRatio > 40;

  if (imc < 18.5) {
    if (gorduraCorporal < 15) return { type: "Magro", description: "IMC abaixo do peso com baixo percentual de gordura" };
    if (gorduraCorporal <= 20) return { type: "Magro Equilibrado", description: "IMC abaixo do peso com gordura moderada" };
    if (highMuscle) return { type: "Magro Musculoso", description: "IMC abaixo do peso com alta massa muscular" };
    return { type: "Magro", description: "IMC abaixo do peso" };
  }

  if (imc <= 24.9) {
    if (gorduraCorporal < 18 && highMuscle) return { type: "Musculoso Equilibrado", description: "Ótima composição corporal com baixa gordura e alto músculo" };
    if (gorduraCorporal <= 25) return { type: "Equilibrado", description: "Composição corporal saudável dentro da normalidade" };
    return { type: "Falta de Exercício", description: "Peso normal porém com excesso de gordura e baixa massa muscular" };
  }

  if (imc <= 29.9) {
    if (muscleRatio > 35) return { type: "Grosso Conjunto", description: "Sobrepeso com massa muscular significativa" };
    return { type: "Sobrepeso", description: "IMC em faixa de sobrepeso com gordura elevada" };
  }

  return { type: "Obeso", description: "IMC em faixa de obesidade — recomenda-se acompanhamento médico" };
}

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function calculateBodyAge(
  chronologicalAge: number,
  bmi: number,
  bodyFat: number | null,
  muscle: number | null,
  weight: number
): number {
  let bodyAge = chronologicalAge;

  // BMI adjustment
  if (bmi > 30) bodyAge += (bmi - 30) * 0.5;
  else if (bmi > 25) bodyAge += (bmi - 25) * 0.3;
  else if (bmi < 18.5) bodyAge += (18.5 - bmi) * 0.3;

  // Body fat adjustment
  if (bodyFat != null) {
    if (bodyFat > 30) bodyAge += (bodyFat - 30) * 0.4;
    else if (bodyFat > 25) bodyAge += (bodyFat - 25) * 0.2;
    else if (bodyFat < 12) bodyAge -= (12 - bodyFat) * 0.3;
    else if (bodyFat < 18) bodyAge -= (18 - bodyFat) * 0.2;
  }

  // Muscle ratio adjustment
  if (muscle != null && weight > 0) {
    const muscleRatio = (muscle / weight) * 100;
    if (muscleRatio > 45) bodyAge -= 3;
    else if (muscleRatio > 40) bodyAge -= 1.5;
  }

  return Math.max(Math.round(bodyAge), 10);
}

export function generatePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + numbers + symbols;

  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < 14; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split("").sort(() => Math.random() - 0.5).join("");
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  // If it's just a date (YYYY-MM-DD), append time to avoid timezone shift
  const normalized = date.includes("T") ? date : date + "T00:00:00";
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function formatMonthYear(date: string | null | undefined): string {
  if (!date) return "—";
  const normalized = date.includes("T") ? date : date + "T00:00:00";
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
}


export function getMetricDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  isPositiveGood: boolean = true
): { delta: number; isImprovement: boolean; isNeutral: boolean; formatted: string } | null {
  if (current == null || previous == null) return null;
  const delta = current - previous;
  const isNeutral = delta === 0;
  const isImprovement = isNeutral ? false : isPositiveGood ? delta > 0 : delta < 0;
  const sign = delta > 0 ? "+" : "";
  return {
    delta,
    isImprovement,
    isNeutral,
    formatted: `${sign}${delta.toFixed(2)}`,
  };
}
