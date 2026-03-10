// Types médicaux pour SanteConnect

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type RhFactor = 'Positif' | 'Négatif';

export interface Allergy {
  id: string;
  name: string;
  type: 'medicament' | 'alimentaire' | 'autre';
  severity: 'legere' | 'moderee' | 'severe';
}

export interface ChronicDisease {
  id: string;
  name: string;
  diagnosedDate?: string;
  notes?: string;
}

export interface Surgery {
  id: string;
  name: string;
  date: string;
  hospital?: string;
}

export interface Hospitalization {
  id: string;
  reason: string;
  date: string;
  duration?: string;
  hospital?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: ('matin' | 'midi' | 'soir' | 'nuit')[];
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  fullName: string;
  relationship: string;
  phoneNumber: string;
}

export interface MedicalProfile {
  bloodGroup?: BloodGroup;
  rhFactor?: RhFactor;
  allergies: Allergy[];
  chronicDiseases: ChronicDisease[];
  surgeries: Surgery[];
  hospitalizations: Hospitalization[];
  medications: Medication[];
  emergencyContacts: EmergencyContact[];
}

// Maternité
export interface Pregnancy {
  id: string;
  lastPeriodDate?: string;
  dueDate?: string;
  currentWeek: number;
  isActive: boolean;
}

export interface WeeklyCheckup {
  week: number;
  date?: string;
  weight?: number;
  systolicBP?: number;
  diastolicBP?: number;
  symptoms: string[];
  notes?: string;
}

export interface Consultation {
  id: string;
  week: number;
  title: string;
  status: 'a_venir' | 'effectuee' | 'en_retard';
  date?: string;
}

export interface Child {
  id: string;
  firstName: string;
  birthDate?: string;
  birthWeight?: number;
}

export interface Vaccine {
  id: string;
  name: string;
  age: string;
  dueDate?: string;
  status: 'a_faire' | 'fait' | 'en_retard';
  doneDate?: string;
}

export interface MaternityData {
  pregnancy?: Pregnancy;
  weeklyCheckups: WeeklyCheckup[];
  consultations: Consultation[];
  children: Child[];
  vaccines: Vaccine[];
}

// Chat IA
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// Localisation
export interface Hospital {
  id: string;
  name: string;
  type: 'hospital' | 'pharmacy' | 'rescue';
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  is24h?: boolean;
  hasMaternity?: boolean;
  isOnDuty?: boolean;
  distance?: number;
}
