import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import { dossierAPI, maternityAPI, remindersAPI, extractErrorMessage } from './api';
import { useBackendStore } from './backendStore';
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
  if (data.prefecture !== undefined) mappedData.prefecture = data.prefecture;

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
  reset: () => void;
}

export const useMedicalStore = create<MedicalStore>()(
  persist(
    (set, get) => ({
      patients: [],
      maternityPatients: [],
      smsReminders: [],
      isSyncing: false,

      reset: () => set({
        patients: [],
        maternityPatients: [],
        smsReminders: [],
        isSyncing: false,
      }),

      syncPatientsFromBackend: async () => {
        if (get().isSyncing) return;
        set({ isSyncing: true });
        try {
          console.log('[MedicalStore] Syncing patients from backend...');
          const res = await dossierAPI.listPatients();
          const backendPatients = res.data.data || res.data.results || res.data;

          if (!Array.isArray(backendPatients) || backendPatients.length === 0) {
            console.log('[MedicalStore] No patients from backend');
            return;
          }

          const mappedPatients: PatientRecord[] = backendPatients.map((data: any) => {
            // Mapper consultations
            const consultations: ConsultationRecord[] = (data.consultations || []).map((c: any) => ({
              id: String(c.id || genId()),
              patientId: String(data.id),
              doctorId: c.doctor_id || '',
              doctorName: c.doctor_name || '',
              date: c.date ? c.date.split(' ')[0] : '',
              time: c.date ? c.date.split(' ')[1] || '' : '',
              reason: c.motif || '',
              vitalSigns: {
                weight: c.poids ?? undefined,
                height: c.taille ?? undefined,
                systolicBP: c.tension_systolique ?? undefined,
                diastolicBP: c.tension_diastolique ?? undefined,
                heartRate: c.frequence_cardiaque ?? undefined,
                temperature: c.temperature ?? undefined,
                spo2: c.spo2 ?? undefined,
              },
              clinicalExams: [],
              mainDiagnosis: c.diagnostic || '',
              differentialDiagnosis: undefined,
              treatment: c.traitement || '',
              prescriptions: [],
              requestedExams: [],
              nextAppointment: c.prochain_rdv || undefined,
              observations: c.recommandations || undefined,
            }));

            // Mapper vaccins
            const vaccines: VaccineRecord[] = (data.vaccines || []).map((v: any) => ({
              id: String(v.id || genId()),
              patientId: String(data.id),
              name: v.vaccine_name || '',
              date: v.date_administered || '',
              facility: '',
              doctor: v.notes || '',
              nextReminder: v.next_dose_date || undefined,
              status: 'fait' as const,
            }));

            // Mapper lab results
            const labResults: LabResult[] = (data.consultations || []).flatMap((c: any) =>
              (c.lab_tests || []).map((lt: any) => ({
                id: String(lt.id || genId()),
                patientId: String(data.id),
                examType: lt.test_name || '',
                date: lt.completed_date || lt.ordered_date || '',
                facility: '',
                result: lt.results || '',
                unit: undefined,
                interpretation: lt.interpretation || undefined,
                prescribedBy: '',
              }))
            );

            // Mapper chirurgies
            const surgeries: Surgery[] = (data.surgeries || []).map((s: any) => ({
              id: String(s.id || genId()),
              name: s.nom || '',
              date: s.date || '',
              hospital: s.hopital || undefined,
            }));

            // Mapper hospitalisations
            const hospitalizations: Hospitalization[] = (data.hospitalisations || []).map((h: any) => ({
              id: String(h.id || genId()),
              reason: h.motif || '',
              date: h.date_entree || '',
              duration: h.date_sortie ? `${h.date_entree} - ${h.date_sortie}` : undefined,
              hospital: h.hopital || undefined,
            }));

            // Parser criticalInfo
            const criticalInfo: CriticalInfo = {
              bloodGroup: data.blood_type || undefined,
              rhFactor: undefined,
              drugAllergies: data.allergies ? parseDrugAllergies(data.allergies) : [],
              foodAllergies: [],
              chronicDiseases: data.chronic_diseases ? parseChronicDiseases(data.chronic_diseases) : [],
              otherChronicDisease: undefined,
              permanentTreatments: data.permanent_treatments ? parsePermanentTreatments(data.permanent_treatments) : [],
              handicap: undefined,
            };

            // Parser personalHistory
            const personalHistory: PersonalHistory = {
              pastIllnesses: data.personal_history?.past_illnesses || undefined,
              surgeries,
              hospitalizations,
              bloodTransfusion: data.personal_history?.blood_transfusion || false,
              bloodTransfusionDate: data.personal_history?.blood_transfusion_date || undefined,
            };

            // Parser familyHistory
            const familyHistory: FamilyHistory = data.family_history || {
              diabetes: false,
              hypertension: false,
              cancer: false,
              sickleCell: false,
              hereditary: false,
            };

            // Parser lifeHabits
            const lifeHabits: LifeHabits = {
              tobacco: data.life_habits?.tobacco ?? false,
              tobaccoQuantity: data.life_habits?.tobaccoQuantity || undefined,
              alcohol: data.life_habits?.alcohol ?? false,
              physicalActivity: data.life_habits?.physical_activity || 'moderee',
              specialDiet: data.life_habits?.specialDiet || undefined,
            };

            return {
              id: String(data.id),
              userId: data.user_id ? String(data.user_id) : undefined,
              linkedEmail: data.linked_email?.toLowerCase() || undefined,
              identity: {
                firstName: data.first_name || '',
                lastName: data.last_name || '',
                birthDate: data.date_of_birth || undefined,
                sex: (data.gender === 'M' || data.gender === 'F') ? data.gender : undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                commune: data.city || undefined,
                prefecture: data.prefecture || undefined,
                dossierNumber: data.numero_dossier || `KDY-${Date.now()}`,
                emergencyContacts: data.emergency_contacts || [],
                photo: undefined,
              },
              criticalInfo,
              personalHistory,
              familyHistory,
              lifeHabits,
              consultations,
              labResults,
              vaccines,
              doctorIds: [],
              doctorId: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });

          // Remplacer tous les patients dans le store
          set({ patients: mappedPatients });
          console.log(`[MedicalStore] Synced ${mappedPatients.length} patients from backend`);
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

          // Mapper consultations (backend: motif, motif_detail, diagnostic, traitement, etc.)
          const consultations: ConsultationRecord[] = (data.consultations || []).map((c: any) => ({
            id: String(c.id || genId()),
            patientId: String(data.id),
            doctorId: c.doctor_id || '',
            doctorName: c.doctor_name || '',
            date: c.date ? c.date.split(' ')[0] : '',
            time: c.date ? c.date.split(' ')[1] || '' : '',
            reason: c.motif || '',
            vitalSigns: {
              weight: c.poids ?? undefined,
              height: c.taille ?? undefined,
              systolicBP: c.tension_systolique ?? undefined,
              diastolicBP: c.tension_diastolique ?? undefined,
              heartRate: c.frequence_cardiaque ?? undefined,
              temperature: c.temperature ?? undefined,
              spo2: c.spo2 ?? undefined,
            },
            clinicalExams: [],
            mainDiagnosis: c.diagnostic || '',
            differentialDiagnosis: undefined,
            treatment: c.traitement || '',
            prescriptions: [],
            requestedExams: [],
            nextAppointment: c.prochain_rdv || undefined,
            observations: c.recommandations || undefined,
          }));

          // Mapper vaccins (backend: vaccine_name, date_administered, dose_number, etc.)
          const vaccines: VaccineRecord[] = (data.vaccines || []).map((v: any) => ({
            id: String(v.id || genId()),
            patientId: String(data.id),
            name: v.vaccine_name || '',
            date: v.date_administered || '',
            facility: '',
            doctor: v.notes || '',
            nextReminder: v.next_dose_date || undefined,
            status: 'fait' as const,
          }));

          // Mapper lab results (backend: consultations[].lab_tests[])
          const labResults: LabResult[] = (data.consultations || []).flatMap((c: any) =>
            (c.lab_tests || []).map((lt: any) => ({
              id: String(lt.id || genId()),
              patientId: String(data.id),
              examType: lt.test_name || '',
              date: lt.completed_date || lt.ordered_date || '',
              facility: '',
              result: lt.results || '',
              unit: undefined,
              interpretation: lt.interpretation || undefined,
              prescribedBy: '',
            }))
          );

          // Mapper chirurgies (backend: nom, date, hopital)
          const surgeries: Surgery[] = (data.surgeries || []).map((s: any) => ({
            id: String(s.id || genId()),
            name: s.nom || '',
            date: s.date || '',
            hospital: s.hopital || undefined,
          }));

          // Mapper hospitalisations (backend: motif, date_entree, date_sortie, hopital)
          const hospitalizations: Hospitalization[] = (data.hospitalisations || []).map((h: any) => ({
            id: String(h.id || genId()),
            reason: h.motif || '',
            date: h.date_entree || '',
            duration: h.date_sortie ? `${h.date_entree} - ${h.date_sortie}` : undefined,
            hospital: h.hopital || undefined,
          }));

          // Parser criticalInfo depuis le backend
          const criticalInfo: CriticalInfo = {
            bloodGroup: data.blood_type || undefined,
            rhFactor: undefined,
            drugAllergies: data.allergies ? parseDrugAllergies(data.allergies) : [],
            foodAllergies: [],
            chronicDiseases: data.chronic_diseases ? parseChronicDiseases(data.chronic_diseases) : [],
            otherChronicDisease: undefined,
            permanentTreatments: data.permanent_treatments ? parsePermanentTreatments(data.permanent_treatments) : [],
            handicap: undefined,
          };

          // Parser personalHistory
          const personalHistory: PersonalHistory = {
            pastIllnesses: data.personal_history?.past_illnesses || undefined,
            surgeries: surgeries,
            hospitalizations: hospitalizations,
            bloodTransfusion: data.personal_history?.blood_transfusion || false,
            bloodTransfusionDate: data.personal_history?.blood_transfusion_date || undefined,
          };

          // Parser familyHistory
          const familyHistory: FamilyHistory = data.family_history || {
            diabetes: false,
            hypertension: false,
            cancer: false,
            sickleCell: false,
            hereditary: false,
          };

          // Parser lifeHabits
          const lifeHabits: LifeHabits = {
            tobacco: data.life_habits?.tobacco ?? false,
            tobaccoQuantity: data.life_habits?.tobaccoQuantity || undefined,
            alcohol: data.life_habits?.alcohol ?? false,
            physicalActivity: data.life_habits?.physical_activity || 'moderee',
            specialDiet: data.life_habits?.specialDiet || undefined,
          };

          // Créer PatientRecord depuis le backend (source de vérité)
          const record: PatientRecord = {
            id: String(data.id),
            userId: userId,
            linkedEmail: data.linked_email?.toLowerCase() || undefined,
            identity: {
              firstName: data.first_name || '',
              lastName: data.last_name || '',
              birthDate: data.date_of_birth || undefined,
              sex: (data.gender === 'M' || data.gender === 'F') ? data.gender : undefined,
              phone: data.phone || undefined,
              address: data.address || undefined,
              commune: data.city || undefined,
              prefecture: data.prefecture || undefined,
              dossierNumber: data.numero_dossier || `KDY-${Date.now()}`,
              emergencyContacts: data.emergency_contacts || [],
              photo: undefined,
            },
            criticalInfo,
            personalHistory,
            familyHistory,
            lifeHabits,
            consultations,
            labResults,
            vaccines,
            doctorIds: [],
            doctorId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Remplacer ou ajouter dans le store
          set((state) => {
            const existingIndex = state.patients.findIndex(
              (p) => p.id === record.id || p.userId === userId
            );

            if (existingIndex !== -1) {
              console.log('[MedicalStore] Replacing patient record from backend:', record.id);
              const updatedPatients = [...state.patients];
              updatedPatients[existingIndex] = record;
              return { patients: updatedPatients };
            } else {
              console.log('[MedicalStore] Adding new patient record from backend:', record.id);
              return { patients: [...state.patients, record] };
            }
          });

          console.log('[MedicalStore] My record synced from backend:', record.id);
        } catch (e: any) {
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
            city: identity.commune || '',
            prefecture: identity.prefecture || '',
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
            date: new Date().toISOString(),
            reason: consultation.reason || '',
            symptoms: consultation.clinicalExams
              ?.map(exam => `${exam.system}: ${exam.observation || (exam.checked ? 'Normal' : 'Non examiné')}`)
              .join('\n') || '',
            diagnosis: consultation.mainDiagnosis || '',
            treatment: consultation.treatment || '',
            notes: consultation.observations || '',
            temperature: consultation.vitalSigns?.temperature || null,
            blood_pressure_systolic: consultation.vitalSigns?.systolicBP || null,
            blood_pressure_diastolic: consultation.vitalSigns?.diastolicBP || null,
            heart_rate: consultation.vitalSigns?.heartRate || null,
            weight: consultation.vitalSigns?.weight || null,
            height: consultation.vitalSigns?.height || null,
            lab_tests: [],
          });

          const backendId = res.data?.data?.id || res.data?.id || genId();
          console.log('[MedicalStore] Backend consultation created with ID:', backendId);

          // Sync backend pour affichage immédiat
          await useBackendStore.getState().syncPatients();

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
          const payload = {
            test_name: result.examType || '',
            test_type: result.examType || '',
            status: 'pending',
            ordered_date: result.date
              ? new Date(result.date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            results: result.result || '',
            interpretation: result.interpretation || '',
            notes: consultationId ? '' : (result.facility || ''),
          };

          let res;
          if (consultationId) {
            res = await dossierAPI.addLabTest(patientId, consultationId, payload);
          } else {
            res = await dossierAPI.addLabTestDirect(patientId, payload);
          }

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
        // Convertir JJ/MM/AAAA → YYYY-MM-DD si nécessaire
        const formatDate = (d: string | undefined): string | undefined => {
          if (!d) return undefined;
          if (d.includes('/')) {
            const parts = d.split('/');
            if (parts.length === 3) {
              return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }
          }
          return d.split('T')[0]; // Enlever l'heure si ISO complet
        };

        try {
          const res = await maternityAPI.createMaternityPatient({
            linked_email: linkedEmail?.toLowerCase(),
            first_name: pregnancy.firstName,
            age: pregnancy.age,
            date_of_birth: pregnancy.age
              ? new Date(
                  new Date().getFullYear() - pregnancy.age,
                  new Date().getMonth(),
                  new Date().getDate()
                ).toISOString().split('T')[0]
              : undefined,
            last_period_date: formatDate(pregnancy.lastPeriodDate),
            due_date: formatDate(pregnancy.dueDate),
            current_week: pregnancy.currentWeek,
            gravidity: pregnancy.gravidity,
            parity: pregnancy.parity,
            previous_pregnancies: pregnancy.previousPregnancies,
            delivery_place: pregnancy.deliveryPlace,
            referent_doctor: pregnancy.referentDoctor,
            is_active: pregnancy.isActive,
          });

          const backendId = res.data?.data?.id || res.data?.id || genId();
          const maternityPatientId = res.data?.data?.maternity_id || res.data?.maternity_id || backendId;
          const pregnancyId = genId();
          console.log('[MedicalStore] Backend maternity patient created with ID:', backendId);
          console.log('[MedicalStore] Maternity patient ID for pregnancy:', maternityPatientId);

          // Créer la grossesse associée
          await maternityAPI.createPregnancy(backendId, {
            last_menstrual_period: formatDate(pregnancy.lastPeriodDate),
            expected_delivery_date: formatDate(pregnancy.dueDate),
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

          if (!Array.isArray(backendPatients) || backendPatients.length === 0) {
            console.log('[MedicalStore] No maternity patients from backend');
            return;
          }

          const mappedPatients: MaternityPatient[] = backendPatients.map((data: any) => {
            // Mapper pregnancy
            const pregnancy: Pregnancy = {
              id: data.pregnancy?.id || genId(),
              patientId: String(data.id),
              firstName: data.first_name || '',
              age: data.age || 25,
              lastPeriodDate: data.pregnancy?.last_period_date,
              dueDate: data.pregnancy?.due_date,
              currentWeek: data.pregnancy?.current_week || 1,
              gravidity: data.pregnancy?.gravidity || 1,
              parity: data.pregnancy?.parity || 0,
              previousPregnancies: data.pregnancy?.previous_pregnancies || [],
              deliveryPlace: data.pregnancy?.delivery_place || '',
              referentDoctor: data.pregnancy?.referent_doctor,
              isActive: data.pregnancy?.is_active !== undefined ? data.pregnancy.is_active : true,
            };

            // Mapper prenatal_consultations vers PrenatalExam
            const prenatalExams: PrenatalExam[] = (data.prenatal_consultations || []).map((pc: any) => {
              const bloodPressure = pc.blood_pressure || '';
              const [systolic, diastolic] = bloodPressure.split('/').map((s: string) => parseInt(s, 10));

              return {
                id: String(pc.id || genId()),
                pregnancyId: pregnancy.id,
                date: pc.date || '',
                week: pc.week || 1,
                weight: pc.weight || undefined,
                systolicBP: systolic || undefined,
                diastolicBP: diastolic || undefined,
                uterineHeight: undefined,
                fetalHeartRate: pc.fetal_heart_rate || undefined,
                fetalPresentation: undefined,
                labResults: [],
                ultrasound: undefined,
                prescriptions: [],
                observations: pc.notes || undefined,
                markedDone: true,
              };
            });

            return {
              id: String(data.id),
              userId: data.user_id ? String(data.user_id) : undefined,
              linkedEmail: data.linked_email?.toLowerCase(),
              pregnancy,
              weeklyCheckups: [],
              prenatalConsultations: [],
              prenatalExams,
              children: [],
              childGrowth: [],
              childVaccines: [],
              alertLevel: 'vert',
              soignantId: undefined,
            };
          });

          // Remplacer tous les patients maternité dans le store
          set({ maternityPatients: mappedPatients });
          console.log(`[MedicalStore] Synced ${mappedPatients.length} maternity patients from backend`);
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

          // Mapper pregnancy depuis backend
          const pregnancy: Pregnancy = {
            id: data.pregnancy?.id || genId(),
            patientId: String(data.id),
            firstName: data.first_name || '',
            age: data.age || 25,
            lastPeriodDate: data.pregnancy?.last_period_date,
            dueDate: data.pregnancy?.due_date,
            currentWeek: data.pregnancy?.current_week || 1,
            gravidity: data.pregnancy?.gravidity || 1,
            parity: data.pregnancy?.parity || 0,
            previousPregnancies: data.pregnancy?.previous_pregnancies || [],
            deliveryPlace: data.pregnancy?.delivery_place || '',
            referentDoctor: data.pregnancy?.referent_doctor,
            isActive: data.pregnancy?.is_active !== undefined ? data.pregnancy.is_active : true,
          };

          // Mapper prenatal_consultations vers PrenatalExam
          const prenatalExams: PrenatalExam[] = (data.prenatal_consultations || []).map((pc: any) => {
            const bloodPressure = pc.blood_pressure || '';
            const [systolic, diastolic] = bloodPressure.split('/').map((s: string) => parseInt(s, 10));

            return {
              id: String(pc.id || genId()),
              pregnancyId: pregnancy.id,
              date: pc.date || '',
              week: pc.week || 1,
              weight: pc.weight || undefined,
              systolicBP: systolic || undefined,
              diastolicBP: diastolic || undefined,
              uterineHeight: undefined,
              fetalHeartRate: pc.fetal_heart_rate || undefined,
              fetalPresentation: undefined,
              labResults: [],
              ultrasound: undefined,
              prescriptions: [],
              observations: pc.notes || undefined,
              markedDone: true,
            };
          });

          // Créer MaternityPatient depuis backend (source de vérité)
          const record: MaternityPatient = {
            id: String(data.id),
            userId: userId,
            linkedEmail: data.linked_email?.toLowerCase(),
            pregnancy,
            weeklyCheckups: [],
            prenatalConsultations: [],
            prenatalExams,
            children: [],
            childGrowth: [],
            childVaccines: [],
            alertLevel: 'vert',
            soignantId: undefined,
          };

          // Remplacer ou ajouter dans le store
          set((state) => {
            const existingIndex = state.maternityPatients.findIndex(
              (p) => p.id === record.id || p.userId === userId
            );

            if (existingIndex !== -1) {
              console.log('[MedicalStore] Replacing maternity record from backend:', record.id);
              const updatedPatients = [...state.maternityPatients];
              updatedPatients[existingIndex] = record;
              return { maternityPatients: updatedPatients };
            } else {
              console.log('[MedicalStore] Adding new maternity record from backend:', record.id);
              return { maternityPatients: [...state.maternityPatients, record] };
            }
          });

          console.log('[MedicalStore] My maternity record synced from backend:', record.id);
        } catch (e: any) {
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
        maternityAPI.createWeeklyCheckup(patientId, patient.pregnancy.id, {
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
        const patient = get().maternityPatients.find(p => p.id === patientId);
        if (!patient) {
          console.warn('[MedicalStore] schedulePrenatalConsultation: patient introuvable', patientId);
          return;
        }

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

        // Sync backend en arrière-plan (PATCH sur la consultation existante)
        maternityAPI.updatePrenatalConsultation(patientId, patient.pregnancy.id, consultationId, {
          scheduled_date: scheduledDate,
          status: 'planifiee',
        }).then(() => {
          console.log('[MedicalStore] Consultation scheduled, syncing maternity patients from backend');
          get().syncMaternityPatientsFromBackend();
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[MedicalStore] Backend schedulePrenatalConsultation failed:', errorMsg);
          // Données locales conservées même en cas d'échec backend
        });
      },

      markPrenatalConsultationDone: (patientId, consultationId, date, notes) => {
        const patient = get().maternityPatients.find(p => p.id === patientId);
        if (!patient) {
          console.warn('[MedicalStore] markPrenatalConsultationDone: patient introuvable', patientId);
          return;
        }

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

        // Sync backend en arrière-plan (PATCH sur la consultation existante).
        // consultation_date = date réelle de l'acte, distincte de scheduled_date.
        maternityAPI.updatePrenatalConsultation(patientId, patient.pregnancy.id, consultationId, {
          consultation_date: date,
          clinical_findings: notes || '',
          status: 'effectuee',
        }).then(() => {
          console.log('[MedicalStore] Consultation marked done, syncing maternity patients from backend');
          get().syncMaternityPatientsFromBackend();
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
        const patient = get().maternityPatients.find(p => p.id === patientId);
        if (!patient) {
          console.warn('[MedicalStore] addChild: patient introuvable', patientId);
          return genId();
        }

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

        // ChildProfile ne porte PAS de sexe. Aucun écran actuel n'en fournit
        // (vérifié : app/(tabs)/maternite/child-tracking.tsx et les autres écrans
        // maternité ne collectent pas cette information). Plutôt qu'inventer
        // une valeur ('M' par défaut est inacceptable dans un dossier médical),
        // on n'appelle pas le backend et on logue l'anomalie. L'enfant reste
        // créé en local ; il devra être resynchronisé quand un formulaire
        // exposera le champ sexe.
        const childGender = (child as unknown as { gender?: string }).gender;
        if (!childGender) {
          console.error(
            '[MedicalStore] addChild: sexe manquant — création backend annulée pour éviter une valeur inventée. patientId=',
            patientId,
            ' childId=',
            id,
          );
          return id;
        }

        // Nom de famille : celui de la mère (patient parent).
        // MaternityPatient ne porte pas d'identité — on le retrouve dans
        // la collection patients qui a le même id.
        const motherRecord = get().patients.find(p => p.id === patientId);
        const motherLastName = motherRecord?.identity.lastName || '';

        // Sync backend en arrière-plan
        maternityAPI.createChild(patientId, patient.pregnancy.id, {
          first_name: child.firstName,
          last_name: motherLastName,
          gender: childGender,
          birth_date: child.birthDate,
          birth_weight: child.birthWeight,
          birth_height: child.birthHeight,
          head_circumference: child.headCircumference,
        }).then(() => {
          console.log('[MedicalStore] Child created, syncing maternity patients from backend');
          get().syncMaternityPatientsFromBackend();
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
