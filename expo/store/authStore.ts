import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';


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
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

const _AUTH_API_URL = process.env.EXPO_PUBLIC_RORK_AUTH_URL;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      error: null,

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[Auth] Attempting login for:', email);
          
          const storedUsers = await AsyncStorage.getItem('santeconnect-users');
          console.log('[Auth] Stored users raw:', storedUsers);
          const users: Array<SignupData & { id: string }> = storedUsers ? JSON.parse(storedUsers) : [];
          console.log('[Auth] Found', users.length, 'users in storage');
          
          const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
          
          if (foundUser) {
            const user: User = {
              id: foundUser.id,
              email: foundUser.email,
              firstName: foundUser.firstName,
              lastName: foundUser.lastName,
              phone: foundUser.phone,
            };
            console.log('[Auth] Login successful for:', user.email);
            set({ user, isAuthenticated: true, isLoading: false, error: null });
            return true;
          } else {
            console.log('[Auth] Login failed - no matching user');
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
          
          let users: Array<SignupData & { id: string }> = [];
          try {
            const storedUsers = await AsyncStorage.getItem('santeconnect-users');
            users = storedUsers ? JSON.parse(storedUsers) : [];
          } catch {
            console.log('[Auth] No existing users, starting fresh');
            users = [];
          }
          
          if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
            set({ isLoading: false, error: 'Cet email est déjà utilisé' });
            return false;
          }
          
          const newUser = {
            ...userData,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          };
          
          users.push(newUser);
          await AsyncStorage.setItem('santeconnect-users', JSON.stringify(users));
          console.log('[Auth] User saved to storage, total users:', users.length);
          
          const user: User = {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: newUser.phone,
          };
          
          console.log('[Auth] Signup successful for:', user.email);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          return true;
        } catch (error) {
          console.error('[Auth] Signup error:', error);
          set({ isLoading: false, error: 'Erreur lors de la création du compte. Veuillez réessayer.' });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => {
        set({ error: null });
      },

      updateProfile: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },
    }),
    {
      name: 'santeconnect-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        console.log('[Auth] Hydration complete, isAuthenticated:', state?.isAuthenticated);
        state?.setHydrated(true);
      },
    }
  )
);
