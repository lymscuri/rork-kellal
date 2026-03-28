import { AppStorage } from './storage';
import { create } from 'zustand';
import { authAPI, storeTokens, clearTokens, getStoredTokens, extractErrorMessage } from './api';

export type UserRole = 'medecin' | 'patient';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  dossierNumber?: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateProfile: (userData: Partial<User>) => void;
  setHydrated: (hydrated: boolean) => void;
  hydrate: () => Promise<void>;
  fetchMe: () => Promise<void>;
  findPatientByEmail: (email: string) => Promise<User | null>;
  findPatientByPhone: (phone: string) => Promise<User | null>;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
}

const AUTH_KEY = 'santeconnect-auth';

function safeStr(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return val.toString();
  return '';
}

function mapBackendUser(data: Record<string, unknown>): User {
  return {
    id: safeStr(data.id),
    email: safeStr(data.email),
    firstName: safeStr(data.first_name) || safeStr(data.firstName),
    lastName: safeStr(data.last_name) || safeStr(data.lastName),
    phone: safeStr(data.phone) || undefined,
    role: (data.role === 'doctor' || data.role === 'medecin') ? 'medecin' : 'patient' as UserRole,
    dossierNumber: safeStr(data.dossier_number) || undefined,
  };
}

async function saveAuthState(user: User | null, isAuthenticated: boolean): Promise<void> {
  try {
    const data = JSON.stringify({ user, isAuthenticated });
    await AppStorage.setItem(AUTH_KEY, data);
    console.log('[Auth] Auth state saved, authenticated:', isAuthenticated);
  } catch (e) {
    console.error('[Auth] Failed to save auth state:', e);
  }
}

export const useAuthStore = create<AuthStore>()(
  (set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isHydrated: false,
    error: null,

    setHydrated: (hydrated: boolean) => {
      set({ isHydrated: hydrated });
    },

    hydrate: async () => {
      try {
        console.log('[Auth] Starting hydration...');
        const raw = await AppStorage.getItem(AUTH_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            console.log('[Auth] Hydrated auth state, isAuthenticated:', parsed.isAuthenticated);
            set({
              user: parsed.user ?? null,
              isAuthenticated: parsed.isAuthenticated ?? false,
              isHydrated: true,
            });

            if (parsed.isAuthenticated) {
              const tokens = await getStoredTokens();
              if (tokens?.access) {
                try {
                  const res = await authAPI.me();
                  const responseData = res.data.data || res.data;
                  const user = mapBackendUser(responseData);
                  await saveAuthState(user, true);
                  set({ user });
                  console.log('[Auth] Refreshed user from backend');
                } catch (e) {
                  console.warn('[Auth] Could not refresh user from backend, using cached:', e);
                }
              }
            }
            return;
          }
        }
        console.log('[Auth] No stored auth state found');
        set({ isHydrated: true });
      } catch (e) {
        console.error('[Auth] Hydration error:', e);
        set({ isHydrated: true, user: null, isAuthenticated: false });
      }
    },

    fetchMe: async () => {
      try {
        const res = await authAPI.me();
        const responseData = res.data.data || res.data;
        const user = mapBackendUser(responseData);
        await saveAuthState(user, true);
        set({ user, isAuthenticated: true });
        console.log('[Auth] fetchMe success:', user.email);
      } catch (e) {
        console.error('[Auth] fetchMe error:', e);
      }
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        console.log('[Auth] Attempting login for:', email);
        const res = await authAPI.login({ email: email.toLowerCase(), password });

        // Le backend enveloppe la réponse dans {success, message, data}
        // Extraire le vrai data
        const responseData = res.data.data || res.data;
        console.log('[Auth] Login response data:', JSON.stringify(responseData));

        // Stocker les tokens
        if (responseData.tokens) {
          await storeTokens({ access: responseData.tokens.access, refresh: responseData.tokens.refresh });
        } else if (responseData.access && responseData.refresh) {
          await storeTokens({ access: responseData.access, refresh: responseData.refresh });
        }

        let user: User;
        if (responseData.user) {
          user = mapBackendUser(responseData.user);
        } else {
          // Les tokens sont déjà stockés, l'interceptor les attachera automatiquement
          try {
            const meRes = await authAPI.me();
            const meData = meRes.data.data || meRes.data;
            user = mapBackendUser(meData);
          } catch {
            throw new Error('Impossible de récupérer le profil utilisateur');
          }
        }

        console.log('[Auth] Login successful for:', user.email, 'role:', user.role);
        await saveAuthState(user, true);
        set({ user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      } catch (error) {
        const message = extractErrorMessage(error);
        console.error('[Auth] Login error:', message);
        set({ isLoading: false, error: message || 'Email ou mot de passe incorrect' });
        return false;
      }
    },

    signup: async (userData: SignupData) => {
      set({ isLoading: true, error: null });
      try {
        console.log('[Auth] Attempting signup for:', userData.email, 'role:', userData.role);

        const res = await authAPI.register({
          email: userData.email.toLowerCase(),
          password: userData.password,
          password_confirm: userData.password,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone || undefined,
          role: userData.role,
        });

        // Le backend enveloppe la réponse dans {success, message, data}
        const responseData = res.data.data || res.data;

        if (responseData.tokens) {
          await storeTokens({ access: responseData.tokens.access, refresh: responseData.tokens.refresh });
        } else if (responseData.access && responseData.refresh) {
          await storeTokens({ access: responseData.access, refresh: responseData.refresh });
        }


        let user: User;
        if (responseData.user) {
          user = mapBackendUser(responseData.user);
        } else {
          // Fallback : construire depuis les données locales
          user = {
            id: String(responseData.id ?? Date.now()),
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            role: userData.role,
            dossierNumber: responseData.dossier_number ? String(responseData.dossier_number) : undefined,
          };
        }

        console.log('[Auth] Signup successful for:', user.email);
        await saveAuthState(user, true);
        set({ user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      } catch (error) {
        const message = extractErrorMessage(error);
        console.error('[Auth] Signup error:', message);
        set({ isLoading: false, error: message || 'Erreur lors de la création du compte' });
        return false;
      }
    },

    logout: async () => {
      try {
        const tokens = await getStoredTokens();
        if (tokens?.refresh) {
          try {
            await authAPI.logout(tokens.refresh);
            console.log('[Auth] Server logout successful');
          } catch (e: any) {
            if (e?.response?.status !== 400) {
              console.warn('[Auth] Server logout failed:', e);
            }
          }
          
        }
        await clearTokens();
        await AppStorage.removeItem(AUTH_KEY);
        console.log('[Auth] Logged out successfully');
      } catch (e) {
        console.error('[Auth] Failed to clear auth state:', e);
      }
      set({ user: null, isAuthenticated: false, error: null });
    },

    clearError: () => {
      set({ error: null });
    },

    updateProfile: (userData: Partial<User>) => {
      const { user } = get();
      if (user) {
        const updatedUser = { ...user, ...userData };
        set({ user: updatedUser });
        saveAuthState(updatedUser, true).catch((e) => {
          console.error('[Auth] Failed to persist profile update:', e);
        });

        authAPI.updateProfile({
          first_name: updatedUser.firstName,
          last_name: updatedUser.lastName,
          phone: updatedUser.phone,
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.error('[Auth] Failed to sync profile to backend:', errorMsg);
          // Note: Erreur de synchronisation backend — les données locales sont conservées
        });
      }
    },

    findPatientByEmail: async (email: string) => {
      try {
        // Cette fonction cherche un UTILISATEUR patient, pas un dossier patient
        // Note: Il faudrait un endpoint backend type /auth/search-user-by-email/
        // Pour l'instant, on retourne null car l'endpoint n'existe pas
        console.log('[Auth] findPatientByEmail:', email, '- backend endpoint not available');
        return null;

        // TODO: Si le backend expose un endpoint de recherche :
        // const res = await authAPI.searchUserByEmail(email);
        // const userData = res.data.data || res.data;
        // if (userData && userData.role === 'patient') {
        //   return mapBackendUser(userData);
        // }
        // return null;
      } catch (e) {
        console.error('[Auth] findPatientByEmail error:', e);
        return null;
      }
    },

    findPatientByPhone: async (phone: string) => {
      try {
        // Cette fonction cherche un UTILISATEUR patient, pas un dossier patient
        // Note: Il faudrait un endpoint backend type /auth/search-user-by-phone/
        // Pour l'instant, on retourne null car l'endpoint n'existe pas
        console.log('[Auth] findPatientByPhone:', phone, '- backend endpoint not available');
        return null;

        // TODO: Si le backend expose un endpoint de recherche :
        // const res = await authAPI.searchUserByPhone(phone);
        // const userData = res.data.data || res.data;
        // if (userData && userData.role === 'patient') {
        //   return mapBackendUser(userData);
        // }
        // return null;
      } catch (e) {
        console.error('[Auth] findPatientByPhone error:', e);
        return null;
      }
    },
  })
);
