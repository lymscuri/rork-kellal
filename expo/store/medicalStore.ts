import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import { dossierAPI, maternityAPI, remindersAPI, extractErrorMessage } from './api';
import type {
  PatientRecord,
  PatientIdentity,
  CriticalInfo,
  PersonalHistory,
  FamilyHistory,
  LifeHabits,
  ConsultationRecord,
  LabResult,
  VaccineRecord,
  PrescriptionItem,
  MaternityPatient,
  Pregnancy,
  WeeklyCheckup,
  PrenatalConsultation,
  PrenatalExam,
  ChildProfile,
  ChildGrowthRecord,
  PEVVaccine,
  SmsReminder,
  DoctorStats,
  Surgery,
  Hospitalization,
} from '@/types/medical';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Helper: Merge arrays by ID - ne jamais supprimer ce qui existe localement
 * @param localArr Array local existant
 * @param backendArr Array provenant du backend
 * @returns Array fusionné sans doublons par ID
 */
function mergeById<T extends { id: string }>(localArr: T[], backendArr: T[]): T[] {
  const map = new Map<string, T>();
  // D'abord les locaux
  (localArr || []).forEach(item => map.set(item.id, item));
  // Backend écrase/ajoute par ID
  (backendArr || []).forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

/**
 * Helper: Parse backend string/array to drugAllergies array
 */
function parseDrugAllergies(value: unknown): Array<{id: string; name: string; type: 'medicament' | 'alimentaire' | 'autre'; severity: 'legere' | 'severe' | 'anaphylaxie'}> {
  if (!value) return [];

  // Si déjà un array bien formaté (from critical_info)
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    // Vérifier si déjà formaté avec {id, name, type, severity}
    if (value[0]?.name && value[0]?.type) {
      return value.map(item => ({
        id: item.id || genId(),
        name: item.name,
        type: item.type,
        severity: item.severity || 'legere',
      }));
    }
    // Si array de strings, mapper
    return value.map(item => ({
      id: genId(),
      name: String(item),
      type: 'autre' as const,
      severity: 'legere' as const,
    }));
  }

  // Si string, split et mapper
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(name => ({
      id: genId(),
      name: name.trim(),
      type: 'autre' as const,
      severity: 'legere' as const,
    }));
  }

  return [];
}

/**
 * Helper: Parse backend string/array to chronicDiseases array
 */
function parseChronicDiseases(value: unknown): string[] {
  if (!value) return [];

  // Si déjà un array
  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }

  // Si string, split
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  return [];
}

/**
 * Helper: Parse backend string/array to permanentTreatments array
 */
function parsePermanentTreatments(value: unknown): Array<{id: string; medication: string; dosage: string; frequency: string}> {
  if (!value) return [];

  // Si déjà un array bien formaté (from critical_info)
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    // Vérifier si déjà formaté avec {id, medication, dosage, frequency}
    if (value[0]?.medication && value[0]?.dosage) {
      return value.map(item => ({
        id: item.id || genId(),
        medication: item.medication,
        dosage: item.dosage,
        frequency: item.frequency,
      }));
    }
    // Si array de strings, mapper
    return value.map(item => ({
      id: genId(),
      medication: String(item),
      dosage: '',
      frequency: '',
    }));
  }

  // Si string, split et mapper
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(item => ({
      id: genId(),
      medication: item.trim(),
      dosage: '',
      frequency: '',
    }));
  }

  return [];
}

/**
 * Mapping convention: Backend uses snake_case, Frontend uses camelCase
 * Backend → Frontend examples:
 * - first_name → firstName
 * - date_of_birth → birthDate
 * - user_id → userId
 *
 * All API responses must be mapped using this convention
 *
 * TODO: Add runtime validation with Zod or yup for API responses
 * Currently using Record<string, unknown> which is type-unsafe
 */

const DEFAULT_PRENATAL_CONSULTATIONS: Omit<PrenatalConsultation, 'id' | 'pregnancyId'>[] = [
  { weekTarget: 8, description: 'Première consultation prénatale — prise de sang, examen général', status: 'a_venir' },
  { weekTarget: 12, description: 'Échographie T1 — datation, clarté nucale', status: 'a_venir' },
  { weekTarget: 20, description: 'Échographie T2 — morphologie fœtale', status: 'a_venir' },
  { weekTarget: 28, description: 'Consultation 7e mois — test O\'Sullivan, Rhésus', status: 'a_venir' },
  { weekTarget: 32, description: 'Échographie T3 — présentation, croissance', status: 'a_venir' },
  { weekTarget: 36, description: 'Consultation 8e mois — prélèvement vaginal', status: 'a_venir' },
  { weekTarget: 38, description: 'Consultation pré-accouchement', status: 'a_venir' },
  { weekTarget: 40, description: 'Terme prévu — surveillance renforcée', status: 'a_venir' },
];

const GUINEA_PEV_VACCINES: Omit<PEVVaccine, 'id' | 'childId'>[] = [
  { name: 'BCG', targetAge: 'Naissance', status: 'a_faire' },
  { name: 'VPO0', targetAge: 'Naissance', status: 'a_faire' },
  { name: 'Pentavalent 1', targetAge: '6 semaines', status: 'a_faire' },
  { name: 'Pneumocoque 1', targetAge: '6 semaines', status: 'a_faire' },
  { name: 'Pentavalent 2', targetAge: '10 semaines', status: 'a_faire' },
  { name: 'Pneumocoque 2', targetAge: '10 semaines', status: 'a_faire' },
  { name: 'Pentavalent 3', targetAge: '14 semaines', status: 'a_faire' },
  { name: 'Pneumocoque 3', targetAge: '14 semaines', status: 'a_faire' },
  { name: 'Fièvre jaune', targetAge: '9 mois', status: 'a_faire', note: '⚠️ Obligatoire en Guinée — sans ce vaccin, votre enfant ne peut pas être inscrit à l\'école.' },
  { name: 'Rougeole 1ère dose', targetAge: '9 mois', status: 'a_faire' },
  { name: 'Méningite A', targetAge: '12-23 mois', status: 'a_faire' },
  { name: 'Rougeole 2ème dose', targetAge: '15-18 mois', status: 'a_faire' },
  { name: 'DTC rappel', targetAge: '18 mois', status: 'a_faire' },
];

function syncToBackendUpdatePatient(patientId: string, data: Record<string, unknown>) {
  // Mapper les champs frontend vers les champs backend
  const mappedData: Record<string, unknown> = {};
  
  // Identité
  if (data.first_name !== undefined) mappedData.first_name = data.first_name;
  if (data.last_name !== undefined) mappedData.last_name = data.last_name;
  if (data.date_of_birth !== undefined) mappedData.date_of_birth = data.date_of_birth;
  if (data.gender !== undefined) mappedData.gender = data.gender;
  if (data.sex !== undefined) mappedData.gender = data.sex;
  if (data.phone !== undefined) mappedData.phone = data.phone;
  if (data.address !== undefined) mappedData.address = data.address;
  if (data.commune !== undefined) mappedData.city = data.commune;
  
  // Infos critiques → champs backend
  if (data.critical_info) {
    const ci = data.critical_info as Record<string, unknown>;
    if (ci.bloodGroup !== undefined) mappedData.blood_type = ci.bloodGroup;
    if (ci.drugAllergies) {
      const allergies = ci.drugAllergies as Array<{name: string}>;
      mappedData.allergies = Array.isArray(allergies) 
        ? allergies.map((a: {name: string}) => a.name).join(', ')
        : String(allergies);
    }
    if (ci.chronicDiseases) {
      const diseases = ci.chronicDiseases as string[];
      mappedData.chronic_conditions = Array.isArray(diseases)
        ? diseases.join(', ')
        : String(diseases);
    }
    // Envoyer aussi critical_info complet
    mappedData.critical_info = data.critical_info;
  }

  // Antécédents et habitudes → nouveaux champs backend
  if (data.personal_history !== undefined) mappedData.personal_history = data.personal_history;
  if (data.family_history !== undefined) mappedData.family_history = data.family_history;
  if (data.life_habits !== undefined) mappedData.life_habits = data.life_habits;

  dossierAPI.updatePatient(patientId, mappedData).then(() => {
    console.log('[MedicalStore] Backend patient updated:', patientId);
  }).catch((e) => {
    const errorMsg = extractErrorMessage(e);
    console.error('[MedicalStore] Backend updatePatient failed:', errorMsg);
  });
}

interface MedicalStore {
  patients: PatientRecord[];
  maternityPatients: MaternityPatient[];
  smsReminders: SmsReminder[];
  isSyncing: boolean;

  syncPatientsFromBackend: () => Promise<void>;
  syncMyRecordFromBackend: (userId: string) => Promise<void>;
  addPatient: (doctorId: string, identity: Partial<PatientIdentity>, userId?: string, linkedEmail?: string) => Promise<string>;
  getPatientsByDoctor: (doctorId: string) => PatientRecord[];
  getPatientById: (patientId: string) => PatientRecord | undefined;
  getPatientByDossierNumber: (dossierNumber: string) => PatientRecord | undefined;
  getPatientByUserId: (userId: string) => PatientRecord | undefined;
  getPatientByEmail: (email: string) => PatientRecord | undefined;
  autoLinkPatientByEmail: (email: string, userId: string) => PatientRecord | null;
  updatePatientIdentity: (patientId: string, identity: Partial<PatientIdentity>) => void;
  updateCriticalInfo: (patientId: string, info: Partial<CriticalInfo>) => void;
  updatePersonalHistory: (patientId: string, history: Partial<PersonalHistory>) => void;
  updateFamilyHistory: (patientId: string, history: Partial<FamilyHistory>) => void;
  updateLifeHabits: (patientId: string, habits: Partial<LifeHabits>) => void;
  addConsultation: (patientId: string, consultation: Omit<ConsultationRecord, 'id' | 'patientId'>) => void;
  addLabResult: (patientId: string, result: Omit<LabResult, 'id' | 'patientId'>) => Promise<string> | void;
  addVaccine: (patientId: string, vaccine: Omit<VaccineRecord, 'id' | 'patientId'>) => void;
  addSurgery: (patientId: string, surgery: Omit<Surgery, 'id'>) => Promise<string>;
  addHospitalisation: (patientId: string, hosp: Omit<Hospitalization, 'id'>) => Promise<string>;
  getDoctorStats: (doctorId: string) => DoctorStats;
  linkPatientToDoctor: (patientDossierNumber: string, doctorId: string) => boolean;
  linkPatientToUser: (patientId: string, userId: string) => void;

  getMyRecord: (userId: string) => PatientRecord | undefined;
  getMyRecordByEmail: (email: string) => PatientRecord | undefined;
  getMyPrescriptions: (userId: string) => { consultation: ConsultationRecord; prescriptions: PrescriptionItem[] }[];
  getQRCodeData: (userId: string) => string;
  searchPatientInStore: (email: string) => PatientRecord | null;
  searchPatientInStoreByPhone: (phone: string) => PatientRecord | null;

  addMaternityPatient: (soignantId: string, pregnancy: Omit<Pregnancy, 'id' | 'patientId'>, userId?: string, linkedEmail?: string) => Promise<string>;
  syncMaternityPatientsFromBackend: () => Promise<void>;
  syncMyMaternityFromBackend: (userId: string) => Promise<void>;
  getMaternityPatientsByDoctor: (doctorId: string) => MaternityPatient[];
  getMyMaternityData: (patientId: string) => MaternityPatient | undefined;
  getMyMaternityDataByUserId: (userId: string) => MaternityPatient | undefined;
  getMyMaternityDataByEmail: (email: string) => MaternityPatient | undefined;
  autoLinkMaternityByEmail: (email: string, userId: string) => MaternityPatient | null;
  linkMaternityToUser: (maternityId: string, userId: string) => void;
  addWeeklyCheckup: (patientId: string, checkup: Omit<WeeklyCheckup, 'id' | 'pregnancyId'>) => void;
  markPrenatalConsultationDone: (patientId: string, consultationId: string, date: string, notes?: string) => void;
  schedulePrenatalConsultation: (patientId: string, consultationId: string, scheduledDate: string) => void;
  addPrenatalExam: (patientId: string, exam: Omit<PrenatalExam, 'id' | 'pregnancyId'>) => void;
  addChild: (patientId: string, child: Omit<ChildProfile, 'id' | 'parentId'>) => string;
  addChildGrowth: (childId: string, record: Omit<ChildGrowthRecord, 'id' | 'childId'>) => void;
  markChildVaccineDone: (vaccineId: string, date: string, facility?: string) => void;

  addSmsReminder: (reminder: Omit<SmsReminder, 'id'>) => void;
  updateReminderStatus: (id: string, status: SmsReminder['status']) => void;
  getSmsReminders: () => SmsReminder[];
}

export const useMedicalStore = create<MedicalStore>()(
  persist(
    (set, get) => ({
      patients: [],
      maternityPatients: [],
      smsReminders: [],
      isSyncing: false,

      syncPatientsFromBackend: async () => {
        if (get().isSyncing) return;
        set({ isSyncing: true });
        try {
          console.log('[MedicalStore] Syncing patients from backend...');
          const res = await dossierAPI.listPatients();
          const backendPatients = res.data.data || res.data.results || res.data;

          if (Array.isArray(backendPatients) && backendPatients.length > 0) {
            set((state) => {
              const updatedPatients = [...state.patients];
              let addedCount = 0;
              let updatedCount = 0;

              backendPatients.forEach((bp: any) => {
                // ÉTAPE 1 : Trouver le patient existant AVANT de mapper
                const existing = state.patients.find(p =>
                  p.id === String(bp.id) ||
                  (p.linkedEmail && bp.email && p.linkedEmail === bp.email.toLowerCase()) ||
                  (p.userId && bp.user_id && p.userId === String(bp.user_id))
                );

                // ÉTAPE 2 : Mapper les arrays du backend
                // BUG 3 FIX : Consultations avec lab_tests imbriqués
                const mappedConsultations = (bp.consultations || []).map((c: any) => ({
                  id: String(c.id || genId()),
                  patientId: String(bp.id),
                  date: c.date || '',
                  motif: c.motif || '',
                  motifDetail: c.motif_detail || '',
                  diagnostic: c.diagnostic || '',
                  traitement: c.traitement || '',
                  recommandations: c.recommandations || '',
                  weight: c.poids ?? undefined,
                  height: c.taille ?? undefined,
                  systolicBP: c.tension_systolique ?? undefined,
                  diastolicBP: c.tension_diastolique ?? undefined,
                  heartRate: c.frequence_cardiaque ?? undefined,
                  temperature: c.temperature ?? undefined,
                  spo2: c.spo2 ?? undefined,
                  nextAppointment: c.prochain_rdv ?? undefined,
                  // lab_tests imbriqués
                  labTests: (c.lab_tests || []).map((lt: any) => ({
                    id: String(lt.id || genId()),
                    testName: lt.test_name || '',
                    testType: lt.test_type || '',
                    status: lt.status || 'pending',
                    results: lt.results || '',
                    interpretation: lt.interpretation || '',
                  })),
                }));
                // BUG 1 FIX : Vaccins depuis bp.vaccines (pas bp.vaccinations)
                const mappedVaccines = (bp.vaccines || bp.vaccinations || []).map((v: any) => ({
                  id: String(v.id || genId()),
                  patientId: String(bp.id),
                  vaccineName: v.vaccine_name || v.vaccineName || '',
                  dateAdministered: v.date_administered || v.dateAdministered || '',
                  doseNumber: v.dose_number || v.doseNumber || 1,
                  nextDoseDate: v.next_dose_date || v.nextDoseDate || undefined,
                  notes: v.notes || '',
                }));
                // BUG 2 FIX : Lab results extraits depuis consultations[].lab_tests[]
                const mappedLabResults = (bp.consultations || []).flatMap((c: any) =>
                  (c.lab_tests || []).map((lt: any) => ({
                    id: String(lt.id || genId()),
                    patientId: String(bp.id),
                    consultationId: String(c.id),
                    testName: lt.test_name || '',
                    testType: lt.test_type || '',
                    status: lt.status || 'pending',
                    orderedDate: lt.ordered_date || '',
                    completedDate: lt.completed_date || undefined,
                    results: lt.results || '',
                    interpretation: lt.interpretation || '',
                  }))
                );
                const mappedSurgeries = (bp.surgeries || bp.chirurgies || []).map((s: any) => ({
                  id: String(s.id || genId()),
                  name: s.nom || s.name || '',
                  date: s.date || '',
                  hospital: s.hopital || s.hospital || '',
                }));
                const mappedHospitalizations = (bp.hospitalisations || []).map((h: any) => ({
                  id: String(h.id || genId()),
                  reason: h.motif || h.reason || '',
                  date: h.date_entree || h.date || '',
                  duration: h.duree || h.duration || '',
                  hospital: h.hopital || h.hospital || '',
                }));

                // ÉTAPE 3 : Créer le patient mergé avec RÈGLES DE MERGE
                const mergedPatient: PatientRecord = {
                  id: String(bp.id),
                  userId: bp.user_id ? String(bp.user_id) : existing?.userId,
                  linkedEmail: bp.email?.toLowerCase() || existing?.linkedEmail,

                  // RÈGLE 4 — Identité : backend si non vide, sinon local
                  identity: {
                    firstName: bp.first_name || existing?.identity?.firstName || '',
                    lastName: bp.last_name || existing?.identity?.lastName || '',
                    dossierNumber: bp.dossier_number || existing?.identity?.dossierNumber || `KNY-${Date.now()}`,
                    emergencyContacts: bp.emergency_contacts || existing?.identity?.emergencyContacts || [],
                    photo: bp.photo || existing?.identity?.photo,
                    birthDate: bp.date_of_birth || bp.birth_date || existing?.identity?.birthDate,
                    sex: (bp.gender === 'M' || bp.gender === 'F' ? bp.gender : undefined) || existing?.identity?.sex,
                    phone: bp.phone || existing?.identity?.phone,
                    address: bp.address || existing?.identity?.address,
                    commune: bp.city || bp.commune || existing?.identity?.commune,
                    prefecture: bp.prefecture || existing?.identity?.prefecture,
                  },

                  // RÈGLE 3 — Objets imbriqués : merger champ par champ
                  criticalInfo: {
                    bloodGroup: bp.critical_info?.blood_type || bp.blood_type || existing?.criticalInfo?.bloodGroup || '',
                    rhFactor: bp.critical_info?.rhFactor || existing?.criticalInfo?.rhFactor,
                    drugAllergies: (bp.critical_info?.drugAllergies || bp.allergies)
                      ? parseDrugAllergies(bp.critical_info?.drugAllergies || bp.allergies)
                      : existing?.criticalInfo?.drugAllergies || [],
                    foodAllergies: bp.critical_info?.foodAllergies || existing?.criticalInfo?.foodAllergies || [],
                    chronicDiseases: (bp.critical_info?.chronicDiseases || bp.chronic_diseases || bp.chronic_conditions)
                      ? parseChronicDiseases(bp.critical_info?.chronicDiseases || bp.chronic_diseases || bp.chronic_conditions)
                      : existing?.criticalInfo?.chronicDiseases || [],
                    permanentTreatments: (bp.critical_info?.permanentTreatments || bp.permanent_treatments)
                      ? parsePermanentTreatments(bp.critical_info?.permanentTreatments || bp.permanent_treatments)
                      : existing?.criticalInfo?.permanentTreatments || [],
                    handicap: bp.critical_info?.handicap || existing?.criticalInfo?.handicap,
                    otherChronicDisease: bp.critical_info?.otherChronicDisease || existing?.criticalInfo?.otherChronicDisease,
                  },

                  personalHistory: {
                    pastIllnesses: bp.personal_history?.pastIllnesses || bp.personal_history?.past_illnesses || existing?.personalHistory?.pastIllnesses,
                    surgeries: mergeById(existing?.personalHistory?.surgeries || [], mappedSurgeries),
                    hospitalizations: mergeById(existing?.personalHistory?.hospitalizations || [], mappedHospitalizations),
                    bloodTransfusion: bp.personal_history?.bloodTransfusion ?? bp.personal_history?.blood_transfusion ?? existing?.personalHistory?.bloodTransfusion ?? false,
                    bloodTransfusionDate: bp.personal_history?.bloodTransfusionDate || bp.personal_history?.blood_transfusion_date || existing?.personalHistory?.bloodTransfusionDate,
                  },

                  familyHistory: bp.family_history || existing?.familyHistory || { diabetes: false, hypertension: false, cancer: false, sickleCell: false, hereditary: false },
                  // BUG 4 FIX : lifeHabits avec ?? pour préserver valeurs false
                  lifeHabits: {
                    tobacco: bp.life_habits?.tobacco ?? existing?.lifeHabits?.tobacco ?? false,
                    alcohol: bp.life_habits?.alcohol ?? existing?.lifeHabits?.alcohol ?? false,
                    physicalActivity: bp.life_habits?.physicalActivity
                      || bp.life_habits?.physical_activity
                      || existing?.lifeHabits?.physicalActivity
                      || 'moderee',
                    tobaccoQuantity: bp.life_habits?.tobaccoQuantity || existing?.lifeHabits?.tobaccoQuantity,
                    specialDiet: bp.life_habits?.specialDiet || existing?.lifeHabits?.specialDiet,
                  },

                  // RÈGLE 2 — Arrays : fusionner par ID
                  consultations: mergeById(existing?.consultations || [], mappedConsultations),
                  labResults: mergeById(existing?.labResults || [], mappedLabResults),
                  vaccines: mergeById(existing?.vaccines || [], mappedVaccines),

                  doctorIds: bp.doctor_ids || (bp.doctor ? [String(bp.doctor)] : []) || existing?.doctorIds || [],
                  doctorId: String(bp.doctor || bp.doctor_id || bp.created_by || existing?.doctorId),
                  createdAt: bp.created_at || existing?.createdAt || new Date().toISOString(),
                  updatedAt: bp.updated_at || new Date().toISOString(),
                };

                // ÉTAPE 4 : Ajouter ou mettre à jour
                const existingIndex = updatedPatients.findIndex(p =>
                  p.id === mergedPatient.id ||
                  (p.linkedEmail && mergedPatient.linkedEmail && p.linkedEmail === mergedPatient.linkedEmail) ||
                  (p.userId && mergedPatient.userId && p.userId === mergedPatient.userId)
                );

                if (existingIndex !== -1) {
                  updatedPatients[existingIndex] = mergedPatient;
                  updatedCount++;
                } else {
                  updatedPatients.push(mergedPatient);
                  addedCount++;
                }
              });

              console.log(`[MedicalStore] Synced ${backendPatients.length} patients from backend: ${updatedCount} updated, ${addedCount} added`);
              return { patients: updatedPatients };
            });
          } else {
            console.log('[MedicalStore] No patients from backend or empty response');
          }
        } catch (e) {
          console.warn('[MedicalStore] syncPatientsFromBackend failed:', extractErrorMessage(e));
        } finally {
          set({ isSyncing: false });
        }
      },

      syncMyRecordFromBackend: async (userId: string) => {
        try {
          console.log('[MedicalStore] Syncing my record from backend... userId:', userId);
          const res = await dossierAPI.myRecord();
          const data = res.data?.data || res.data;

          if (!data) {
            console.log('[MedicalStore] No data returned from my-record endpoint');
            return;
          }

          // ÉTAPE 1 : Trouver le patient existant AVANT de mapper
          const existing = get().patients.find(
            (p) =>
              p.userId === userId ||
              p.id === String(data.id) ||
              (p.linkedEmail && data.email && p.linkedEmail === data.email.toLowerCase())
          );

          // ÉTAPE 2 : Mapper les arrays du backend
          // BUG 3 FIX : Consultations avec lab_tests imbriqués
          const mappedConsultations = (data.consultations || []).map((c: any) => ({
            id: String(c.id || genId()),
            patientId: String(data.id),
            date: c.date || '',
            motif: c.motif || '',
            motifDetail: c.motif_detail || '',
            diagnostic: c.diagnostic || '',
            traitement: c.traitement || '',
            recommandations: c.recommandations || '',
            weight: c.poids ?? undefined,
            height: c.taille ?? undefined,
            systolicBP: c.tension_systolique ?? undefined,
            diastolicBP: c.tension_diastolique ?? undefined,
            heartRate: c.frequence_cardiaque ?? undefined,
            temperature: c.temperature ?? undefined,
            spo2: c.spo2 ?? undefined,
            nextAppointment: c.prochain_rdv ?? undefined,
            // lab_tests imbriqués
            labTests: (c.lab_tests || []).map((lt: any) => ({
              id: String(lt.id || genId()),
              testName: lt.test_name || '',
              testType: lt.test_type || '',
              status: lt.status || 'pending',
              results: lt.results || '',
              interpretation: lt.interpretation || '',
            })),
          }));
          // BUG 1 FIX : Vaccins depuis data.vaccines (pas data.vaccinations)
          const mappedVaccines = (data.vaccines || data.vaccinations || []).map((v: any) => ({
            id: String(v.id || genId()),
            patientId: String(data.id),
            vaccineName: v.vaccine_name || v.vaccineName || '',
            dateAdministered: v.date_administered || v.dateAdministered || '',
            doseNumber: v.dose_number || v.doseNumber || 1,
            nextDoseDate: v.next_dose_date || v.nextDoseDate || undefined,
            notes: v.notes || '',
          }));
          // BUG 2 FIX : Lab results extraits depuis consultations[].lab_tests[]
          const mappedLabResults = (data.consultations || []).flatMap((c: any) =>
            (c.lab_tests || []).map((lt: any) => ({
              id: String(lt.id || genId()),
              patientId: String(data.id),
              consultationId: String(c.id),
              testName: lt.test_name || '',
              testType: lt.test_type || '',
              status: lt.status || 'pending',
              orderedDate: lt.ordered_date || '',
              completedDate: lt.completed_date || undefined,
              results: lt.results || '',
              interpretation: lt.interpretation || '',
            }))
          );
          const mappedSurgeries = (data.surgeries || data.chirurgies || []).map((s: any) => ({
            id: String(s.id || genId()),
            name: s.nom || s.name || '',
            date: s.date || '',
            hospital: s.hopital || s.hospital || '',
          }));
          const mappedHospitalizations = (data.hospitalisations || []).map((h: any) => ({
            id: String(h.id || genId()),
            reason: h.motif || h.reason || '',
            date: h.date_entree || h.date || '',
            duration: h.duree || h.duration || '',
            hospital: h.hopital || h.hospital || '',
          }));

          // ÉTAPE 3 : Créer le patient mergé avec RÈGLES DE MERGE
          const mergedRecord: PatientRecord = {
            id: String(data.id),
            userId: userId,
            linkedEmail: data.email?.toLowerCase() || existing?.linkedEmail,

            // RÈGLE 4 — Identité : backend si non vide, sinon local
            identity: {
              firstName: data.first_name || existing?.identity?.firstName || '',
              lastName: data.last_name || existing?.identity?.lastName || '',
              dossierNumber: data.dossier_number || existing?.identity?.dossierNumber || `KNY-${Date.now()}`,
              emergencyContacts: data.emergency_contacts || existing?.identity?.emergencyContacts || [],
              photo: data.photo || existing?.identity?.photo,
              birthDate: data.date_of_birth || data.birth_date || existing?.identity?.birthDate,
              sex: (data.gender === 'M' || data.gender === 'F' ? data.gender : undefined) || existing?.identity?.sex,
              phone: data.phone || existing?.identity?.phone,
              address: data.address || existing?.identity?.address,
              commune: data.city || data.commune || existing?.identity?.commune,
              prefecture: data.prefecture || existing?.identity?.prefecture,
            },

            // RÈGLE 3 — Objets imbriqués : merger champ par champ
            criticalInfo: {
              bloodGroup: data.critical_info?.blood_type || data.blood_type || existing?.criticalInfo?.bloodGroup || '',
              rhFactor: data.critical_info?.rhFactor || existing?.criticalInfo?.rhFactor,
              drugAllergies: (data.critical_info?.drugAllergies || data.allergies)
                ? parseDrugAllergies(data.critical_info?.drugAllergies || data.allergies)
                : existing?.criticalInfo?.drugAllergies || [],
              foodAllergies: data.critical_info?.foodAllergies || existing?.criticalInfo?.foodAllergies || [],
              chronicDiseases: (data.critical_info?.chronicDiseases || data.chronic_diseases || data.chronic_conditions)
                ? parseChronicDiseases(data.critical_info?.chronicDiseases || data.chronic_diseases || data.chronic_conditions)
                : existing?.criticalInfo?.chronicDiseases || [],
              permanentTreatments: (data.critical_info?.permanentTreatments || data.permanent_treatments)
                ? parsePermanentTreatments(data.critical_info?.permanentTreatments || data.permanent_treatments)
                : existing?.criticalInfo?.permanentTreatments || [],
              handicap: data.critical_info?.handicap || existing?.criticalInfo?.handicap,
              otherChronicDisease: data.critical_info?.otherChronicDisease || existing?.criticalInfo?.otherChronicDisease,
            },

            personalHistory: {
              pastIllnesses: data.personal_history?.pastIllnesses || data.personal_history?.past_illnesses || existing?.personalHistory?.pastIllnesses,
              surgeries: mergeById(existing?.personalHistory?.surgeries || [], mappedSurgeries),
              hospitalizations: mergeById(existing?.personalHistory?.hospitalizations || [], mappedHospitalizations),
              bloodTransfusion: data.personal_history?.bloodTransfusion ?? data.personal_history?.blood_transfusion ?? existing?.personalHistory?.bloodTransfusion ?? false,
              bloodTransfusionDate: data.personal_history?.bloodTransfusionDate || data.personal_history?.blood_transfusion_date || existing?.personalHistory?.bloodTransfusionDate,
            },

            familyHistory: data.family_history || existing?.familyHistory || { diabetes: false, hypertension: false, cancer: false, sickleCell: false, hereditary: false },
            // BUG 4 FIX : lifeHabits avec ?? pour préserver valeurs false
            lifeHabits: {
              tobacco: data.life_habits?.tobacco ?? existing?.lifeHabits?.tobacco ?? false,
              alcohol: data.life_habits?.alcohol ?? existing?.lifeHabits?.alcohol ?? false,
              physicalActivity: data.life_habits?.physicalActivity
                || data.life_habits?.physical_activity
                || existing?.lifeHabits?.physicalActivity
                || 'moderee',
              tobaccoQuantity: data.life_habits?.tobaccoQuantity || existing?.lifeHabits?.tobaccoQuantity,
              specialDiet: data.life_habits?.specialDiet || existing?.lifeHabits?.specialDiet,
            },

            // RÈGLE 2 — Arrays : fusionner par ID
            consultations: mergeById(existing?.consultations || [], mappedConsultations),
            labResults: mergeById(existing?.labResults || [], mappedLabResults),
            vaccines: mergeById(existing?.vaccines || [], mappedVaccines),

            doctorIds: data.doctor_ids || (data.doctor_id ? [String(data.doctor_id)] : []) || existing?.doctorIds || [],
            doctorId: String(data.doctor_id || data.doctor || data.created_by || existing?.doctorId),
            createdAt: data.created_at || existing?.createdAt || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
          };

          // FLUX DE SYNCHRONISATION avec MERGE INTELLIGENT:
          // 1. Le médecin crée un dossier sur Railway avec le email du patient
          // 2. Le patient se connecte → on récupère son dossier via GET /dossiers/my-record/
          // 3. On trouve le dossier existant local et on MERGE intelligemment
          // 4. Backend gagne sur les champs remplis, local gagne sur les champs vides
          // 5. Arrays fusionnés par ID pour ne jamais perdre de données
          set((state) => {
            const existingIndex = state.patients.findIndex(
              (p) =>
                p.id === mergedRecord.id ||
                p.userId === mergedRecord.userId ||
                (p.linkedEmail && mergedRecord.linkedEmail && p.linkedEmail === mergedRecord.linkedEmail)
            );

            if (existingIndex !== -1) {
              // Dossier existe → Merger intelligemment
              console.log('[MedicalStore] Merging existing patient record from backend:', mergedRecord.id);
              const updatedPatients = [...state.patients];
              updatedPatients[existingIndex] = mergedRecord;
              return { patients: updatedPatients };
            } else {
              // Dossier n'existe pas → Ajouter
              console.log('[MedicalStore] Adding new patient record from backend:', mergedRecord.id);
              return {
                patients: [...state.patients, mergedRecord],
              };
            }
          });

          console.log('[MedicalStore] My record synced from backend:', mergedRecord.id, 'userId:', userId);
        } catch (e: any) {
          // Ignorer silencieusement les 404 (patient sans dossier)
          if (e?.response?.status !== 404) {
            console.warn('[MedicalStore] syncMyRecord failed:', extractErrorMessage(e));
          } else {
            console.log('[MedicalStore] No medical record found for current user (404)');
          }
        }
      },

      addPatient: async (doctorId, identity, userId, linkedEmail) => {
        try {
          const dossierNumber = identity.dossierNumber || `KNY-${new Date().getFullYear()}-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;

          const res = await dossierAPI.createPatient({
            first_name: identity.firstName || '',
            last_name: identity.lastName || '',
            date_of_birth: (() => {
              if (!identity.birthDate) return '1990-01-01';
              try {
                const d = new Date(identity.birthDate);
                if (isNaN(d.getTime())) return '1990-01-01';
                return d.toISOString().split('T')[0];
              } catch {
                return '1990-01-01';
              }
            })(),
            gender: identity.sex || 'M',
            phone: identity.phone || '',
            email: linkedEmail?.toLowerCase() || '',
            address: identity.address || '',
            city: identity.commune || identity.prefecture || '',
          });

          const backendId = res.data?.data?.id || res.data?.id || genId();
          console.log('[MedicalStore] Backend patient created with ID:', backendId);

          const newPatient: PatientRecord = {
            id: backendId,
            userId,
            linkedEmail: linkedEmail?.toLowerCase(),
            identity: {
              firstName: identity.firstName || '',
              lastName: identity.lastName || '',
              dossierNumber,
              emergencyContacts: identity.emergencyContacts || [],
              photo: identity.photo,
              birthDate: identity.birthDate,
              sex: identity.sex,
              phone: identity.phone,
              address: identity.address,
              commune: identity.commune,
              prefecture: identity.prefecture,
            },
            criticalInfo: {
              drugAllergies: [],
              foodAllergies: [],
              chronicDiseases: [],
              permanentTreatments: [],
            },
            personalHistory: {
              surgeries: [],
              hospitalizations: [],
              bloodTransfusion: false,
            },
            familyHistory: {
              diabetes: false,
              hypertension: false,
              cancer: false,
              sickleCell: false,
              hereditary: false,
            },
            lifeHabits: {
              tobacco: false,
              alcohol: false,
              physicalActivity: 'moderee',
            },
            consultations: [],
            labResults: [],
            vaccines: [],
            doctorIds: [doctorId],
            doctorId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set((state) => ({ patients: [...state.patients, newPatient] }));
          console.log('[MedicalStore] Patient added to store:', backendId, dossierNumber);

          return backendId;
        } catch (error) {
          console.error('[MedicalStore] Failed to create patient:', extractErrorMessage(error));
          throw error;
        }
      },

      getPatientsByDoctor: (doctorId) => {
        return get().patients.filter(p => p.doctorId === doctorId || (p.doctorIds && p.doctorIds.includes(doctorId)));
      },

      getPatientById: (patientId) => {
        return get().patients.find(p => p.id === patientId);
      },

      getPatientByDossierNumber: (dossierNumber) => {
        return get().patients.find(p => p.identity.dossierNumber === dossierNumber);
      },

      getPatientByUserId: (userId) => {
        return get().patients.find(p => p.userId === userId);
      },

      getPatientByEmail: (email) => {
        const lower = email.toLowerCase();
        return get().patients.find(p => p.linkedEmail === lower);
      },

      autoLinkPatientByEmail: (email, userId) => {
        const lower = email.toLowerCase();
        const patient = get().patients.find(p => p.linkedEmail === lower && !p.userId);
        if (patient) {
          set((state) => ({
            patients: state.patients.map(p =>
              p.id === patient.id
                ? { ...p, userId, updatedAt: new Date().toISOString() }
                : p
            ),
          }));
          console.log('[MedicalStore] Auto-linked patient', patient.id, 'to user', userId, 'via email', email);
          return patient;
        }
        const alreadyLinked = get().patients.find(p => p.linkedEmail === lower && p.userId === userId);
        if (alreadyLinked) {
          console.log('[MedicalStore] Patient already linked to this user');
          return alreadyLinked;
        }
        return null;
      },

      updatePatientIdentity: (patientId, identity) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, identity: { ...p.identity, ...identity }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        syncToBackendUpdatePatient(patientId, {
          first_name: identity.firstName,
          last_name: identity.lastName,
          date_of_birth: identity.birthDate,
          sex: identity.sex,
          phone: identity.phone,
          address: identity.address,
          commune: identity.commune,
          prefecture: identity.prefecture,
        });
      },

      updateCriticalInfo: (patientId, info) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, criticalInfo: { ...p.criticalInfo, ...info }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        syncToBackendUpdatePatient(patientId, { critical_info: info });
      },

      updatePersonalHistory: (patientId, history) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, personalHistory: { ...p.personalHistory, ...history }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        syncToBackendUpdatePatient(patientId, { personal_history: history });
      },

      updateFamilyHistory: (patientId, history) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, familyHistory: { ...p.familyHistory, ...history }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        syncToBackendUpdatePatient(patientId, { family_history: history });
      },

      updateLifeHabits: (patientId, habits) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, lifeHabits: { ...p.lifeHabits, ...habits }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        syncToBackendUpdatePatient(patientId, { life_habits: habits });
      },

      addConsultation: async (patientId, consultation) => {
        try {
          // Mapper les champs frontend vers backend
          const res = await dossierAPI.createConsultation(patientId, {
            patient: patientId,
            date: consultation.date,
            reason: consultation.reason,
            vital_signs: consultation.vitalSigns,
            symptoms: consultation.clinicalExams
              ?.map(exam => `${exam.system}: ${exam.observation || (exam.checked ? 'Normal' : 'Non examiné')}`)
              .join('\n') || '',
            diagnosis: consultation.mainDiagnosis || '',
            treatment: consultation.treatment || '',
            notes: consultation.observations || '',
          });

          const backendId = res.data?.data?.id || res.data?.id || genId();
          console.log('[MedicalStore] Backend consultation created with ID:', backendId);

          set((state) => ({
            patients: state.patients.map(p =>
              p.id === patientId
                ? {
                    ...p,
                    consultations: [{ ...consultation, id: backendId, patientId } as ConsultationRecord, ...p.consultations],
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          }));

          return backendId;
        } catch (error) {
          console.error('[MedicalStore] Failed to create consultation:', extractErrorMessage(error));
          throw error;
        }
      },

      addLabResult: async (patientId, result) => {
        const id = genId();
        // Optimistic update local d'abord
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? {
                  ...p,
                  labResults: [{ ...result, id, patientId } as LabResult, ...p.labResults],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
        // Puis sauvegarder au backend
        try {
          // Note: LabResult type has: examType, date, facility, result, interpretation, prescribedBy
          // Backend expects: test_name, test_type, status, ordered_date, results, notes
          const consultationId = (result as any).consultationId;
          if (consultationId) {
            const res = await dossierAPI.addLabTest(patientId, consultationId, {
              test_name: result.examType || '',
              test_type: result.examType || '',
              status: 'pending',
              ordered_date: result.date
                ? new Date(result.date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              results: result.result || '',
              interpretation: result.interpretation || '',
              notes: '',
            });
            const backendId = res.data?.data?.id || res.data?.id;
            if (backendId && backendId !== id) {
              // Mettre à jour l'ID local avec l'ID backend
              set((state) => ({
                patients: state.patients.map(p =>
                  p.id === patientId
                    ? {
                        ...p,
                        labResults: p.labResults.map(r =>
                          r.id === id ? { ...r, id: backendId } : r
                        ),
                      }
                    : p
                ),
              }));
              return backendId;
            }
          }
        } catch (error) {
          console.warn('[MedicalStore] addLabResult backend failed:',
            extractErrorMessage(error));
          // Garder le local même si backend échoue
        }
        return id;
      },

      addVaccine: async (patientId, vaccine) => {
        try {
          // Mapper les champs frontend vers backend
          const res = await dossierAPI.addVaccination(patientId, {
            patient: patientId,
            vaccine_name: vaccine.name,
            vaccine_type: vaccine.name,
            dose_number: 1,
            date_administered: vaccine.date
              ? new Date(vaccine.date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            site: vaccine.facility || '',  // facility → site
            batch_number: '',
            manufacturer: '',
            next_dose_date: vaccine.nextReminder || null,
            notes: vaccine.doctor ? `Administré par: ${vaccine.doctor}` : '',
          });

          const backendId = res.data?.data?.id || res.data?.id || genId();
          console.log('[MedicalStore] Backend vaccination created with ID:', backendId);

          set((state) => ({
            patients: state.patients.map(p =>
              p.id === patientId
                ? {
                    ...p,
                    vaccines: [...p.vaccines, { ...vaccine, id: backendId, patientId } as VaccineRecord],
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          }));

          return backendId;
        } catch (error) {
          console.error('[MedicalStore] Failed to add vaccination:', extractErrorMessage(error));
          throw error;
        }
      },

      addSurgery: async (patientId, surgery) => {
        try {
          const res = await dossierAPI.createSurgery(patientId, {
            nom: surgery.name || '',
            date: surgery.date || null,
            hopital: surgery.hospital || '',
          });
          const backendData = res.data?.data || res.data;
          const newSurgery = {
            id: String(backendData?.id || genId()),
            name: backendData?.nom || surgery.name || '',
            date: backendData?.date || surgery.date || '',
            hospital: backendData?.hopital || surgery.hospital || '',
          };
          set((state) => ({
            patients: state.patients.map((p) =>
              p.id === patientId
                ? {
                    ...p,
                    personalHistory: {
                      ...p.personalHistory,
                      surgeries: [...(p.personalHistory.surgeries || []), newSurgery]
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          }));
          console.log('[MedicalStore] Backend surgery created with ID:', newSurgery.id);
          return newSurgery.id;
        } catch (e: any) {
          console.warn('[MedicalStore] addSurgery failed:', e?.message);
          // Fallback local si backend échoue
          const localSurgery = {
            id: genId(),
            name: surgery.name || '',
            date: surgery.date || '',
            hospital: surgery.hospital || '',
          };
          set((state) => ({
            patients: state.patients.map((p) =>
              p.id === patientId
                ? {
                    ...p,
                    personalHistory: {
                      ...p.personalHistory,
                      surgeries: [...(p.personalHistory.surgeries || []), localSurgery]
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          }));
          return localSurgery.id;
        }
      },

      addHospitalisation: async (patientId, hosp) => {
        try {
          const res = await dossierAPI.createHospitalisation(patientId, {
            motif: hosp.reason || '',
            date_entree: hosp.date || null,
            duree: hosp.duration || '',
            hopital: hosp.hospital || '',
          });
          const backendData = res.data?.data || res.data;
          const newHosp = {
            id: String(backendData?.id || genId()),
            reason: backendData?.motif || hosp.reason || '',
            date: backendData?.date_entree || hosp.date || '',
            duration: backendData?.duree || hosp.duration || '',
            hospital: backendData?.hopital || hosp.hospital || '',
          };
          set((state) => ({
            patients: state.patients.map((p) =>
              p.id === patientId
                ? {
                    ...p,
                    personalHistory: {
                      ...p.personalHistory,
                      hospitalizations: [...(p.personalHistory.hospitalizations || []), newHosp]
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          }));
          console.log('[MedicalStore] Backend hospitalisation created with ID:', newHosp.id);
          return newHosp.id;
        } catch (e: any) {
          console.warn('[MedicalStore] addHospitalisation failed:', e?.message);
          // Fallback local si backend échoue
          const localHosp = {
            id: genId(),
            reason: hosp.reason || '',
            date: hosp.date || '',
            duration: hosp.duration || '',
            hospital: hosp.hospital || '',
          };
          set((state) => ({
            patients: state.patients.map((p) =>
              p.id === patientId
                ? {
                    ...p,
                    personalHistory: {
                      ...p.personalHistory,
                      hospitalizations: [...(p.personalHistory.hospitalizations || []), localHosp]
                    },
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          }));
          return localHosp.id;
        }
      },

      getDoctorStats: (doctorId) => {
        const patients = get().patients.filter(p => p.doctorId === doctorId || (p.doctorIds && p.doctorIds.includes(doctorId)));
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        let monthConsultations = 0;
        let monthPrescriptions = 0;
        patients.forEach(p => {
          p.consultations?.forEach(c => {
            if (c.date >= monthStart) {
              monthConsultations++;
              monthPrescriptions += c.prescriptions?.length > 0 ? 1 : 0;
            }
          });
        });
        return {
          totalPatients: patients.length,
          monthConsultations,
          monthPrescriptions,
          patientsFollowed: patients.length,
        };
      },

      linkPatientToDoctor: (patientDossierNumber, doctorId) => {
        const patient = get().patients.find(p => p.identity.dossierNumber === patientDossierNumber);
        if (patient) {
          const existingDoctorIds = patient.doctorIds || [patient.doctorId];
          if (existingDoctorIds.includes(doctorId)) return true;
          set((state) => ({
            patients: state.patients.map(p =>
              p.identity.dossierNumber === patientDossierNumber
                ? { ...p, doctorId, doctorIds: [...existingDoctorIds, doctorId] }
                : p
            ),
          }));
          console.log('[MedicalStore] Linked patient', patientDossierNumber, 'to doctor', doctorId);
          return true;
        }
        return false;
      },

      linkPatientToUser: (patientId, userId) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, userId, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        console.log('[MedicalStore] Linked patient record', patientId, 'to user', userId);
      },

      getMyRecord: (userId) => {
        return get().patients.find(p => p.userId === userId) ||
          get().patients.find(p => p.identity.dossierNumber === userId || p.id === userId);
      },

      getMyRecordByEmail: (email) => {
        const lower = email.toLowerCase();
        return get().patients.find(p => p.linkedEmail === lower);
      },

      getMyPrescriptions: (userId) => {
        const patient = get().patients.find(p => p.userId === userId) ||
          get().patients.find(p => p.identity.dossierNumber === userId || p.id === userId) ||
          get().patients.find(p => p.linkedEmail === userId);
        if (!patient) return [];
        return patient.consultations
          .filter(c => c.prescriptions?.length > 0)
          .map(c => ({ consultation: c, prescriptions: c.prescriptions }));
      },

      getQRCodeData: (userId) => {
        const patient = get().patients.find(p => p.userId === userId) ||
          get().patients.find(p => p.identity.dossierNumber === userId || p.id === userId) ||
          get().patients.find(p => p.linkedEmail === userId);
        if (!patient) return JSON.stringify({ error: 'Patient non trouvé' });

        const criticalInfo = patient.criticalInfo || {
          drugAllergies: [],
          foodAllergies: [],
          chronicDiseases: [],
          permanentTreatments: [],
        };

        return JSON.stringify({
          dossierNumber: patient.identity.dossierNumber,
          firstName: patient.identity.firstName,
          lastName: patient.identity.lastName,
          birthDate: patient.identity.birthDate,
          sex: patient.identity.sex,
          bloodGroup: criticalInfo.bloodGroup,
          rhFactor: criticalInfo.rhFactor,
          drugAllergies: (criticalInfo.drugAllergies || []).map(a => ({ name: a.name, severity: a.severity })),
          foodAllergies: (criticalInfo.foodAllergies || []).map(a => a.name),
          chronicDiseases: criticalInfo.chronicDiseases || [],
          permanentTreatments: (criticalInfo.permanentTreatments || []).map(t => t.medication),
          emergencyContacts: (patient.identity.emergencyContacts || []).map(c => ({
            name: c.fullName,
            phone: c.phoneNumber,
            relation: c.relationship,
          })),
        });
      },

      searchPatientInStore: (email) => {
        const lower = email.toLowerCase();
        const patient = get().patients.find(p => p.linkedEmail === lower);
        if (patient) {
          console.log('[MedicalStore] Found patient in store by email:', patient.id);
          return patient;
        }
        console.log('[MedicalStore] No patient found in store with email:', email);
        return null;
      },

      searchPatientInStoreByPhone: (phone) => {
        const normalized = phone.trim().replace(/\s+/g, '');
        const patient = get().patients.find(p =>
          p.identity.phone?.replace(/\s+/g, '') === normalized
        );
        if (patient) {
          console.log('[MedicalStore] Found patient in store by phone:', patient.id);
          return patient;
        }
        console.log('[MedicalStore] No patient found in store with phone:', phone);
        return null;
      },

      addMaternityPatient: async (soignantId, pregnancy, userId, linkedEmail) => {
        try {
          const res = await maternityAPI.createMaternityPatient({
            linked_email: linkedEmail?.toLowerCase(),
            first_name: pregnancy.firstName,
            age: pregnancy.age,
            last_period_date: pregnancy.lastPeriodDate,
            due_date: pregnancy.dueDate,
            current_week: pregnancy.currentWeek,
            gravidity: pregnancy.gravidity,
            parity: pregnancy.parity,
            previous_pregnancies: pregnancy.previousPregnancies,
            delivery_place: pregnancy.deliveryPlace,
            referent_doctor: pregnancy.referentDoctor,
            is_active: pregnancy.isActive,
          });

          const backendId = res.data?.data?.id || res.data?.id || genId();
          const pregnancyId = genId();
          console.log('[MedicalStore] Backend maternity patient created with ID:', backendId);

          // Créer la grossesse associée
          await maternityAPI.createPregnancy(backendId, {
            last_menstrual_period: pregnancy.lastPeriodDate,
            expected_delivery_date: pregnancy.dueDate,
            weeks_of_gestation: pregnancy.currentWeek,
            pregnancy_number: pregnancy.gravidity || 1,
            status: 'ongoing',
          }).catch(e => console.warn('[MedicalStore] Failed to create pregnancy:', e));

          const consultations: PrenatalConsultation[] = DEFAULT_PRENATAL_CONSULTATIONS.map(c => ({
            ...c,
            id: genId(),
            pregnancyId,
          }));

          const newPatient: MaternityPatient = {
            id: backendId,
            userId,
            linkedEmail: linkedEmail?.toLowerCase(),
            pregnancy: { ...pregnancy, id: pregnancyId, patientId: backendId },
            weeklyCheckups: [],
            prenatalConsultations: consultations,
            prenatalExams: [],
            children: [],
            childGrowth: [],
            childVaccines: [],
            alertLevel: 'vert',
            soignantId: soignantId || undefined,
          };

          set((state) => ({ maternityPatients: [...state.maternityPatients, newPatient] }));
          console.log('[MedicalStore] Maternity patient added to store:', backendId);

          return backendId;
        } catch (error) {
          console.error('[MedicalStore] Failed to create maternity patient:', extractErrorMessage(error));
          throw error;
        }
      },

      syncMaternityPatientsFromBackend: async () => {
        if (get().isSyncing) return;
        set({ isSyncing: true });
        try {
          console.log('[MedicalStore] Syncing maternity patients from backend...');
          const res = await maternityAPI.listMaternityPatients();
          const backendPatients = res.data.data || res.data.results || res.data;

          if (Array.isArray(backendPatients) && backendPatients.length > 0) {
            const mappedPatients: MaternityPatient[] = backendPatients.map(bp => {
              // PRIORITÉ : utiliser bp.pregnancy si disponible (backend enrichi), sinon construire depuis champs plats
              const pregnancyId = bp.pregnancy?.id || genId();

              // PRIORITÉ : utiliser bp.prenatal_consultations si disponible (backend enrichi)
              const consultations: PrenatalConsultation[] = bp.prenatal_consultations && Array.isArray(bp.prenatal_consultations)
                ? bp.prenatal_consultations.map((pc: any) => ({
                    id: String(pc.id || genId()),
                    pregnancyId: pregnancyId,
                    weekTarget: pc.week_target || pc.weekTarget,
                    description: pc.description,
                    status: pc.status || 'a_venir',
                    scheduledDate: pc.scheduled_date || pc.scheduledDate,
                    actualDate: pc.actual_date || pc.actualDate,
                    notes: pc.notes,
                  }))
                : DEFAULT_PRENATAL_CONSULTATIONS.map(c => ({
                    ...c,
                    id: genId(),
                    pregnancyId,
                  }));

              return {
                id: String(bp.id),
                userId: bp.user_id ? String(bp.user_id) : undefined,
                linkedEmail: bp.linked_email?.toLowerCase(),
                pregnancy: bp.pregnancy ? {
                  id: pregnancyId,
                  patientId: String(bp.id),
                  firstName: bp.pregnancy.first_name || bp.first_name || '',
                  age: bp.pregnancy.age || bp.age || 25,
                  lastPeriodDate: bp.pregnancy.last_period_date || bp.last_period_date,
                  dueDate: bp.pregnancy.due_date || bp.due_date,
                  currentWeek: bp.pregnancy.current_week || bp.current_week || 1,
                  gravidity: bp.pregnancy.gravidity || bp.gravidity || 1,
                  parity: bp.pregnancy.parity || bp.parity || 0,
                  previousPregnancies: bp.pregnancy.previous_pregnancies || bp.previous_pregnancies || [],
                  deliveryPlace: bp.pregnancy.delivery_place || bp.delivery_place,
                  referentDoctor: bp.pregnancy.referent_doctor || bp.referent_doctor,
                  isActive: bp.pregnancy.is_active !== undefined ? bp.pregnancy.is_active : true,
                } : {
                  id: pregnancyId,
                  patientId: String(bp.id),
                  firstName: bp.first_name || '',
                  age: bp.age || 25,
                  lastPeriodDate: bp.last_period_date,
                  dueDate: bp.due_date,
                  currentWeek: bp.current_week || 1,
                  gravidity: bp.gravidity || 1,
                  parity: bp.parity || 0,
                  previousPregnancies: bp.previous_pregnancies || [],
                  deliveryPlace: bp.delivery_place,
                  referentDoctor: bp.referent_doctor,
                  isActive: true,
                },
                weeklyCheckups: (bp.weekly_checkups || bp.checkups || []).map((wc: any) => ({
                  id: String(wc.id || genId()),
                  pregnancyId: pregnancyId,
                  date: wc.date,
                  week: wc.week,
                  weight: wc.weight,
                  systolicBP: wc.systolic_bp,
                  diastolicBP: wc.diastolic_bp,
                  fetalMovements: wc.fetal_movements,
                  symptoms: wc.symptoms || [],
                  mood: wc.mood,
                })),
                prenatalConsultations: consultations,
                prenatalExams: [],
                children: [],
                childGrowth: [],
                childVaccines: [],
                alertLevel: 'vert',
                soignantId: bp.doctor || bp.soignant_id || bp.created_by,
              };
            });

            set((state) => {
              const updatedPatients = [...state.maternityPatients];
              let addedCount = 0;
              let updatedCount = 0;

              mappedPatients.forEach(backendPatient => {
                // Chercher si le patient existe déjà localement (par id, linkedEmail, ou userId)
                const existingIndex = updatedPatients.findIndex(p =>
                  p.id === backendPatient.id ||
                  (p.linkedEmail && backendPatient.linkedEmail && p.linkedEmail === backendPatient.linkedEmail) ||
                  (p.userId && backendPatient.userId && p.userId === backendPatient.userId)
                );

                if (existingIndex !== -1) {
                  // Patient existe → Mettre à jour avec les données du backend (source de vérité)
                  updatedPatients[existingIndex] = backendPatient;
                  updatedCount++;
                } else {
                  // Patient n'existe pas → Ajouter
                  updatedPatients.push(backendPatient);
                  addedCount++;
                }
              });

              console.log(`[MedicalStore] Synced ${mappedPatients.length} maternity patients from backend: ${updatedCount} updated, ${addedCount} added`);
              return { maternityPatients: updatedPatients };
            });
          } else {
            console.log('[MedicalStore] No maternity patients from backend or empty response');
          }
        } catch (e) {
          console.warn('[MedicalStore] syncMaternityPatientsFromBackend failed:', extractErrorMessage(e));
        } finally {
          set({ isSyncing: false });
        }
      },

      syncMyMaternityFromBackend: async (userId: string) => {
        try {
          console.log('[MedicalStore] Syncing my maternity record from backend... userId:', userId);
          const res = await maternityAPI.myRecord();
          const data = res.data?.data || res.data;

          if (!data) {
            console.log('[MedicalStore] No data returned from my-record endpoint');
            return;
          }

          // Mapper vers MaternityPatient
          // PRIORITÉ : utiliser data.pregnancy si disponible (backend enrichi), sinon construire depuis champs plats
          const pregnancyId = data.pregnancy?.id || genId();

          // PRIORITÉ : utiliser data.prenatal_consultations si disponible (backend enrichi)
          const consultations: PrenatalConsultation[] = data.prenatal_consultations && Array.isArray(data.prenatal_consultations)
            ? data.prenatal_consultations.map((pc: any) => ({
                id: String(pc.id || genId()),
                pregnancyId: pregnancyId,
                weekTarget: pc.week_target || pc.weekTarget,
                description: pc.description,
                status: pc.status || 'a_venir',
                scheduledDate: pc.scheduled_date || pc.scheduledDate,
                actualDate: pc.actual_date || pc.actualDate,
                notes: pc.notes,
              }))
            : DEFAULT_PRENATAL_CONSULTATIONS.map(c => ({
                ...c,
                id: genId(),
                pregnancyId,
              }));

          const mappedRecord: MaternityPatient = {
            id: String(data.id),
            userId: userId,
            linkedEmail: data.email?.toLowerCase() || data.linked_email?.toLowerCase(),
            pregnancy: data.pregnancy ? {
              id: pregnancyId,
              patientId: String(data.id),
              firstName: data.pregnancy.first_name || data.first_name || '',
              age: data.pregnancy.age || data.age || 25,
              lastPeriodDate: data.pregnancy.last_period_date || data.last_period_date,
              dueDate: data.pregnancy.due_date || data.due_date,
              currentWeek: data.pregnancy.current_week || data.current_week || 1,
              gravidity: data.pregnancy.gravidity || data.gravidity || 1,
              parity: data.pregnancy.parity || data.parity || 0,
              previousPregnancies: data.pregnancy.previous_pregnancies || data.previous_pregnancies || [],
              deliveryPlace: data.pregnancy.delivery_place || data.delivery_place,
              referentDoctor: data.pregnancy.referent_doctor || data.referent_doctor,
              isActive: data.pregnancy.is_active !== undefined ? data.pregnancy.is_active : (data.is_active !== undefined ? data.is_active : true),
            } : {
              id: pregnancyId,
              patientId: String(data.id),
              firstName: data.first_name || '',
              age: data.age || 25,
              lastPeriodDate: data.last_period_date,
              dueDate: data.due_date,
              currentWeek: data.current_week || 1,
              gravidity: data.gravidity || 1,
              parity: data.parity || 0,
              previousPregnancies: data.previous_pregnancies || [],
              deliveryPlace: data.delivery_place,
              referentDoctor: data.referent_doctor,
              isActive: data.is_active !== undefined ? data.is_active : true,
            },
            weeklyCheckups: (data.weekly_checkups || data.checkups || []).map((wc: any) => ({
              id: String(wc.id || genId()),
              pregnancyId: pregnancyId,
              date: wc.date,
              week: wc.week,
              weight: wc.weight,
              systolicBP: wc.systolic_bp,
              diastolicBP: wc.diastolic_bp,
              fetalMovements: wc.fetal_movements,
              symptoms: wc.symptoms || [],
              mood: wc.mood,
            })),
            prenatalConsultations: consultations,
            prenatalExams: [],
            children: [],
            childGrowth: [],
            childVaccines: [],
            alertLevel: 'vert',
            soignantId: data.soignant_id || data.created_by,
          };

          // FLUX DE SYNCHRONISATION MATERNITÉ:
          // 1. Le soignant crée un dossier maternité sur Railway avec le email de la patiente
          // 2. La patiente se connecte → on récupère son dossier via GET /maternity/my-record/
          // 3. On assigne userId au dossier récupéré
          // 4. On cherche si ce dossier existe déjà localement (par id backend, userId, OU linkedEmail)
          // 5. Si trouvé → TOUJOURS mettre à jour avec les données du backend (source de vérité)
          // 6. Si pas trouvé → Ajouter le nouveau dossier
          set((state) => {
            const existingIndex = state.maternityPatients.findIndex(
              (p) =>
                p.id === mappedRecord.id ||
                p.userId === mappedRecord.userId ||
                (p.linkedEmail && mappedRecord.linkedEmail && p.linkedEmail === mappedRecord.linkedEmail)
            );

            if (existingIndex !== -1) {
              // Dossier existe → Mettre à jour avec les données du backend
              console.log('[MedicalStore] Updating existing maternity record from backend:', mappedRecord.id);
              const updatedPatients = [...state.maternityPatients];
              updatedPatients[existingIndex] = mappedRecord;
              return { maternityPatients: updatedPatients };
            } else {
              // Dossier n'existe pas → Ajouter
              console.log('[MedicalStore] Adding new maternity record from backend:', mappedRecord.id);
              return {
                maternityPatients: [...state.maternityPatients, mappedRecord],
              };
            }
          });

          console.log('[MedicalStore] My maternity record synced from backend:', mappedRecord.id, 'userId:', userId);
        } catch (e: any) {
          // Ignorer silencieusement les 404 (patient sans dossier maternité)
          if (e?.response?.status !== 404) {
            console.warn('[MedicalStore] syncMyMaternity failed:', extractErrorMessage(e));
          } else {
            console.log('[MedicalStore] No maternity record found for current user (404)');
          }
        }
      },

      getMaternityPatientsByDoctor: (doctorId) => {
        return get().maternityPatients.filter(p => !p.soignantId || p.soignantId === doctorId);
      },

      getMyMaternityData: (patientId) => {
        return get().maternityPatients.find(p => p.id === patientId);
      },

      getMyMaternityDataByUserId: (userId) => {
        return get().maternityPatients.find(p => p.userId === userId);
      },

      getMyMaternityDataByEmail: (email) => {
        const lower = email.toLowerCase();
        return get().maternityPatients.find(p => p.linkedEmail === lower);
      },

      autoLinkMaternityByEmail: (email, userId) => {
        const lower = email.toLowerCase();
        const patient = get().maternityPatients.find(p => p.linkedEmail === lower && !p.userId);
        if (patient) {
          set((state) => ({
            maternityPatients: state.maternityPatients.map(p =>
              p.id === patient.id ? { ...p, userId } : p
            ),
          }));
          console.log('[MedicalStore] Auto-linked maternity', patient.id, 'to user', userId);
          return patient;
        }
        const alreadyLinked = get().maternityPatients.find(p => p.linkedEmail === lower && p.userId === userId);
        return alreadyLinked || null;
      },

      linkMaternityToUser: (maternityId, userId) => {
        set((state) => ({
          maternityPatients: state.maternityPatients.map(p =>
            p.id === maternityId ? { ...p, userId } : p
          ),
        }));
        console.log('[MedicalStore] Linked maternity', maternityId, 'to user', userId);
      },

      addWeeklyCheckup: (patientId, checkup) => {
        const patient = get().maternityPatients.find(p => p.id === patientId);
        if (!patient) return;
        const id = genId();
        const newCheckup: WeeklyCheckup = {
          ...checkup,
          id,
          pregnancyId: patient.pregnancy.id,
        };

        let alertLevel: MaternityPatient['alertLevel'] = 'vert';
        if (checkup.systolicBP && checkup.systolicBP >= 140) alertLevel = 'rouge';
        else if (checkup.diastolicBP && checkup.diastolicBP >= 90) alertLevel = 'rouge';
        else if (checkup.fetalMovements === 'absents') alertLevel = 'rouge';
        else if (checkup.fetalMovements === 'reduits') alertLevel = 'jaune';
        else if (checkup.symptoms?.includes('Saignements')) alertLevel = 'rouge';

        // Mise à jour optimiste du state local
        set((state) => ({
          maternityPatients: state.maternityPatients.map(p =>
            p.id === patientId
              ? { ...p, weeklyCheckups: [...p.weeklyCheckups, newCheckup], alertLevel }
              : p
          ),
        }));

        // Sync backend en arrière-plan
        maternityAPI.createWeeklyCheckup(patientId, {
          date: checkup.date,
          week: checkup.week,
          weight: checkup.weight,
          systolic_bp: checkup.systolicBP,
          diastolic_bp: checkup.diastolicBP,
          fetal_movements: checkup.fetalMovements,
          symptoms: checkup.symptoms,
          mood: checkup.mood,
        }).then(() => {
          console.log('[MedicalStore] Weekly checkup saved, syncing maternity patients from backend');
          // Forcer la synchronisation pour que le médecin voit le nouveau checkup
          get().syncMaternityPatientsFromBackend();
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[MedicalStore] Backend createWeeklyCheckup failed:', errorMsg);
          // Données locales conservées même en cas d'échec backend
        });
      },

      schedulePrenatalConsultation: (patientId, consultationId, scheduledDate) => {
        // Mise à jour optimiste du state local
        set((state) => ({
          maternityPatients: state.maternityPatients.map(p =>
            p.id === patientId
              ? {
                  ...p,
                  prenatalConsultations: p.prenatalConsultations.map(c =>
                    c.id === consultationId
                      ? { ...c, scheduledDate }
                      : c
                  ),
                }
              : p
          ),
        }));
        console.log('[MedicalStore] Scheduled consultation', consultationId, 'for', scheduledDate);

        // Sync backend en arrière-plan
        maternityAPI.schedulePrenatalConsultation(patientId, consultationId, {
          scheduled_date: scheduledDate,
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[MedicalStore] Backend schedulePrenatalConsultation failed:', errorMsg);
          // Données locales conservées même en cas d'échec backend
        });
      },

      markPrenatalConsultationDone: (patientId, consultationId, date, notes) => {
        // Mise à jour optimiste du state local
        set((state) => ({
          maternityPatients: state.maternityPatients.map(p =>
            p.id === patientId
              ? {
                  ...p,
                  prenatalConsultations: p.prenatalConsultations.map(c =>
                    c.id === consultationId
                      ? { ...c, status: 'effectuee' as const, actualDate: date, notes: notes || c.notes }
                      : c
                  ),
                }
              : p
          ),
        }));

        // Sync backend en arrière-plan
        maternityAPI.markPrenatalConsultationDone(patientId, consultationId, {
          actual_date: date,
          notes: notes || '',
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[MedicalStore] Backend markPrenatalConsultationDone failed:', errorMsg);
          // Données locales conservées même en cas d'échec backend
        });
      },

      addPrenatalExam: (patientId, exam) => {
        const patient = get().maternityPatients.find(p => p.id === patientId);
        if (!patient) return;
        const id = genId();
        set((state) => ({
          maternityPatients: state.maternityPatients.map(p =>
            p.id === patientId
              ? {
                  ...p,
                  prenatalExams: [...p.prenatalExams, { ...exam, id, pregnancyId: patient.pregnancy.id }],
                }
              : p
          ),
        }));
      },

      addChild: (patientId, child) => {
        const id = genId();
        const vaccines: PEVVaccine[] = GUINEA_PEV_VACCINES.map(v => ({
          ...v,
          id: genId(),
          childId: id,
        }));

        // Mise à jour optimiste du state local
        set((state) => ({
          maternityPatients: state.maternityPatients.map(p =>
            p.id === patientId
              ? {
                  ...p,
                  children: [...p.children, { ...child, id, parentId: patientId }],
                  childVaccines: [...p.childVaccines, ...vaccines],
                }
              : p
          ),
        }));

        // Sync backend en arrière-plan
        maternityAPI.createChild(patientId, {
          first_name: child.firstName,
          birth_date: child.birthDate,
          // sex: child.sex, // Property does not exist on Omit<ChildProfile, "id"|"parentId">
          birth_weight: child.birthWeight,
          birth_height: child.birthHeight,
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[MedicalStore] Backend createChild failed:', errorMsg);
          // Données locales conservées même en cas d'échec backend
        });

        return id;
      },

      addChildGrowth: (childId, record) => {
        const id = genId();
        set((state) => ({
          maternityPatients: state.maternityPatients.map(p => {
            if (p.children.some(c => c.id === childId)) {
              return { ...p, childGrowth: [...p.childGrowth, { ...record, id, childId }] };
            }
            return p;
          }),
        }));

        maternityAPI.addChildGrowth(childId, {
          date: record.date,
          weight: record.weight,
          height: record.height,
          head_circumference: record.headCircumference,
          notes: record.notes,
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.error('[MedicalStore] Backend addChildGrowth failed:', errorMsg);
          // Note: Erreur de synchronisation backend — les données locales sont conservées
        });
      },

      markChildVaccineDone: (vaccineId, date, facility) => {
        set((state) => ({
          maternityPatients: state.maternityPatients.map(p => ({
            ...p,
            childVaccines: p.childVaccines.map(v =>
              v.id === vaccineId
                ? { ...v, status: 'fait' as const, doneDate: date, facility }
                : v
            ),
          })),
        }));
      },

      addSmsReminder: (reminder) => {
        const id = genId();
        set((state) => ({
          smsReminders: [...state.smsReminders, { ...reminder, id }],
        }));

        // Envoi direct au backend — le numéro de téléphone est la cible
        remindersAPI.createAppointmentReminder({
          phone_number: reminder.targetPhone,
          scheduled_at: reminder.scheduledDate,
          patient_name: reminder.patientName || 'Patient',
          date: reminder.scheduledDate,
          message: reminder.message,
        }).catch((e) => console.warn('[Reminders] Backend sync failed:', extractErrorMessage(e)));
      },

      updateReminderStatus: (id, status) => {
        set((state) => ({
          smsReminders: state.smsReminders.map(r =>
            r.id === id ? { ...r, status } : r
          ),
        }));
      },

      getSmsReminders: () => get().smsReminders,
    }),
    {
      name: 'santeconnect-medical-v2',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migration: Générer des IDs pour les patientes de maternité qui n'en ont pas
          const hasMissingIds = state.maternityPatients.some(p => !p.id);
          if (hasMissingIds) {
            console.log('[MedicalStore] Migration: Fixing missing maternity patient IDs');
            state.maternityPatients = state.maternityPatients.map(p => {
              if (!p.id) {
                const newId = genId();
                console.log('[MedicalStore] Generated ID for maternity patient:', newId);
                return { ...p, id: newId };
              }
              return p;
            });
          }

          // Nettoyage des doublons : dédupliquer par id, linkedEmail, et userId
          const cleanDuplicates = () => {
            const seenPatients = new Map<string, PatientRecord>();
            const seenEmails = new Set<string>();
            const seenUserIds = new Set<string>();

            state.patients.forEach(patient => {
              // Priorité 1 : Utiliser l'id backend comme clé unique
              if (seenPatients.has(patient.id)) {
                console.log('[MedicalStore] Duplicate patient by id:', patient.id);
                return; // Ignorer le doublon
              }

              // Priorité 2 : Vérifier par linkedEmail
              if (patient.linkedEmail) {
                if (seenEmails.has(patient.linkedEmail)) {
                  console.log('[MedicalStore] Duplicate patient by email:', patient.linkedEmail);
                  return; // Ignorer le doublon
                }
                seenEmails.add(patient.linkedEmail);
              }

              // Priorité 3 : Vérifier par userId
              if (patient.userId) {
                if (seenUserIds.has(patient.userId)) {
                  console.log('[MedicalStore] Duplicate patient by userId:', patient.userId);
                  return; // Ignorer le doublon
                }
                seenUserIds.add(patient.userId);
              }

              seenPatients.set(patient.id, patient);
            });

            const cleanedPatients = Array.from(seenPatients.values());
            if (cleanedPatients.length < state.patients.length) {
              console.log(`[MedicalStore] Removed ${state.patients.length - cleanedPatients.length} duplicate patients`);
              state.patients = cleanedPatients;
            }

            // Même logique pour les patients maternité
            const seenMaternity = new Map<string, MaternityPatient>();
            const seenMaternityEmails = new Set<string>();
            const seenMaternityUserIds = new Set<string>();

            state.maternityPatients.forEach(patient => {
              if (seenMaternity.has(patient.id)) {
                console.log('[MedicalStore] Duplicate maternity patient by id:', patient.id);
                return;
              }

              if (patient.linkedEmail) {
                if (seenMaternityEmails.has(patient.linkedEmail)) {
                  console.log('[MedicalStore] Duplicate maternity patient by email:', patient.linkedEmail);
                  return;
                }
                seenMaternityEmails.add(patient.linkedEmail);
              }

              if (patient.userId) {
                if (seenMaternityUserIds.has(patient.userId)) {
                  console.log('[MedicalStore] Duplicate maternity patient by userId:', patient.userId);
                  return;
                }
                seenMaternityUserIds.add(patient.userId);
              }

              seenMaternity.set(patient.id, patient);
            });

            const cleanedMaternity = Array.from(seenMaternity.values());
            if (cleanedMaternity.length < state.maternityPatients.length) {
              console.log(`[MedicalStore] Removed ${state.maternityPatients.length - cleanedMaternity.length} duplicate maternity patients`);
              state.maternityPatients = cleanedMaternity;
            }
          };

          cleanDuplicates();
        }
      },
    }
  )
);
