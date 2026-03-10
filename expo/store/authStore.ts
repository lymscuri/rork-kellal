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
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (userData: Partial<User>) => void;
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
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Simulation d'API - en production, remplacer par l'appel API réel
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Vérifier les credentials stockés localement
          const storedUsers = await AsyncStorage.getItem('santeconnect-users');
          const users: Array<SignupData & { id: string }> = storedUsers ? JSON.parse(storedUsers) : [];
          
          const foundUser = users.find(u => u.email === email && u.password === password);
          
          if (foundUser) {
            const user: User = {
              id: foundUser.id,
              email: foundUser.email,
              firstName: foundUser.firstName,
              lastName: foundUser.lastName,
              phone: foundUser.phone,
            };
            set({ user, isAuthenticated: true, isLoading: false, error: null });
            return true;
          } else {
            set({ isLoading: false, error: 'Email ou mot de passe incorrect' });
            return false;
          }
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false, error: 'Erreur de connexion. Veuillez réessayer.' });
          return false;
        }
      },

      signup: async (userData: SignupData) => {
        set({ isLoading: true, error: null });
        try {
          // Simulation d'API - en production, remplacer par l'appel API réel
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Vérifier si l'email existe déjà
          const storedUsers = await AsyncStorage.getItem('santeconnect-users');
          const users: Array<SignupData & { id: string }> = storedUsers ? JSON.parse(storedUsers) : [];
          
          if (users.some(u => u.email === userData.email)) {
            set({ isLoading: false, error: 'Cet email est déjà utilisé' });
            return false;
          }
          
          // Créer le nouvel utilisateur
          const newUser = {
            ...userData,
            id: Date.now().toString(),
          };
          
          users.push(newUser);
          await AsyncStorage.setItem('santeconnect-users', JSON.stringify(users));
          
          const user: User = {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: newUser.phone,
          };
          
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          return true;
        } catch (error) {
          console.error('Signup error:', error);
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
    }
  )
);
