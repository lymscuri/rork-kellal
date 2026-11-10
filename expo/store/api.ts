import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AppStorage } from './storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://kenndeya-backend-production.up.railway.app/api/v1';

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

    const noRetryRoutes = ['/auth/login/', '/auth/register/', '/auth/token/refresh/'];
    const shouldNotRetry = noRetryRoutes.some(route => originalRequest.url?.includes(route));

    if (error.response?.status === 404) {
      return Promise.reject(error);
    }

    // Ne pas tenter le refresh sur les 404 — ce n'est pas un problème d'auth
    if (error.response?.status === 401 && !originalRequest._retry && !shouldNotRetry) {

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

        // Ne supprimer les tokens que si le refresh token est réellement invalide (401)
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
          console.log('[API] Refresh token invalid (401) - clearing tokens');
          await clearTokens();
        } else {
          console.log('[API] Refresh failed but tokens preserved (status:',
            axios.isAxiosError(refreshError) ? refreshError.response?.status : 'unknown', ')');
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status;
    const data = error.response?.data;
    if (!(status === 400 && error.config?.url?.includes('/auth/logout/'))) {
      console.error(`[API] Error ${status} from ${error.config?.url}:`, JSON.stringify(data));
    }
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
      if (data.error) {
        if (typeof data.error === 'string') return data.error;
        if (data.error.message) return String(data.error.message);
      }
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

  myRecord: () => apiClient.get('/dossiers/my-record/'),

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

  addLabTestDirect: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/lab-tests/`, data),

  addPrescription: (patientId: string, consultationId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/consultations/${consultationId}/prescriptions/`, data),

  listVaccinations: (patientId: string) =>
    apiClient.get(`/dossiers/patients/${patientId}/vaccinations/`),

  addVaccination: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/vaccinations/`, data),

  // Chirurgies
  createSurgery: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/chirurgies/`, data),

  getSurgeries: (patientId: string) =>
    apiClient.get(`/dossiers/patients/${patientId}/chirurgies/`),

  // Hospitalisations
  createHospitalisation: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/dossiers/patients/${patientId}/hospitalisations/`, data),

  getHospitalisations: (patientId: string) =>
    apiClient.get(`/dossiers/patients/${patientId}/hospitalisations/`),
};

export const emergencyAPI = {
  // Alertes d'urgence
  createAlert: (data: Record<string, unknown>) =>
    apiClient.post('/emergency/alerts/', data),

  listAlerts: () =>
    apiClient.get('/emergency/alerts/list/'),

  takeAlert: (alertId: string) =>
    apiClient.patch(`/emergency/alerts/${alertId}/assign/`),

  resolveAlert: (alertId: string) =>
    apiClient.patch(`/emergency/alerts/${alertId}/status/`, { status: 'resolved' }),

  // Secouristes
  listSecourists: () =>
    apiClient.get('/emergency/secourists/'),

  updateSecouristLocation: (data: Record<string, unknown>) =>
    apiClient.patch('/emergency/secourist/profile/detail/', data),

  // Hôpitaux
  listHospitals: () =>
    apiClient.get('/emergency/hospitals/'),

  // Lieux d'urgence autour de moi — PUBLIC (aucun token requis).
  // Le backend fusionne OpenStreetMap (Overpass côté serveur, en cache) et le
  // référentiel Hospital. 400 (coordonnées invalides) reste rejeté normalement.
  places: (lat: number, lon: number, radius: number, lang: string) =>
    apiClient.get('/emergency/places/', {
      params: { lat, lon, radius, lang },
    }),
};

export const maternityAPI = {
  // Gestion des patientes maternité
  createMaternityPatient: (data: Record<string, unknown>) =>
    apiClient.post('/maternity/patients/', data),

  listMaternityPatients: () =>
    apiClient.get('/maternity/patients/'),

  getMaternityPatient: (patientId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/`),

  myRecord: () => apiClient.get('/maternity/my-record/'),

  // Grossesses
  createPregnancy: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/pregnancies/`, data),

  // Suivis hebdomadaires
  createWeeklyCheckup: (patientId: string, pregnancyId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/weekly-checkups/`, data),

  listWeeklyCheckups: (patientId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/weekly-checkups/`),

  // Examens prénataux
  createPrenatalExam: (patientId: string, pregnancyId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/prenatal-exams/`, data),

  listPrenatalExams: (patientId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/prenatal-exams/`),

  // Consultations prénatales
  createPrenatalConsultation: (patientId: string, pregnancyId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/prenatal-consultations/`, data),

  updatePrenatalConsultation: (patientId: string, pregnancyId: string, consultationId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/prenatal-consultations/${consultationId}/`, data),

  // Enfants
  createChild: (patientId: string, pregnancyId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/patients/${patientId}/pregnancies/${pregnancyId}/children/`, data),

  listChildren: (patientId: string) =>
    apiClient.get(`/maternity/patients/${patientId}/children/`),

  // Croissance des enfants
  addChildGrowth: (childId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/children/${childId}/growth/`, data),

  listChildGrowth: (childId: string) =>
    apiClient.get(`/maternity/children/${childId}/growth/`),

  // Vaccins des enfants
  addChildVaccine: (childId: string, data: Record<string, unknown>) =>
    apiClient.post(`/maternity/children/${childId}/vaccines/`, data),
};

export const remindersAPI = {
  // CRUD rappels
  listReminders: (params?: { status?: string; type?: string }) =>
    apiClient.get('/reminders/sms/', { params }),

  createReminder: (data: Record<string, unknown>) =>
    apiClient.post('/reminders/sms/', data),

  getReminder: (id: string) =>
    apiClient.get(`/reminders/sms/${id}/`),

  updateReminder: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/reminders/sms/${id}/`, data),

  cancelReminder: (id: string) =>
    apiClient.delete(`/reminders/sms/${id}/`),

  sendNow: (id: string) =>
    apiClient.post(`/reminders/sms/${id}/send/`),

  // Création rapide avec message automatique
  createVaccinationReminder: (data: Record<string, unknown>) =>
    apiClient.post('/reminders/vaccination/', data),

  createPrenatalReminder: (data: Record<string, unknown>) =>
    apiClient.post('/reminders/prenatal/', data),

  createAppointmentReminder: (data: Record<string, unknown>) =>
    apiClient.post('/reminders/appointment/', data),

  // Stats
  getStats: () =>
    apiClient.get('/reminders/stats/'),
};

// Premiers secours — endpoints PUBLICS (aucun token requis).
// 304 est une réponse valide (cache à jour) : on l'accepte au lieu de la rejeter.
const firstaidValidateStatus = (status: number) =>
  (status >= 200 && status < 300) || status === 304;

export const firstaidAPI = {
  getMeta: (lang: string, etag?: string | null) =>
    apiClient.get('/firstaid/meta/', {
      params: { lang },
      headers: etag ? { 'If-None-Match': etag } : undefined,
      validateStatus: firstaidValidateStatus,
    }),

  listProtocols: (lang: string, etag?: string | null) =>
    apiClient.get('/firstaid/protocols/', {
      params: { lang },
      headers: etag ? { 'If-None-Match': etag } : undefined,
      validateStatus: firstaidValidateStatus,
    }),

  getProtocol: (id: string, lang: string, etag?: string | null) =>
    apiClient.get(`/firstaid/protocols/${id}/`, {
      params: { lang },
      headers: etag ? { 'If-None-Match': etag } : undefined,
      validateStatus: firstaidValidateStatus,
    }),

  // POST publics : le modèle ne fait que RECONNAÎTRE (id de scénario, question de
  // clarification validée, ou intention parmi des options fixes). 503
  // (classifier_unavailable) est accepté pour être traité comme un repli applicatif.
  classify: (text: string, lang: string) =>
    apiClient.post('/firstaid/classify/', { text, lang }, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 503,
    }),

  // Clarification menée par le modèle (garde-fous serveur) : UNE question ou null.
  clarify: (text: string, lang: string, turn: number) =>
    apiClient.post('/firstaid/clarify/', { text, lang, turn }, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 503,
    }),

  // Intention pendant un protocole : answer:/red_flag:/switch:/off_topic/unclear.
  intent: (
    text: string,
    lang: string,
    protocolId: string,
    phase: 'question' | 'block',
    questionOptions: Record<string, string> | null,
  ) =>
    apiClient.post('/firstaid/intent/', {
      text, lang, protocol_id: protocolId, phase, question_options: questionOptions,
    }, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 503,
    }),
};

export const notificationsAPI = {
  // Envoyer une notification push à tous les utilisateurs
  sendToAll: (data: Record<string, unknown>) =>
    apiClient.post('/notifications/send/', data),

  // Envoyer à des rôles spécifiques
  sendToRoles: (data: Record<string, unknown>) =>
    apiClient.post('/notifications/send/', data),
};

export default apiClient;
