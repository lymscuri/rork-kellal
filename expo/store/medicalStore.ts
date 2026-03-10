import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import type { 
  MedicalProfile, 
  MaternityData, 
  Allergy, 
  ChronicDisease, 
  Surgery, 
  Hospitalization,
  Medication,
  EmergencyContact,
  Pregnancy,
  WeeklyCheckup,
  Child,
  MedicalConsultation,
  LabResult,
  MedicalDocument,
  SharedAccess,
} from '@/types/medical';

// État initial du profil médical
const initialMedicalProfile: MedicalProfile = {
  bloodGroup: undefined,
  rhFactor: undefined,
  allergies: [],
  chronicDiseases: [],
  surgeries: [],
  hospitalizations: [],
  medications: [],
  emergencyContacts: [],
};

// État initial de la maternité
const initialMaternityData: MaternityData = {
  pregnancy: undefined,
  weeklyCheckups: [],
  consultations: [
    { id: 'c1', week: 8, title: '1ère consultation', status: 'a_venir' },
    { id: 'c2', week: 12, title: '2ème consultation', status: 'a_venir' },
    { id: 'c3', week: 20, title: '3ème consultation', status: 'a_venir' },
    { id: 'c4', week: 28, title: '4ème consultation', status: 'a_venir' },
    { id: 'c5', week: 32, title: '5ème consultation', status: 'a_venir' },
    { id: 'c6', week: 36, title: '6ème consultation', status: 'a_venir' },
    { id: 'c7', week: 38, title: '7ème consultation', status: 'a_venir' },
    { id: 'c8', week: 40, title: '8ème consultation', status: 'a_venir' },
  ],
  children: [],
  vaccines: [
    { id: 'v1', name: 'BCG', age: 'Naissance', status: 'a_faire' },
    { id: 'v2', name: 'VPO0', age: 'Naissance', status: 'a_faire' },
    { id: 'v3', name: 'Pentavalent 1', age: '6 semaines', status: 'a_faire' },
    { id: 'v4', name: 'Pentavalent 2', age: '10 semaines', status: 'a_faire' },
    { id: 'v5', name: 'Pentavalent 3', age: '14 semaines', status: 'a_faire' },
    { id: 'v6', name: 'Rougeole', age: '9 mois', status: 'a_faire' },
    { id: 'v7', name: 'Méningite', age: '9 mois', status: 'a_faire' },
  ],
};

interface MedicalStore {
  medicalProfile: MedicalProfile;
  setBloodGroup: (bloodGroup: MedicalProfile['bloodGroup']) => void;
  setRhFactor: (rhFactor: MedicalProfile['rhFactor']) => void;
  addAllergy: (allergy: Omit<Allergy, 'id'>) => void;
  removeAllergy: (id: string) => void;
  addChronicDisease: (disease: Omit<ChronicDisease, 'id'>) => void;
  removeChronicDisease: (id: string) => void;
  addSurgery: (surgery: Omit<Surgery, 'id'>) => void;
  removeSurgery: (id: string) => void;
  addHospitalization: (hospitalization: Omit<Hospitalization, 'id'>) => void;
  removeHospitalization: (id: string) => void;
  addMedication: (medication: Omit<Medication, 'id'>) => void;
  removeMedication: (id: string) => void;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  removeEmergencyContact: (id: string) => void;
  updateMedicalProfile: (profile: Partial<MedicalProfile>) => void;
  
  consultations: MedicalConsultation[];
  addConsultation: (consultation: Omit<MedicalConsultation, 'id'>) => void;
  removeConsultation: (id: string) => void;
  
  labResults: LabResult[];
  addLabResult: (result: Omit<LabResult, 'id'>) => void;
  removeLabResult: (id: string) => void;
  
  documents: MedicalDocument[];
  addDocument: (doc: Omit<MedicalDocument, 'id'>) => void;
  removeDocument: (id: string) => void;
  
  sharedAccess: SharedAccess[];
  addSharedAccess: (access: Omit<SharedAccess, 'id'>) => void;
  removeSharedAccess: (id: string) => void;
  toggleSharedAccess: (id: string) => void;

  maternityData: MaternityData;
  setPregnancy: (pregnancy: Pregnancy) => void;
  updatePregnancyWeek: () => void;
  addWeeklyCheckup: (checkup: Omit<WeeklyCheckup, 'week'>) => void;
  markConsultationDone: (id: string, date: string) => void;
  addChild: (child: Omit<Child, 'id'>) => void;
  updateChild: (id: string, child: Partial<Child>) => void;
  markVaccineDone: (id: string, date: string) => void;
  
  getCriticalAllergies: () => Allergy[];
  hasSevereAllergy: (medicationName: string) => boolean;
  isPregnant: () => boolean;
  getCurrentPregnancyWeek: () => number;
  getQRCodeData: () => string;
}

export const useMedicalStore = create<MedicalStore>()(
  persist(
    (set, get) => ({
      medicalProfile: initialMedicalProfile,
      consultations: [],
      labResults: [],
      documents: [],
      sharedAccess: [],
      maternityData: initialMaternityData,

      // Profil médical
      setBloodGroup: (bloodGroup) => 
        set((state) => ({ 
          medicalProfile: { ...state.medicalProfile, bloodGroup } 
        })),
      
      setRhFactor: (rhFactor) => 
        set((state) => ({ 
          medicalProfile: { ...state.medicalProfile, rhFactor } 
        })),

      addAllergy: (allergy) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            allergies: [...state.medicalProfile.allergies, { ...allergy, id: Date.now().toString() }]
          }
        })),

      removeAllergy: (id) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            allergies: state.medicalProfile.allergies.filter(a => a.id !== id)
          }
        })),

      addChronicDisease: (disease) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            chronicDiseases: [...state.medicalProfile.chronicDiseases, { ...disease, id: Date.now().toString() }]
          }
        })),

      removeChronicDisease: (id) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            chronicDiseases: state.medicalProfile.chronicDiseases.filter(d => d.id !== id)
          }
        })),

      addSurgery: (surgery) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            surgeries: [...state.medicalProfile.surgeries, { ...surgery, id: Date.now().toString() }]
          }
        })),

      removeSurgery: (id) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            surgeries: state.medicalProfile.surgeries.filter(s => s.id !== id)
          }
        })),

      addHospitalization: (hospitalization) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            hospitalizations: [...state.medicalProfile.hospitalizations, { ...hospitalization, id: Date.now().toString() }]
          }
        })),

      removeHospitalization: (id) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            hospitalizations: state.medicalProfile.hospitalizations.filter(h => h.id !== id)
          }
        })),

      addMedication: (medication) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            medications: [...state.medicalProfile.medications, { ...medication, id: Date.now().toString() }]
          }
        })),

      removeMedication: (id) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            medications: state.medicalProfile.medications.filter(m => m.id !== id)
          }
        })),

      addEmergencyContact: (contact) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            emergencyContacts: [...state.medicalProfile.emergencyContacts, { ...contact, id: Date.now().toString() }]
          }
        })),

      removeEmergencyContact: (id) => 
        set((state) => ({
          medicalProfile: {
            ...state.medicalProfile,
            emergencyContacts: state.medicalProfile.emergencyContacts.filter(c => c.id !== id)
          }
        })),

      updateMedicalProfile: (profile) => 
        set((state) => ({
          medicalProfile: { ...state.medicalProfile, ...profile }
        })),

      addConsultation: (consultation) =>
        set((state) => ({
          consultations: [{ ...consultation, id: Date.now().toString() }, ...state.consultations]
        })),

      removeConsultation: (id) =>
        set((state) => ({
          consultations: state.consultations.filter(c => c.id !== id)
        })),

      addLabResult: (result) =>
        set((state) => ({
          labResults: [{ ...result, id: Date.now().toString() }, ...state.labResults]
        })),

      removeLabResult: (id) =>
        set((state) => ({
          labResults: state.labResults.filter(r => r.id !== id)
        })),

      addDocument: (doc) =>
        set((state) => ({
          documents: [{ ...doc, id: Date.now().toString() }, ...state.documents]
        })),

      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter(d => d.id !== id)
        })),

      addSharedAccess: (access) =>
        set((state) => ({
          sharedAccess: [{ ...access, id: Date.now().toString() }, ...state.sharedAccess]
        })),

      removeSharedAccess: (id) =>
        set((state) => ({
          sharedAccess: state.sharedAccess.filter(a => a.id !== id)
        })),

      toggleSharedAccess: (id) =>
        set((state) => ({
          sharedAccess: state.sharedAccess.map(a =>
            a.id === id ? { ...a, isActive: !a.isActive } : a
          )
        })),

      // Maternité
      setPregnancy: (pregnancy) => {
        const newPregnancy = { ...pregnancy, id: Date.now().toString() };
        set((state) => ({
          maternityData: {
            ...state.maternityData,
            pregnancy: newPregnancy
          }
        }));
      },

      updatePregnancyWeek: () => {
        const { pregnancy } = get().maternityData;
        if (!pregnancy?.lastPeriodDate) return;
        
        const lastPeriod = new Date(pregnancy.lastPeriodDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastPeriod.getTime());
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        
        set((state) => ({
          maternityData: {
            ...state.maternityData,
            pregnancy: state.maternityData.pregnancy 
              ? { ...state.maternityData.pregnancy, currentWeek: Math.min(diffWeeks, 42) }
              : undefined
          }
        }));
      },

      addWeeklyCheckup: (checkup) => {
        const currentWeek = get().getCurrentPregnancyWeek();
        set((state) => ({
          maternityData: {
            ...state.maternityData,
            weeklyCheckups: [...state.maternityData.weeklyCheckups, { ...checkup, week: currentWeek }]
          }
        }));
      },

      markConsultationDone: (id, date) => 
        set((state) => ({
          maternityData: {
            ...state.maternityData,
            consultations: state.maternityData.consultations.map(c => 
              c.id === id ? { ...c, status: 'effectuee' as const, date } : c
            )
          }
        })),

      addChild: (child) => 
        set((state) => ({
          maternityData: {
            ...state.maternityData,
            children: [...state.maternityData.children, { ...child, id: Date.now().toString() }]
          }
        })),

      updateChild: (id, childUpdate) => 
        set((state) => ({
          maternityData: {
            ...state.maternityData,
            children: state.maternityData.children.map(c => 
              c.id === id ? { ...c, ...childUpdate } : c
            )
          }
        })),

      markVaccineDone: (id, date) => 
        set((state) => ({
          maternityData: {
            ...state.maternityData,
            vaccines: state.maternityData.vaccines.map(v => 
              v.id === id ? { ...v, status: 'fait' as const, doneDate: date } : v
            )
          }
        })),

      // Helpers
      getCriticalAllergies: () => {
        return get().medicalProfile.allergies.filter(a => a.severity === 'severe');
      },

      hasSevereAllergy: (medicationName: string) => {
        return get().medicalProfile.allergies.some(
          a => a.type === 'medicament' && 
               a.name.toLowerCase() === medicationName.toLowerCase() &&
               a.severity === 'severe'
        );
      },

      isPregnant: () => {
        const { pregnancy } = get().maternityData;
        return pregnancy?.isActive ?? false;
      },

      getCurrentPregnancyWeek: () => {
        return get().maternityData.pregnancy?.currentWeek ?? 0;
      },

      getQRCodeData: () => {
        const { medicalProfile } = get();
        const data = {
          bloodGroup: medicalProfile.bloodGroup,
          rhFactor: medicalProfile.rhFactor,
          allergies: medicalProfile.allergies.filter(a => a.severity === 'severe').map(a => a.name),
          chronicDiseases: medicalProfile.chronicDiseases.map(d => d.name),
          medications: medicalProfile.medications.map(m => m.name),
          emergencyContacts: medicalProfile.emergencyContacts.map(c => ({
            name: c.fullName,
            phone: c.phoneNumber,
            relation: c.relationship
          }))
        };
        return JSON.stringify(data);
      }
    }),
    {
      name: 'santeconnect-medical-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
