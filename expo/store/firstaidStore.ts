// Store « Premiers secours » (zustand + persist AsyncStorage, comme les autres stores).
// Rôle : couche de données uniquement — cache ETag/version + rafraîchissement
// conditionnel + état hors ligne. La navigation dans l'arbre est gérée côté écran.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AxiosResponse } from 'axios';
import { zustandStorage } from './storage';
import { firstaidAPI } from './api';
import { interpretRefresh } from './firstaid/logic';
import type {
  FirstAidCache,
  FirstAidMeta,
  Protocol,
  ProtocolSummary,
  MetaEnvelope,
  ProtocolsEnvelope,
  ProtocolEnvelope,
} from '@/types/firstaid';

function readEtag(res: AxiosResponse): string | null {
  const raw = res.headers?.etag ?? res.headers?.ETag;
  return typeof raw === 'string' ? raw : null;
}

interface FirstAidState {
  cache: FirstAidCache;
  isOffline: boolean;
  isHydrated: boolean;

  // Lecture synchrone du cache (sert l'UI immédiatement au démarrage).
  getCachedMeta: (lang: string) => FirstAidMeta | null;
  getCachedList: (lang: string) => ProtocolSummary[] | null;
  getCachedProtocol: (id: string, lang: string) => Protocol | null;

  // Rafraîchissement en arrière-plan (If-None-Match -> 304 = rien à faire).
  fetchMeta: (lang: string) => Promise<FirstAidMeta | null>;
  fetchProtocols: (lang: string) => Promise<ProtocolSummary[] | null>;
  fetchProtocol: (id: string, lang: string) => Promise<Protocol | null>;

  reset: () => void;
}

const emptyCache: FirstAidCache = { meta: {}, list: {}, protocols: {} };

export const useFirstAidStore = create<FirstAidState>()(
  persist(
    (set, get) => ({
      cache: emptyCache,
      isOffline: false,
      isHydrated: false,

      getCachedMeta: (lang) => get().cache.meta[lang]?.data ?? null,
      getCachedList: (lang) => get().cache.list[lang]?.data ?? null,
      getCachedProtocol: (id, lang) => get().cache.protocols[`${id}:${lang}`]?.data ?? null,

      fetchMeta: async (lang) => {
        const prev = get().cache.meta[lang] ?? null;
        try {
          const res = await firstaidAPI.getMeta(lang, prev?.etag);
          const body = res.data as MetaEnvelope | undefined;
          const outcome = interpretRefresh<FirstAidMeta>(
            res.status,
            body?.data,
            readEtag(res),
            null,
            new Date().toISOString(),
          );
          if (outcome.kind === 'updated') {
            set((s) => ({
              isOffline: false,
              cache: { ...s.cache, meta: { ...s.cache.meta, [lang]: outcome.entry } },
            }));
            return outcome.entry.data;
          }
          if (outcome.kind === 'not_modified') {
            set({ isOffline: false });
            return prev?.data ?? null;
          }
          set({ isOffline: true });
          return prev?.data ?? null;
        } catch (e) {
          console.warn('[FirstAid] fetchMeta offline/erreur:', e);
          set({ isOffline: true });
          return prev?.data ?? null;
        }
      },

      fetchProtocols: async (lang) => {
        const prev = get().cache.list[lang] ?? null;
        try {
          const res = await firstaidAPI.listProtocols(lang, prev?.etag);
          const body = res.data as ProtocolsEnvelope | undefined;
          const outcome = interpretRefresh<ProtocolSummary[]>(
            res.status,
            body?.results,
            readEtag(res),
            null,
            new Date().toISOString(),
          );
          if (outcome.kind === 'updated') {
            set((s) => ({
              isOffline: false,
              cache: { ...s.cache, list: { ...s.cache.list, [lang]: outcome.entry } },
            }));
            return outcome.entry.data;
          }
          if (outcome.kind === 'not_modified') {
            set({ isOffline: false });
            return prev?.data ?? null;
          }
          set({ isOffline: true });
          return prev?.data ?? null;
        } catch (e) {
          console.warn('[FirstAid] fetchProtocols offline/erreur:', e);
          set({ isOffline: true });
          return prev?.data ?? null;
        }
      },

      fetchProtocol: async (id, lang) => {
        const key = `${id}:${lang}`;
        const prev = get().cache.protocols[key] ?? null;
        try {
          const res = await firstaidAPI.getProtocol(id, lang, prev?.etag);
          const body = res.data as ProtocolEnvelope | undefined;
          const outcome = interpretRefresh<Protocol>(
            res.status,
            body?.data,
            readEtag(res),
            body?.data?.version ?? null,
            new Date().toISOString(),
          );
          if (outcome.kind === 'updated') {
            set((s) => ({
              isOffline: false,
              cache: { ...s.cache, protocols: { ...s.cache.protocols, [key]: outcome.entry } },
            }));
            return outcome.entry.data;
          }
          if (outcome.kind === 'not_modified') {
            set({ isOffline: false });
            return prev?.data ?? null;
          }
          set({ isOffline: true });
          return prev?.data ?? null;
        } catch (e) {
          console.warn('[FirstAid] fetchProtocol offline/erreur:', e);
          set({ isOffline: true });
          return prev?.data ?? null;
        }
      },

      reset: () => set({ cache: emptyCache, isOffline: false }),
    }),
    {
      name: 'kendeya-firstaid-cache',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ cache: state.cache }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);
