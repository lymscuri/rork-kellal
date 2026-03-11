export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type RhFactor = 'Positif' | 'Négatif';

export type AllergySeverity = 'legere' | 'severe' | 'anaphylaxie';

export interface Allergy {
  id: string;
  name: string;
  type: 'medicament' | 'alimentaire' | 'autre';
  severity: AllergySeverity;
}

export interface ChronicDisease {
  id: string;
  name: string;
  diagnosedDate?: string;
  notes?: string;
  isActive: boolean;
}

export interface PermanentTreatment {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
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

export interface EmergencyContact {
  id: string;
  fullName: string;
  relationship: string;
  phoneNumber: string;
}

export interface PatientIdentity {
  photo?: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  sex?: 'M' | 'F';
  phone?: string;
  address?: string;
  commune?: string;
  prefecture?: string;
  dossierNumber: string;
  emergencyContacts: EmergencyContact[];
}

export interface CriticalInfo {
  bloodGroup?: BloodGroup;
  rhFactor?: RhFactor;
  drugAllergies: Allergy[];
  foodAllergies: Allergy[];
  chronicDiseases: string[];
  otherChronicDisease?: string;
  permanentTreatments: PermanentTreatment[];
  handicap?: string;
}

export interface PersonalHistory {
  pastIllnesses?: string;
  surgeries: Surgery[];
  hospitalizations: Hospitalization[];
  bloodTransfusion: boolean;
  bloodTransfusionDate?: string;
}

export interface FamilyHistory {
  diabetes: boolean;
  hypertension: boolean;
  cancer: boolean;
  sickleCell: boolean;
  hereditary: boolean;
}

export interface LifeHabits {
  tobacco: boolean;
  tobaccoQuantity?: string;
  alcohol: boolean;
  physicalActivity: 'sedentaire' | 'moderee' | 'active';
  specialDiet?: string;
}

export interface VitalSigns {
  weight?: number;
  height?: number;
  bmi?: number;
  temperature?: number;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  spo2?: number;
  respiratoryRate?: number;
}

export interface ClinicalExam {
  system: string;
  checked: boolean;
  observation?: string;
}

export interface PrescriptionItem {
  id: string;
  nameDCI: string;
  nameCommercial?: string;
  dose: string;
  unit: string;
  frequency: string[];
  duration: string;
  route: 'oral' | 'injectable' | 'topique';
  instructions?: string;
  allergyAlert?: boolean;
}

export interface ConsultationRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  vitalSigns: VitalSigns;
  clinicalExams: ClinicalExam[];
  mainDiagnosis: string;
  differentialDiagnosis?: string;
  treatment: string;
  prescriptions: PrescriptionItem[];
  requestedExams: string[];
  nextAppointment?: string;
  referral?: string;
  referralStructure?: string;
  observations?: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  examType: string;
  date: string;
  facility: string;
  result: string;
  unit?: string;
  interpretation?: string;
  photoUri?: string;
  prescribedBy: string;
}

export interface VaccineRecord {
  id: string;
  patientId: string;
  name: string;
  date: string;
  facility: string;
  doctor: string;
  nextReminder?: string;
  status: 'fait' | 'a_faire' | 'en_retard';
}

export interface PatientRecord {
  id: string;
  userId?: string;
  identity: PatientIdentity;
  criticalInfo: CriticalInfo;
  personalHistory: PersonalHistory;
  familyHistory: FamilyHistory;
  lifeHabits: LifeHabits;
  consultations: ConsultationRecord[];
  labResults: LabResult[];
  vaccines: VaccineRecord[];
  doctorIds: string[];
  doctorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorStats {
  totalPatients: number;
  monthConsultations: number;
  monthPrescriptions: number;
  patientsFollowed: number;
}

export interface Pregnancy {
  id: string;
  patientId: string;
  firstName: string;
  age: number;
  lastPeriodDate?: string;
  dueDate?: string;
  currentWeek: number;
  gravidity: number;
  parity: number;
  previousPregnancies: string[];
  deliveryPlace: string;
  referentDoctor?: string;
  isActive: boolean;
}

export interface WeeklyCheckup {
  id: string;
  pregnancyId: string;
  week: number;
  date: string;
  weight?: number;
  systolicBP?: number;
  diastolicBP?: number;
  symptoms: string[];
  fetalMovements?: 'actifs' | 'normaux' | 'reduits' | 'absents';
  mood?: 'bien' | 'fatigue' | 'anxieux';
}

export interface PrenatalConsultation {
  id: string;
  pregnancyId: string;
  weekTarget: number;
  description: string;
  status: 'a_venir' | 'effectuee' | 'en_retard';
  actualDate?: string;
  notes?: string;
}

export interface PrenatalExam {
  id: string;
  pregnancyId: string;
  date: string;
  week: number;
  weight?: number;
  systolicBP?: number;
  diastolicBP?: number;
  uterineHeight?: number;
  fetalHeartRate?: number;
  fetalPresentation?: 'cephalique' | 'siege' | 'transverse';
  labResults: string[];
  ultrasound?: string;
  prescriptions: string[];
  observations?: string;
  markedDone: boolean;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  firstName: string;
  birthDate: string;
  birthWeight?: number;
  birthHeight?: number;
  headCircumference?: number;
  apgarScore?: number;
}

export interface ChildGrowthRecord {
  id: string;
  childId: string;
  date: string;
  weight?: number;
  height?: number;
  headCircumference?: number;
  notes?: string;
}

export interface PEVVaccine {
  id: string;
  childId: string;
  name: string;
  targetAge: string;
  status: 'fait' | 'a_faire' | 'en_retard';
  doneDate?: string;
  facility?: string;
  note?: string;
}

export interface MaternityPatient {
  id: string;
  userId?: string;
  pregnancy: Pregnancy;
  weeklyCheckups: WeeklyCheckup[];
  prenatalConsultations: PrenatalConsultation[];
  prenatalExams: PrenatalExam[];
  children: ChildProfile[];
  childGrowth: ChildGrowthRecord[];
  childVaccines: PEVVaccine[];
  alertLevel: 'vert' | 'jaune' | 'rouge';
  soignantId?: string;
}

export interface SmsReminder {
  id: string;
  type: 'vaccination' | 'consultation' | 'checkup' | 'custom';
  targetPhone: string;
  language: 'francais' | 'pular' | 'malinke' | 'soussou';
  method: 'sms' | 'voice';
  message: string;
  scheduledDate: string;
  status: 'pending' | 'sent' | 'failed';
  patientName?: string;
}

export interface CaregiverMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'parent' | 'medecin' | 'sage_femme' | 'agent_sante';
  content: string;
  timestamp: string;
  isRead: boolean;
  childId?: string;
}

export interface MaternityReport {
  id: string;
  type: 'vaccination_coverage' | 'consultation_adherence' | 'delay_analysis' | 'growth_tracking';
  title: string;
  generatedDate: string;
  period: string;
  data: Record<string, number | string>;
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

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: ('matin' | 'midi' | 'soir' | 'nuit')[];
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

export interface GrowthRecord {
  id: string;
  childId: string;
  date: string;
  weight?: number;
  height?: number;
  headCircumference?: number;
  notes?: string;
}

export interface MaternityData {
  pregnancy?: Pregnancy;
  weeklyCheckups: WeeklyCheckup[];
  consultations: Consultation[];
  children: Child[];
  vaccines: Vaccine[];
  reminders: SmsReminder[];
  messages: CaregiverMessage[];
  reports: MaternityReport[];
  growthRecords: GrowthRecord[];
}

export interface MedicalConsultation {
  id: string;
  date: string;
  doctorName: string;
  specialty: string;
  diagnosis: string;
  notes?: string;
  prescriptions?: string[];
  hospital?: string;
  type: 'consultation' | 'urgence' | 'suivi' | 'specialiste';
}

export interface MedicalDocument {
  id: string;
  title: string;
  type: 'ordonnance' | 'analyse' | 'imagerie' | 'certificat' | 'compte_rendu' | 'autre';
  date: string;
  doctorName?: string;
  notes?: string;
}

export interface SharedAccess {
  id: string;
  doctorName: string;
  specialty: string;
  grantedDate: string;
  expiresDate?: string;
  accessLevel: 'complet' | 'partiel' | 'urgence';
  isActive: boolean;
}

export interface MedicalTimeline {
  id: string;
  date: string;
  type: 'consultation' | 'analyse' | 'hospitalisation' | 'chirurgie' | 'document' | 'medication';
  title: string;
  subtitle?: string;
  icon?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

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
