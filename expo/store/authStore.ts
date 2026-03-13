import { AppStorage } from './storage';
import { create } from 'zustand';

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

const USERS_KEY = 'santeconnect-users';
const AUTH_KEY = 'santeconnect-auth';

function generateDossierNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `SNC-${year}-${seq}`;
}

async function getStoredUsers(): Promise<Array<SignupData & { id: string; dossierNumber?: string }>> {
  try {
    const raw = await AppStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      console.warn('[Auth] Stored users data is not an array, resetting');
      return [];
    }
  } catch (e) {
    console.error('[Auth] Failed to read users:', e);
  }
  return [];
}

async function saveUsers(users: Array<SignupData & { id: string; dossierNumber?: string }>): Promise<void> {
  try {
    const data = JSON.stringify(users);
    await AppStorage.setItem(USERS_KEY, data);
    console.log('[Auth] Users saved successfully, count:', users.length);
  } catch (e) {
    console.error('[Auth] Failed to save users:', e);
    throw e;
  }
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

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        console.log('[Auth] Attempting login for:', email);
        const users = await getStoredUsers();
        console.log('[Auth] Found', users.length, 'registered users');
        
        const foundUser = users.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        
        if (foundUser) {
          const user: User = {
            id: foundUser.id,
            email: foundUser.email,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            phone: foundUser.phone,
            role: foundUser.role ?? 'patient',
            dossierNumber: foundUser.dossierNumber,
          };
          console.log('[Auth] Login successful for:', user.email, 'role:', user.role);
          await saveAuthState(user, true);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          return true;
        } else {
          console.log('[Auth] Login failed - invalid credentials');
          set({ isLoading: false, error: 'Email ou mot de passe incorrect' });
          return false;
        }
      } catch (error) {
        console.error('[Auth] Login error:', error);
        set({ isLoading: false, error: 'Erreur de connexion. Veuillez réessayer.' });
        return false;
      }
    },

    signup: async (userData: SignupData) => {
      set({ isLoading: true, error: null });
      try {
        console.log('[Auth] Attempting signup for:', userData.email, 'role:', userData.role);
        
        let users: Array<SignupData & { id: string; dossierNumber?: string }> = [];
        try {
          users = await getStoredUsers();
        } catch (e) {
          console.warn('[Auth] Could not read existing users, starting fresh:', e);
          users = [];
        }
        console.log('[Auth] Existing users count:', users.length);
        
        const emailExists = users.some(u => u.email.toLowerCase() === userData.email.toLowerCase());
        if (emailExists) {
          console.log('[Auth] Email already exists:', userData.email);
          set({ isLoading: false, error: 'Cet email est déjà utilisé' });
          return false;
        }
        
        const dossierNumber = userData.role === 'patient' ? generateDossierNumber() : undefined;
        
        const userId = Date.now().toString() + Math.random().toString(36).substring(2, 11);
        
        const newUser = {
          ...userData,
          id: userId,
          dossierNumber,
        };
        
        users.push(newUser);
        
        try {
          await saveUsers(users);
        } catch (saveError) {
          console.error('[Auth] Failed to save new user:', saveError);
          set({ isLoading: false, error: 'Erreur lors de la sauvegarde. Veuillez réessayer.' });
          return false;
        }
        
        console.log('[Auth] User saved, total users:', users.length);
        
        const user: User = {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phone: newUser.phone,
          role: newUser.role,
          dossierNumber: newUser.dossierNumber,
        };
        
        await saveAuthState(user, true);
        console.log('[Auth] Signup successful for:', user.email);
        set({ user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      } catch (error) {
        console.error('[Auth] Signup error:', error);
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        set({ isLoading: false, error: `Erreur lors de la création du compte: ${message}` });
        return false;
      }
    },

    logout: async () => {
      try {
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
      }
    },

    findPatientByEmail: async (email: string) => {
      try {
        const users = await getStoredUsers();
        const found = users.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.role === 'patient'
        );
        if (found) {
          return {
            id: found.id,
            email: found.email,
            firstName: found.firstName,
            lastName: found.lastName,
            phone: found.phone,
            role: found.role,
            dossierNumber: found.dossierNumber,
          };
        }
        return null;
      } catch (e) {
        console.error('[Auth] findPatientByEmail error:', e);
        return null;
      }
    },

    findPatientByPhone: async (phone: string) => {
      try {
        const users = await getStoredUsers();
        const found = users.find(
          u => u.phone === phone && u.role === 'patient'
        );
        if (found) {
          return {
            id: found.id,
            email: found.email,
            firstName: found.firstName,
            lastName: found.lastName,
            phone: found.phone,
            role: found.role,
            dossierNumber: found.dossierNumber,
          };
        }
        return null;
      } catch (e) {
        console.error('[Auth] findPatientByPhone error:', e);
        return null;
      }
    },
  })
);
