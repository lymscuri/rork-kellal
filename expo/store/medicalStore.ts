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
} from '@/types/medical';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
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
  dossierAPI.updatePatient(patientId, data).then(() => {
    console.log('[MedicalStore] Backend patient updated:', patientId);
  }).catch((e) => {
    const errorMsg = extractErrorMessage(e);
    console.error('[MedicalStore] Backend updatePatient failed:', errorMsg);
    // Note: Erreur de synchronisation backend — les données locales sont conservées
  });
}

interface MedicalStore {
  patients: PatientRecord[];
  maternityPatients: MaternityPatient[];
  smsReminders: SmsReminder[];
  isSyncing: boolean;

  syncPatientsFromBackend: () => Promise<void>;
  syncMyRecordFromBackend: (userId: string) => Promise<void>;
  addPatient: (doctorId: string, identity: Partial<PatientIdentity>, userId?: string, linkedEmail?: string) => string;
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
  addLabResult: (patientId: string, result: Omit<LabResult, 'id' | 'patientId'>) => void;
  addVaccine: (patientId: string, vaccine: Omit<VaccineRecord, 'id' | 'patientId'>) => void;
  getDoctorStats: (doctorId: string) => DoctorStats;
  linkPatientToDoctor: (patientDossierNumber: string, doctorId: string) => boolean;
  linkPatientToUser: (patientId: string, userId: string) => void;

  getMyRecord: (userId: string) => PatientRecord | undefined;
  getMyRecordByEmail: (email: string) => PatientRecord | undefined;
  getMyPrescriptions: (userId: string) => { consultation: ConsultationRecord; prescriptions: PrescriptionItem[] }[];
  getQRCodeData: (userId: string) => string;
  searchPatientInStore: (email: string) => PatientRecord | null;
  searchPatientInStoreByPhone: (phone: string) => PatientRecord | null;

  addMaternityPatient: (soignantId: string, pregnancy: Omit<Pregnancy, 'id' | 'patientId'>, userId?: string, linkedEmail?: string) => string;
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
            const mappedPatients: PatientRecord[] = backendPatients.map(bp => ({
              id: String(bp.id),
              userId: bp.user_id ? String(bp.user_id) : undefined,
              linkedEmail: bp.email?.toLowerCase(),
              identity: {
                firstName: bp.first_name || '',
                lastName: bp.last_name || '',
                dossierNumber: bp.dossier_number || `KNY-${Date.now()}`,
                emergencyContacts: bp.emergency_contacts || [],
                photo: bp.photo,
                birthDate: bp.date_of_birth || bp.birth_date,
                sex: bp.gender === 'M' || bp.gender === 'F' ? bp.gender : undefined,
                phone: bp.phone,
                address: bp.address,
                commune: bp.city || bp.commune,
                prefecture: bp.prefecture,
              },
              criticalInfo: {
                drugAllergies: bp.critical_info?.drugAllergies ||
                  (bp.allergies ? [{ name: bp.allergies, type: 'other' as const }] : []),
                foodAllergies: bp.critical_info?.foodAllergies || [],
                chronicDiseases: bp.critical_info?.chronicDiseases ||
                  (bp.chronic_conditions ? [bp.chronic_conditions] : []),
                permanentTreatments: bp.critical_info?.permanentTreatments || [],
                bloodGroup: bp.blood_type || bp.critical_info?.bloodGroup || '',
                rhFactor: bp.critical_info?.rhFactor,
              },
              personalHistory: bp.personal_history || { surgeries: [], hospitalizations: [], bloodTransfusion: false },
              familyHistory: bp.family_history || { diabetes: false, hypertension: false, cancer: false, sickleCell: false, hereditary: false },
              lifeHabits: bp.life_habits || { tobacco: false, alcohol: false, physicalActivity: 'moderee' },
              consultations: bp.consultations || [],
              labResults: bp.lab_results || [],
              vaccines: bp.vaccinations || [],
              doctorIds: bp.doctor_ids || [],
              doctorId: bp.doctor_id || bp.created_by,
              createdAt: bp.created_at || new Date().toISOString(),
              updatedAt: bp.updated_at || new Date().toISOString(),
            }));

            set((state) => {
              const existingIds = new Set(state.patients.map(p => p.id));
              const newPatients = mappedPatients.filter(p => !existingIds.has(p.id));
              return { patients: [...state.patients, ...newPatients] };
            });

            console.log('[MedicalStore] Synced', mappedPatients.length, 'patients from backend');
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

          // Mapper vers PatientRecord
          const mappedRecord: PatientRecord = {
            id: String(data.id),
            userId: userId,
            linkedEmail: data.email?.toLowerCase(),
            identity: {
              firstName: data.first_name || '',
              lastName: data.last_name || '',
              dossierNumber: data.dossier_number || `KNY-${Date.now()}`,
              emergencyContacts: data.emergency_contacts || [],
              photo: data.photo,
              birthDate: data.date_of_birth || data.birth_date,
              sex: data.gender === 'M' || data.gender === 'F' ? data.gender : undefined,
              phone: data.phone,
              address: data.address,
              commune: data.city || data.commune,
              prefecture: data.prefecture,
            },
            criticalInfo: {
              drugAllergies: data.critical_info?.drugAllergies ||
                (data.allergies ? [{ name: data.allergies, type: 'other' as const }] : []),
              foodAllergies: data.critical_info?.foodAllergies || [],
              chronicDiseases: data.critical_info?.chronicDiseases ||
                (data.chronic_conditions ? [data.chronic_conditions] : []),
              permanentTreatments: data.critical_info?.permanentTreatments || [],
              bloodGroup: data.blood_type || data.critical_info?.bloodGroup || '',
              rhFactor: data.critical_info?.rhFactor,
            },
            personalHistory: data.personal_history || { surgeries: [], hospitalizations: [], bloodTransfusion: false },
            familyHistory: data.family_history || { diabetes: false, hypertension: false, cancer: false, sickleCell: false, hereditary: false },
            lifeHabits: data.life_habits || { tobacco: false, alcohol: false, physicalActivity: 'moderee' },
            consultations: data.consultations || [],
            labResults: data.lab_results || [],
            vaccines: data.vaccinations || [],
            doctorIds: data.doctor_ids || [],
            doctorId: data.doctor_id || data.created_by,
            createdAt: data.created_at || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
          };

          // FLUX DE SYNCHRONISATION:
          // 1. Le médecin crée un dossier sur Railway avec le email du patient
          // 2. Le patient se connecte → on récupère son dossier via GET /dossiers/my-record/
          // 3. On assigne userId au dossier récupéré
          // 4. On cherche si ce dossier existe déjà localement (par id backend OU par userId)
          // 5. Si trouvé → TOUJOURS mettre à jour avec les données du backend (source de vérité)
          // 6. Si pas trouvé → Ajouter le nouveau dossier
          set((state) => {
            const existingIndex = state.patients.findIndex(
              (p) => p.id === mappedRecord.id || p.userId === mappedRecord.userId
            );

            if (existingIndex !== -1) {
              // Dossier existe → Mettre à jour avec les données du backend
              console.log('[MedicalStore] Updating existing patient record from backend:', mappedRecord.id);
              const updatedPatients = [...state.patients];
              updatedPatients[existingIndex] = mappedRecord;
              return { patients: updatedPatients };
            } else {
              // Dossier n'existe pas → Ajouter
              console.log('[MedicalStore] Adding new patient record from backend:', mappedRecord.id);
              return {
                patients: [...state.patients, mappedRecord],
              };
            }
          });

          console.log('[MedicalStore] My record synced from backend:', mappedRecord.id, 'userId:', userId);
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
          const res = await dossierAPI.createConsultation(patientId, {
            patient: patientId,
            doctor_name: consultation.doctorName,
            date: consultation.date,
            time: consultation.time,
            reason: consultation.reason,
            vital_signs: consultation.vitalSigns,
            clinical_exams: consultation.clinicalExams,
            main_diagnosis: consultation.mainDiagnosis,
            differential_diagnosis: consultation.differentialDiagnosis,
            treatment: consultation.treatment,
            prescriptions: consultation.prescriptions,
            requested_exams: consultation.requestedExams,
            next_appointment: consultation.nextAppointment,
            referral: consultation.referral,
            referral_structure: consultation.referralStructure,
            observations: consultation.observations,
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

      addLabResult: (patientId, result) => {
        const id = genId();
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
      },

      addVaccine: async (patientId, vaccine) => {
        try {
          const res = await dossierAPI.addVaccination(patientId, {
            patient: patientId,
            vaccine_name: vaccine.name,
            vaccine_type: vaccine.name,        // utilise le nom comme type par défaut
            date_administered: vaccine.date 
              ? new Date(vaccine.date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            facility: vaccine.facility || '',
            administered_by: vaccine.doctor || '',
            next_dose_date: vaccine.nextReminder || null,
            notes: '',
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

      getDoctorStats: (doctorId) => {
        const patients = get().patients.filter(p => p.doctorId === doctorId || (p.doctorIds && p.doctorIds.includes(doctorId)));
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        let monthConsultations = 0;
        let monthPrescriptions = 0;
        patients.forEach(p => {
          p.consultations.forEach(c => {
            if (c.date >= monthStart) {
              monthConsultations++;
              monthPrescriptions += c.prescriptions.length > 0 ? 1 : 0;
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
          .filter(c => c.prescriptions.length > 0)
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
              const pregnancyId = genId();
              const consultations: PrenatalConsultation[] = DEFAULT_PRENATAL_CONSULTATIONS.map(c => ({
                ...c,
                id: genId(),
                pregnancyId,
              }));

              return {
                id: String(bp.id),
                userId: bp.user_id ? String(bp.user_id) : undefined,
                linkedEmail: bp.linked_email?.toLowerCase(),
                pregnancy: {
                  id: pregnancyId,
                  patientId: String(bp.id),
                  firstName: bp.first_name || '',
                  age: bp.age || 25,
                  lastPeriodDate: bp.last_period_date,
                  dueDate: bp.due_date,
                  currentWeek: bp.current_week || 1,
                  gravidity: bp.gravidity || 1,
                  parity: bp.parity || 0,
                  previousPregnancies: bp.previous_pregnancies,
                  deliveryPlace: bp.delivery_place,
                  referentDoctor: bp.referent_doctor,
                  isActive: bp.is_active !== undefined ? bp.is_active : true,
                },
                weeklyCheckups: [],
                prenatalConsultations: consultations,
                prenatalExams: [],
                children: [],
                childGrowth: [],
                childVaccines: [],
                alertLevel: 'vert',
                soignantId: bp.soignant_id || bp.created_by,
              };
            });

            set((state) => {
              const existingIds = new Set(state.maternityPatients.map(p => p.id));
              const newPatients = mappedPatients.filter(p => !existingIds.has(p.id));
              return { maternityPatients: [...state.maternityPatients, ...newPatients] };
            });

            console.log('[MedicalStore] Synced', mappedPatients.length, 'maternity patients from backend');
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
          const pregnancyId = genId();
          const consultations: PrenatalConsultation[] = DEFAULT_PRENATAL_CONSULTATIONS.map(c => ({
            ...c,
            id: genId(),
            pregnancyId,
          }));

          const mappedRecord: MaternityPatient = {
            id: String(data.id),
            userId: userId,
            linkedEmail: data.email?.toLowerCase() || data.linked_email?.toLowerCase(),
            pregnancy: {
              id: pregnancyId,
              patientId: String(data.id),
              firstName: data.first_name || '',
              age: data.age || 25,
              lastPeriodDate: data.last_period_date,
              dueDate: data.due_date,
              currentWeek: data.current_week || 1,
              gravidity: data.gravidity || 1,
              parity: data.parity || 0,
              previousPregnancies: data.previous_pregnancies,
              deliveryPlace: data.delivery_place,
              referentDoctor: data.referent_doctor,
              isActive: data.is_active !== undefined ? data.is_active : true,
            },
            weeklyCheckups: [],
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
          // 4. On cherche si ce dossier existe déjà localement (par id backend OU par userId)
          // 5. Si trouvé → TOUJOURS mettre à jour avec les données du backend (source de vérité)
          // 6. Si pas trouvé → Ajouter le nouveau dossier
          set((state) => {
            const existingIndex = state.maternityPatients.findIndex(
              (p) => p.id === mappedRecord.id || p.userId === mappedRecord.userId
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
          sex: child.sex,
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
        }
      },
    }
  )
);
