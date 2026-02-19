// Health & Body Type calculation utilities
import type { Language } from "@/i18n/index";

export interface BodyMetrics {
  weight: number;
  height: number;
  age: number;
  bodyFat: number;
  muscle: number;
}

export interface BMIResult {
  value: number;
  classification: string;
}

export interface BodyTypeResult {
  type: string;
  description: string;
}

const bmiClassifications: Record<Language, string[]> = {
  pt: ["Abaixo do peso", "Peso normal", "Sobrepeso", "Obeso"],
  en: ["Underweight", "Normal weight", "Overweight", "Obese"],
  es: ["Bajo peso", "Peso normal", "Sobrepeso", "Obeso"],
};

export function calculateBMI(weight: number, heightCm: number, lang: Language = "pt"): BMIResult {
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  const value = Math.round(bmi * 10) / 10;
  const labels = bmiClassifications[lang];

  let classification = "";
  if (bmi < 18.5) classification = labels[0];
  else if (bmi < 25) classification = labels[1];
  else if (bmi < 30) classification = labels[2];
  else classification = labels[3];

  return { value, classification };
}

interface BodyTypeEntry { type: string; description: string; }
type BodyTypeMap = Record<string, BodyTypeEntry>;

const bodyTypeTranslations: Record<Language, BodyTypeMap> = {
  pt: {
    skinny: { type: "Magro", description: "IMC abaixo do peso com baixo percentual de gordura" },
    skinnyBalanced: { type: "Magro Equilibrado", description: "IMC abaixo do peso com gordura moderada" },
    skinnyMuscular: { type: "Magro Musculoso", description: "IMC abaixo do peso com alta massa muscular" },
    skinnyGeneric: { type: "Magro", description: "IMC abaixo do peso" },
    muscularBalanced: { type: "Musculoso Equilibrado", description: "Ótima composição corporal com baixa gordura e alto músculo" },
    balanced: { type: "Equilibrado", description: "Composição corporal saudável dentro da normalidade" },
    lackExercise: { type: "Falta de Exercício", description: "Peso normal porém com excesso de gordura e baixa massa muscular" },
    thickSet: { type: "Grosso Conjunto", description: "Sobrepeso com massa muscular significativa" },
    overweight: { type: "Sobrepeso", description: "IMC em faixa de sobrepeso com gordura elevada" },
    obese: { type: "Obeso", description: "IMC em faixa de obesidade — recomenda-se acompanhamento médico" },
  },
  en: {
    skinny: { type: "Skinny", description: "BMI underweight with low body fat percentage" },
    skinnyBalanced: { type: "Skinny Balanced", description: "BMI underweight with moderate fat" },
    skinnyMuscular: { type: "Skinny Muscular", description: "BMI underweight with high muscle mass" },
    skinnyGeneric: { type: "Skinny", description: "BMI underweight" },
    muscularBalanced: { type: "Muscular Balanced", description: "Great body composition with low fat and high muscle" },
    balanced: { type: "Balanced", description: "Healthy body composition within normal range" },
    lackExercise: { type: "Lack of Exercise", description: "Normal weight but with excess fat and low muscle mass" },
    thickSet: { type: "Thick Set", description: "Overweight with significant muscle mass" },
    overweight: { type: "Overweight", description: "BMI in overweight range with elevated fat" },
    obese: { type: "Obese", description: "BMI in obesity range — medical follow-up recommended" },
  },
  es: {
    skinny: { type: "Delgado", description: "IMC bajo peso con bajo porcentaje de grasa" },
    skinnyBalanced: { type: "Delgado Equilibrado", description: "IMC bajo peso con grasa moderada" },
    skinnyMuscular: { type: "Delgado Musculoso", description: "IMC bajo peso con alta masa muscular" },
    skinnyGeneric: { type: "Delgado", description: "IMC bajo peso" },
    muscularBalanced: { type: "Musculoso Equilibrado", description: "Gran composición corporal con baja grasa y alto músculo" },
    balanced: { type: "Equilibrado", description: "Composición corporal saludable dentro de lo normal" },
    lackExercise: { type: "Falta de Ejercicio", description: "Peso normal pero con exceso de grasa y baja masa muscular" },
    thickSet: { type: "Corpulento", description: "Sobrepeso con masa muscular significativa" },
    overweight: { type: "Sobrepeso", description: "IMC en rango de sobrepeso con grasa elevada" },
    obese: { type: "Obeso", description: "IMC en rango de obesidad — se recomienda seguimiento médico" },
  },
};

export function calculateBodyType(
  weight: number,
  heightCm: number,
  age: number,
  imc: number,
  gorduraCorporal: number,
  musculo: number,
  lang: Language = "pt"
): BodyTypeResult {
  const muscleRatio = (musculo / weight) * 100;
  const highMuscle = muscleRatio > 40;
  const bt = bodyTypeTranslations[lang];

  if (imc < 18.5) {
    if (gorduraCorporal < 15) return bt.skinny;
    if (gorduraCorporal <= 20) return bt.skinnyBalanced;
    if (highMuscle) return bt.skinnyMuscular;
    return bt.skinnyGeneric;
  }

  if (imc <= 24.9) {
    if (gorduraCorporal < 18 && highMuscle) return bt.muscularBalanced;
    if (gorduraCorporal <= 25) return bt.balanced;
    return bt.lackExercise;
  }

  if (imc <= 29.9) {
    if (muscleRatio > 35) return bt.thickSet;
    return bt.overweight;
  }

  void age; void heightCm;
  return bt.obese;
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

  if (bmi > 30) bodyAge += (bmi - 30) * 0.5;
  else if (bmi > 25) bodyAge += (bmi - 25) * 0.3;
  else if (bmi < 18.5) bodyAge += (18.5 - bmi) * 0.3;

  if (bodyFat != null) {
    if (bodyFat > 30) bodyAge += (bodyFat - 30) * 0.4;
    else if (bodyFat > 25) bodyAge += (bodyFat - 25) * 0.2;
    else if (bodyFat < 12) bodyAge -= (12 - bodyFat) * 0.3;
    else if (bodyFat < 18) bodyAge -= (18 - bodyFat) * 0.2;
  }

  if (muscle != null && weight > 0) {
    const muscleRatio = (muscle / weight) * 100;
    if (muscleRatio > 45) bodyAge -= 3;
    else if (muscleRatio > 40) bodyAge -= 1.5;
  }

  return Math.max(Math.round(bodyAge), 10);
}

const localeMap: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

export function formatDate(date: string | null | undefined, lang: Language = "pt"): string {
  if (!date) return "—";
  const normalized = date.includes("T") ? date : date + "T00:00:00";
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(localeMap[lang]);
}

export function formatDateTime(date: string | null | undefined, lang: Language = "pt"): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(localeMap[lang]);
}

export function formatMonthYear(date: string | null | undefined, lang: Language = "pt"): string {
  if (!date) return "—";
  const normalized = date.includes("T") ? date : date + "T00:00:00";
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(localeMap[lang], { month: "2-digit", year: "numeric" });
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
