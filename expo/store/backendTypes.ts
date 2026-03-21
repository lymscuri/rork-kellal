/**
 * Types backend — Source de vérité absolue
 * Ces types correspondent EXACTEMENT aux réponses du backend Django
 * Aucune transformation, aucun mapping — utilisez-les tels quels
 */

export interface BackendPatient {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  prefecture: string;
  date_of_birth: string | null;
  numero_dossier: string | null;
  blood_type: string;
  allergies: string;
  chronic_diseases: string;
  permanent_treatments: string;
  personal_history: Record<string, any>;
  family_history: Record<string, any>;
  life_habits: Record<string, any>;
  critical_info: Record<string, any>;
  emergency_contacts: any[];
  linked_email: string;
  consultations: BackendConsultation[];
  vaccines: BackendVaccine[];
  surgeries: BackendSurgery[];
  hospitalisations: BackendHospitalisation[];
  direct_lab_tests?: BackendLabTest[];
  doctor: string;
  created_at: string;
  updated_at: string;
}

export interface BackendConsultation {
  id: string;
  date: string;
  motif: string;
  motif_detail: string;
  diagnostic: string;
  traitement: string;
  recommandations: string;
  poids: number | null;
  taille: number | null;
  tension_systolique: number | null;
  tension_diastolique: number | null;
  frequence_cardiaque: number | null;
  temperature: number | null;
  spo2: number | null;
  prochain_rdv: string | null;
  lab_tests: BackendLabTest[];
}

export interface BackendLabTest {
  id: string;
  test_name: string;
  test_type: string;
  status: string;
  ordered_date: string;
  completed_date: string | null;
  results: string;
  interpretation: string;
}

export interface BackendVaccine {
  id: string;
  vaccine_name: string;
  date_administered: string;
  dose_number: number;
  next_dose_date: string | null;
  notes: string;
}

export interface BackendSurgery {
  id: string;
  nom: string;
  date: string;
  hopital: string;
  notes: string;
}

export interface BackendHospitalisation {
  id: string;
  motif: string;
  date_entree: string;
  date_sortie: string | null;
  hopital: string;
  notes: string;
}

export interface BackendMaternityPatient {
  id: string;
  maternity_id?: string;
  first_name: string;
  last_name?: string;
  full_name?: string;
  age: number | null;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  doctor?: string;
  linked_email: string;
  created_at?: string;
  pregnancy: BackendPregnancy | null;
  weekly_checkups?: any[];
  prenatal_consultations: BackendPrenatalConsultation[];
  children?: any[];
  alert_level?: string;
  vaccinations_pev?: any[];
}

export interface BackendPregnancy {
  id: string;
  last_period_date: string | null;
  due_date: string | null;
  current_week: number | null;
  gravidity: number | null;
  parity: number | null;
  previous_pregnancies: number | null;
  delivery_place: string;
  referent_doctor: string;
  is_active: boolean;
}

export interface BackendPrenatalConsultation {
  id: string;
  date: string;
  week: number | null;
  weight: number | null;
  blood_pressure: string;
  fetal_heart_rate: number | null;
  notes: string;
  next_appointment: string | null;
}
