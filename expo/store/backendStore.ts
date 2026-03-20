import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BackendPatient,
  BackendMaternityPatient
} from './backendTypes';
import { dossierAPI, maternityAPI } from './api';

interface BackendStore {
  // Données brutes du backend
  myRecord: BackendPatient | null;
  patients: BackendPatient[];
  myMaternity: BackendMaternityPatient | null;
  maternityPatients: BackendMaternityPatient[];

  // Sync en cours
  isSyncing: boolean;
  lastSyncAt: number | null;

  // Actions sync
  syncMyRecord: (userId: string) => Promise<void>;
  syncPatients: () => Promise<void>;
  syncMyMaternity: (userId: string) => Promise<void>;
  syncMaternityPatients: () => Promise<void>;

  // Reset
  reset: () => void;
}

export const useBackendStore = create<BackendStore>()(
  persist(
    (set, get) => ({
      myRecord: null,
      patients: [],
      myMaternity: null,
      maternityPatients: [],
      isSyncing: false,
      lastSyncAt: null,

      syncMyRecord: async (userId: string) => {
        try {
          console.log('[BackendStore] Syncing my record for userId:', userId);
          const res = await dossierAPI.myRecord();
          const data = res.data?.data || res.data;
          if (data) {
            set({ myRecord: data as BackendPatient, lastSyncAt: Date.now() });
            console.log('[BackendStore] My record synced:', data.id);
          }
        } catch (e: any) {
          if (e?.response?.status !== 404) {
            console.warn('[BackendStore] syncMyRecord failed:', e?.message);
          } else {
            console.log('[BackendStore] No record found (404)');
          }
        }
      },

      syncPatients: async () => {
        try {
          console.log('[BackendStore] Syncing patients...');
          const res = await dossierAPI.listPatients();
          const data = res.data?.data || res.data?.results || res.data;
          if (Array.isArray(data)) {
            set({ patients: data as BackendPatient[], lastSyncAt: Date.now() });
            console.log(`[BackendStore] Synced ${data.length} patients`);
          }
        } catch (e: any) {
          console.warn('[BackendStore] syncPatients failed:', e?.message);
        }
      },

      syncMyMaternity: async (userId: string) => {
        try {
          console.log('[BackendStore] Syncing my maternity record for userId:', userId);
          const res = await maternityAPI.myRecord();
          const data = res.data?.data || res.data;
          if (data) {
            set({ myMaternity: data as BackendMaternityPatient, lastSyncAt: Date.now() });
            console.log('[BackendStore] My maternity synced:', data.id);
          }
        } catch (e: any) {
          if (e?.response?.status !== 404) {
            console.warn('[BackendStore] syncMyMaternity failed:', e?.message);
          } else {
            console.log('[BackendStore] No maternity record found (404)');
          }
        }
      },

      syncMaternityPatients: async () => {
        try {
          console.log('[BackendStore] Syncing maternity patients...');
          const res = await maternityAPI.listMaternityPatients();
          const data = res.data?.data || res.data?.results || res.data;
          if (Array.isArray(data)) {
            set({ maternityPatients: data as BackendMaternityPatient[], lastSyncAt: Date.now() });
            console.log(`[BackendStore] Synced ${data.length} maternity patients`);
          }
        } catch (e: any) {
          console.warn('[BackendStore] syncMaternityPatients failed:', e?.message);
        }
      },

      reset: () => set({
        myRecord: null,
        patients: [],
        myMaternity: null,
        maternityPatients: [],
        lastSyncAt: null,
      }),
    }),
    {
      name: 'kendeya-backend-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
