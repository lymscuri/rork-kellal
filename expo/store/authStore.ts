import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';


export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (userData: Partial<User>) => void;
  setHydrated: (hydrated: boolean) => void;
  hydrate: () => Promise<void>;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

const USERS_KEY = 'santeconnect-users';
const AUTH_KEY = 'santeconnect-auth';

async function getStoredUsers(): Promise<Array<SignupData & { id: string }>> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[Auth] Failed to read users:', e);
  }
  return [];
}

async function saveUsers(users: Array<SignupData & { id: string }>): Promise<void> {
  try {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('[Auth] Failed to save users:', e);
    throw e;
  }
}

async function saveAuthState(user: User | null, isAuthenticated: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ user, isAuthenticated }));
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
        const raw = await AsyncStorage.getItem(AUTH_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          console.log('[Auth] Hydrated auth state, isAuthenticated:', parsed.isAuthenticated);
          set({
            user: parsed.user ?? null,
            isAuthenticated: parsed.isAuthenticated ?? false,
            isHydrated: true,
          });
        } else {
          console.log('[Auth] No stored auth state found');
          set({ isHydrated: true });
        }
      } catch (e) {
        console.error('[Auth] Hydration error:', e);
        set({ isHydrated: true });
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
          };
          console.log('[Auth] Login successful for:', user.email);
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
        console.log('[Auth] Attempting signup for:', userData.email);
        
        const users = await getStoredUsers();
        console.log('[Auth] Existing users count:', users.length);
        
        if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
          set({ isLoading: false, error: 'Cet email est déjà utilisé' });
          return false;
        }
        
        const newUser = {
          ...userData,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        };
        
        users.push(newUser);
        await saveUsers(users);
        console.log('[Auth] User saved, total users:', users.length);
        
        const user: User = {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phone: newUser.phone,
        };
        
        await saveAuthState(user, true);
        console.log('[Auth] Signup successful for:', user.email);
        set({ user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      } catch (error) {
        console.error('[Auth] Signup error:', error);
        set({ isLoading: false, error: 'Erreur lors de la création du compte. Veuillez réessayer.' });
        return false;
      }
    },

    logout: async () => {
      try {
        await AsyncStorage.removeItem(AUTH_KEY);
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
        void saveAuthState(updatedUser, true);
      }
    },
  })
);
