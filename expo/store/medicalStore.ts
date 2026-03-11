import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
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

interface MedicalStore {
  patients: PatientRecord[];
  maternityPatients: MaternityPatient[];
  smsReminders: SmsReminder[];

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

  addMaternityPatient: (soignantId: string, pregnancy: Omit<Pregnancy, 'id' | 'patientId'>, userId?: string, linkedEmail?: string) => string;
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

      addPatient: (doctorId, identity, userId, linkedEmail) => {
        const id = genId();
        const dossierNumber = identity.dossierNumber || `KNY-${new Date().getFullYear()}-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
        const newPatient: PatientRecord = {
          id,
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
        console.log('[MedicalStore] Patient added:', id, dossierNumber, 'linked to userId:', userId, 'linkedEmail:', linkedEmail);
        return id;
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
      },

      updateCriticalInfo: (patientId, info) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, criticalInfo: { ...p.criticalInfo, ...info }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      updatePersonalHistory: (patientId, history) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, personalHistory: { ...p.personalHistory, ...history }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      updateFamilyHistory: (patientId, history) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, familyHistory: { ...p.familyHistory, ...history }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      updateLifeHabits: (patientId, habits) => {
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? { ...p, lifeHabits: { ...p.lifeHabits, ...habits }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      addConsultation: (patientId, consultation) => {
        const id = genId();
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? {
                  ...p,
                  consultations: [{ ...consultation, id, patientId } as ConsultationRecord, ...p.consultations],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
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

      addVaccine: (patientId, vaccine) => {
        const id = genId();
        set((state) => ({
          patients: state.patients.map(p =>
            p.id === patientId
              ? {
                  ...p,
                  vaccines: [...p.vaccines, { ...vaccine, id, patientId } as VaccineRecord],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
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
        return JSON.stringify({
          dossierNumber: patient.identity.dossierNumber,
          firstName: patient.identity.firstName,
          lastName: patient.identity.lastName,
          birthDate: patient.identity.birthDate,
          sex: patient.identity.sex,
          bloodGroup: patient.criticalInfo.bloodGroup,
          rhFactor: patient.criticalInfo.rhFactor,
          drugAllergies: patient.criticalInfo.drugAllergies.map(a => ({ name: a.name, severity: a.severity })),
          foodAllergies: patient.criticalInfo.foodAllergies.map(a => a.name),
          chronicDiseases: patient.criticalInfo.chronicDiseases,
          permanentTreatments: patient.criticalInfo.permanentTreatments.map(t => t.medication),
          emergencyContacts: patient.identity.emergencyContacts.map(c => ({
            name: c.fullName,
            phone: c.phoneNumber,
            relation: c.relationship,
          })),
        });
      },

      addMaternityPatient: (soignantId, pregnancy, userId, linkedEmail) => {
        const id = genId();
        const pregnancyId = genId();
        const consultations: PrenatalConsultation[] = DEFAULT_PRENATAL_CONSULTATIONS.map(c => ({
          ...c,
          id: genId(),
          pregnancyId,
        }));

        const newPatient: MaternityPatient = {
          id,
          userId,
          linkedEmail: linkedEmail?.toLowerCase(),
          pregnancy: { ...pregnancy, id: pregnancyId, patientId: id },
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
        console.log('[MedicalStore] Maternity patient added:', id, 'linked to userId:', userId, 'soignantId:', soignantId);
        return id;
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

        set((state) => ({
          maternityPatients: state.maternityPatients.map(p =>
            p.id === patientId
              ? { ...p, weeklyCheckups: [...p.weeklyCheckups, newCheckup], alertLevel }
              : p
          ),
        }));
      },

      schedulePrenatalConsultation: (patientId, consultationId, scheduledDate) => {
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
      },

      markPrenatalConsultationDone: (patientId, consultationId, date, notes) => {
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
    }
  )
);
