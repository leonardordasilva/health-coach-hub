// Shared HealthRecord interface — single source of truth
export interface HealthRecord {
  id: string;
  record_date: string;
  weight: number;
  body_fat: number | null;
  water: number | null;
  basal_metabolism: number | null;
  visceral_fat: number | null;
  muscle: number | null;
  protein: number | null;
  bone_mass: number | null;
  created_at: string;
}

// Partial version used by the form (id is optional for new records)
export type HealthRecordInput = Omit<HealthRecord, "id" | "created_at"> & { id?: string };
