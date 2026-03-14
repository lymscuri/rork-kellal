import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AppStorage } from './storage';

const API_BASE_URL = 'https://kenndeya-backend-production.up.railway.app/api/v1';

const TOKEN_KEY = 'kendeya-access-token';
const REFRESH_TOKEN_KEY = 'kendeya-refresh-token';

interface TokenPair {
  access: string;
  refresh: string;
}

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function getStoredTokens(): Promise<TokenPair | null> {
  try {
    const access = await AppStorage.getItem(TOKEN_KEY);
    const refresh = await AppStorage.getItem(REFRESH_TOKEN_KEY);
    if (access && refresh) {
      return { access, refresh };
    }
    return null;
  } catch (e) {
    console.error('[API] Failed to get stored tokens:', e);
    return null;
  }
}

export async function storeTokens(tokens: TokenPair): Promise<void> {
  try {
    await AppStorage.setItem(TOKEN_KEY, tokens.access);
    await AppStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    console.log('[API] Tokens stored successfully');
  } catch (e) {
    console.error('[API] Failed to store tokens:', e);
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await AppStorage.removeItem(TOKEN_KEY);
    await AppStorage.removeItem(REFRESH_TOKEN_KEY);
    console.log('[API] Tokens cleared');
  } catch (e) {
    console.error('[API] Failed to clear tokens:', e);
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const tokens = await getStoredTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status} from ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = await getStoredTokens();
        if (!tokens?.refresh) {
          throw new Error('No refresh token available');
        }

        console.log('[API] Attempting token refresh...');
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: tokens.refresh,
        });

        const newAccess = response.data.access;
        await storeTokens({ access: newAccess, refresh: tokens.refresh });

        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[API] Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        await clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`[API] Error ${status} from ${error.config?.url}:`, JSON.stringify(data));
    return Promise.reject(error);
  }
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      if (typeof data === 'string') return data;
      if (data.detail) return data.detail;
      if (data.message) return data.message;
      if (data.error) return data.error;
      if (data.non_field_errors) {
        return Array.isArray(data.non_field_errors)
          ? data.non_field_errors.join(', ')
          : data.non_field_errors;
      }
      const fieldErrors = Object.entries(data)
        .filter(([key]) => key !== 'status')
        .map(([key, val]) => {
          const msg = Array.isArray(val) ? val.join(', ') : String(val);
          return `${key}: ${msg}`;
        })
        .join('\n');
      if (fieldErrors) return fieldErrors;
    }
    if (error.message === 'Network Error') {
      return 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'La requête a expiré. Veuillez réessayer.';
    }
  }
  if (error instanceof Error) return error.message;
  return 'Une erreur inattendue est survenue.';
}

export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: string;
  }) => apiClient.post('/auth/register/', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login/', data),

  logout: (refresh: string) =>
    apiClient.post('/auth/logout/', { refresh }),

  me: () => apiClient.get('/auth/me/'),

  updateProfile: (data: { first_name?: string; last_name?: string; phone?: string }) =>
    apiClient.patch('/auth/profile/', data),

  changePassword: (data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }) => apiClient.post('/auth/change-password/', data),

  refreshToken: (refresh: string) =>
    apiClient.post('/auth/token/refresh/', { refresh }),
};

export const dossierAPI = {
  listPatients: () => apiClient.get('/dossiers/patients/'),

  createPatient: (data: Record<string, unknown>) =>
    apiClient.post('/dossiers/patients/', data),

  getPatient: (patientId: string) =>
    apiClient.get(`/dossiers/patients/${patientId}/`),

  updatePatient: (patientId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/dossiers/patients/${patientId}/`, data),

  deletePatient: (patientId: string) =>
    apiClient.delete(`/dossiers/patients/${patientId}/`),

  getMedicalRecord: (patientId: string) =>
    apiClient.get(`/dossiers/patients/${patientId}/medical-record/`),

  listConsultations: (patientId: string) =>
    apiClient.get(`/dossiers/patients/${patientId}/consultations/`),

  createConsultation: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/consultations/`, data),

  getConsultation: (patientId: string, consultationId: string) =>
    apiClient.get(`/dossiers/patients/${patientId}/consultations/${consultationId}/`),

  updateConsultation: (patientId: string, consultationId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/dossiers/patients/${patientId}/consultations/${consultationId}/`, data),

  addLabTest: (patientId: string, consultationId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/consultations/${consultationId}/lab-tests/`, data),

  updateLabTest: (patientId: string, consultationId: string, labTestId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/dossiers/patients/${patientId}/consultations/${consultationId}/lab-tests/${labTestId}/`, data),

  addPrescription: (patientId: string, consultationId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/consultations/${consultationId}/prescriptions/`, data),

  listVaccinations: (patientId: string) =>
    apiClient.get(`/dossiers/patients/${patientId}/vaccinations/`),

  addVaccination: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/vaccinations/`, data),
};

export const emergencyAPI = {
  createAlert: (data: Record<string, unknown>) =>
    apiClient.post('/emergency/alerts/', data),

  getAlert: (alertId: string) =>
    apiClient.get(`/emergency/alerts/${alertId}/`),

  assignAlert: (alertId: string) =>
    apiClient.patch(`/emergency/alerts/${alertId}/assign/`),

  updateAlertStatus: (alertId: string, data: { status: string }) =>
    apiClient.patch(`/emergency/alerts/${alertId}/status/`, data),

  listAlerts: () => apiClient.get('/emergency/alerts/list/'),

  listPendingAlerts: () => apiClient.get('/emergency/alerts/pending/'),

  listHospitals: () => apiClient.get('/emergency/hospitals/'),

  getHospital: (hospitalId: string) =>
    apiClient.get(`/emergency/hospitals/${hospitalId}/`),

  createSecouristProfile: (data: Record<string, unknown>) =>
    apiClient.post('/emergency/secourist/profile/', data),

  getSecouristProfile: () =>
    apiClient.get('/emergency/secourist/profile/detail/'),

  updateSecouristProfile: (data: Record<string, unknown>) =>
    apiClient.patch('/emergency/secourist/profile/detail/', data),

  listSecourists: () => apiClient.get('/emergency/secourists/'),
};

export const maternityAPI = {
  createMaternityProfile: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/maternity-profile/`, data),

  getMaternityProfile: (patientId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/maternity-profile/detail/`),

  updateMaternityProfile: (patientId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/maternity/patients/${patientId}/maternity-profile/detail/`, data),

  listPregnancies: (patientId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/pregnancies/`),

  createPregnancy: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/pregnancies/`, data),

  getPregnancy: (patientId: string, pregnancyId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/`),

  updatePregnancy: (patientId: string, pregnancyId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/`, data),

  listChildren: (patientId: string, pregnancyId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/children/`),

  addChild: (patientId: string, pregnancyId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/children/`, data),

  listPrenatalConsultations: (patientId: string, pregnancyId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/prenatal-consultations/`),

  createPrenatalConsultation: (patientId: string, pregnancyId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/prenatal-consultations/`, data),

  getPrenatalConsultation: (patientId: string, pregnancyId: string, consultationId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/prenatal-consultations/${consultationId}/`),

  updatePrenatalConsultation: (patientId: string, pregnancyId: string, consultationId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/prenatal-consultations/${consultationId}/`, data),

  addChildGrowth: (childId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/children/${childId}/growth/`, data),

  addChildVaccine: (childId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/children/${childId}/vaccines/`, data),
};

export default apiClient;
