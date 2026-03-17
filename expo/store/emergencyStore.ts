import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppStorage } from './storage';
import { emergencyAPI, notificationsAPI, extractErrorMessage } from './api';
import { sendLocalNotification } from './notificationStore';
import type { EmergencyAlert, Secourist, AlertUrgencyLevel } from '@/types/medical';

interface EmergencyState {
  alerts: EmergencyAlert[];
  secourists: Secourist[];
  isSyncing: boolean;

  // Actions
  createEmergencyAlert: (data: {
    latitude: number;
    longitude: number;
    description: string;
    urgencyLevel: AlertUrgencyLevel;
    senderName?: string;
    senderPhone?: string;
  }) => string;

  syncAlertsFromBackend: () => Promise<void>;

  takeAlert: (alertId: string, responderName: string) => void;

  resolveAlert: (alertId: string) => void;

  updateSecouristLocation: (latitude: number, longitude: number) => void;

  syncSecouristsFromBackend: () => Promise<void>;
}

export const useEmergencyStore = create<EmergencyState>()(
  persist(
    (set, get) => ({
      alerts: [],
      secourists: [],
      isSyncing: false,

      createEmergencyAlert: (data) => {
        const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const newAlert: EmergencyAlert = {
          id,
          senderId: 'me',
          senderName: data.senderName || 'Vous',
          senderPhone: data.senderPhone,
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description,
          urgencyLevel: data.urgencyLevel,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };

        // Mise à jour optimiste du state local
        set((state) => ({
          alerts: [newAlert, ...state.alerts],
        }));

        // Envoyer une notification locale immédiate
        sendLocalNotification(
          '🚨 Alerte Urgence envoyée',
          data.description || 'Votre SOS a été envoyé aux secouristes à proximité',
          { type: 'emergency', alertId: id }
        ).catch((error) => {
          console.warn('[EmergencyStore] Failed to send local notification:', error);
        });

        // Sync backend en arrière-plan
        emergencyAPI.createAlert({
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description,
          urgency_level: data.urgencyLevel,
          sender_phone: data.senderPhone,
        }).then(() => {
          // Envoyer une notification push à tous les utilisateurs
          notificationsAPI.sendToRoles({
            title: '🚨 SOS — Besoin d\'aide !',
            body: data.description || 'Une personne a besoin d\'aide près de vous',
            roles: ['patient', 'medecin'],
          }).catch((notifErr) => {
            console.warn('[EmergencyStore] Failed to send push notification:', extractErrorMessage(notifErr));
          });
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[EmergencyStore] Backend createAlert failed:', errorMsg);
          // Données locales conservées même en cas d'échec backend
        });

        return id;
      },

      syncAlertsFromBackend: async () => {
        if (get().isSyncing) return;

        set({ isSyncing: true });

        try {
          const res = await emergencyAPI.listAlerts();
          const backendAlerts = res.data.data || res.data;

          if (Array.isArray(backendAlerts) && backendAlerts.length > 0) {
            const mappedAlerts: EmergencyAlert[] = backendAlerts.map((a: any) => ({
              id: String(a.id),
              senderId: String(a.sender_id || ''),
              senderName: a.sender_name || 'Anonyme',
              senderPhone: a.sender_phone,
              latitude: a.latitude,
              longitude: a.longitude,
              description: a.description,
              urgencyLevel: a.urgency_level,
              status: a.status,
              responderId: a.responder_id ? String(a.responder_id) : undefined,
              responderName: a.responder_name,
              createdAt: a.created_at,
              updatedAt: a.updated_at,
            }));

            // Fusion intelligente : garder les alertes locales non sync, ajouter les nouvelles du backend
            set((state) => {
              const existingIds = new Set(state.alerts.map(a => a.id));
              const newAlerts = mappedAlerts.filter(a => !existingIds.has(a.id));
              return { alerts: [...state.alerts, ...newAlerts] };
            });

            console.log(`[EmergencyStore] Synced ${mappedAlerts.length} alerts from backend`);
          }
        } catch (e) {
          const errorMsg = extractErrorMessage(e);
          console.warn('[EmergencyStore] syncAlertsFromBackend failed:', errorMsg);
        } finally {
          set({ isSyncing: false });
        }
      },

      takeAlert: (alertId, responderName) => {
        // Mise à jour optimiste du state local
        set((state) => ({
          alerts: state.alerts.map(a =>
            a.id === alertId
              ? { ...a, status: 'prise_en_charge' as const, responderId: 'me', responderName, updatedAt: new Date().toISOString() }
              : a
          ),
        }));

        // Sync backend en arrière-plan
        emergencyAPI.takeAlert(alertId).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[EmergencyStore] Backend takeAlert failed:', errorMsg);
          // Données locales conservées même en cas d'échec backend
        });
      },

      resolveAlert: (alertId) => {
        // Mise à jour optimiste du state local
        set((state) => ({
          alerts: state.alerts.map(a =>
            a.id === alertId
              ? { ...a, status: 'resolue' as const, updatedAt: new Date().toISOString() }
              : a
          ),
        }));

        // Sync backend en arrière-plan
        emergencyAPI.resolveAlert(alertId).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[EmergencyStore] Backend resolveAlert failed:', errorMsg);
          // Données locales conservées même en cas d'échec backend
        });
      },

      updateSecouristLocation: (latitude, longitude) => {
        // Pas de state local pour la localisation du secouriste actuel
        // On envoie directement au backend
        emergencyAPI.updateSecouristLocation({
          latitude,
          longitude,
        }).catch((e) => {
          const errorMsg = extractErrorMessage(e);
          console.warn('[EmergencyStore] Backend updateSecouristLocation failed:', errorMsg);
        });
      },

      syncSecouristsFromBackend: async () => {
        if (get().isSyncing) return;

        set({ isSyncing: true });

        try {
          const res = await emergencyAPI.listSecourists();
          const backendSecourists = res.data.data || res.data;

          if (Array.isArray(backendSecourists) && backendSecourists.length > 0) {
            const mappedSecourists: Secourist[] = backendSecourists.map((s: any) => ({
              id: String(s.id),
              name: s.name || 'Anonyme',
              phone: s.phone,
              latitude: s.latitude,
              longitude: s.longitude,
              isAvailable: s.is_available ?? true,
              specialty: s.specialty,
              lastActive: s.last_active,
            }));

            set({ secourists: mappedSecourists });
            console.log(`[EmergencyStore] Synced ${mappedSecourists.length} secourists from backend`);
          }
        } catch (e) {
          const errorMsg = extractErrorMessage(e);
          console.warn('[EmergencyStore] syncSecouristsFromBackend failed:', errorMsg);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'kendeya-emergency-storage',
      storage: createJSONStorage(() => AppStorage),
    }
  )
);
