import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api';

type NotificationState = {
  expoPushToken: string | null;
  notificationPermission: Notifications.NotificationPermissionsStatus | null;
  isRegistered: boolean;

  // Actions
  registerForPushNotifications: (userId?: string, userRole?: string) => Promise<string | null>;
  sendTokenToBackend: (token: string, role?: string) => Promise<void>;
  setupNotificationHandlers: () => void;
  checkPermissionStatus: () => Promise<Notifications.NotificationPermissionsStatus>;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  expoPushToken: null,
  notificationPermission: null,
  isRegistered: false,

  /**
   * Enregistre l'appareil pour recevoir des notifications push
   * Demande les permissions et récupère le token Expo Push
   */
  registerForPushNotifications: async (userId?: string, userRole?: string) => {
    try {
      // Vérifier si on est dans Expo Go
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo) {
        console.log('[Notifications] Expo Go détecté — notifications push désactivées. Fonctionne dans APK.');
        return null;
      }

      // Vérifier que c'est un vrai appareil
      if (!Device.isDevice) {
        console.warn('[Notifications] Les notifications push ne fonctionnent que sur un appareil physique');
        return null;
      }

      // Demander la permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission refusée pour les notifications');
        set({ notificationPermission: { status: finalStatus } as any });
        return null;
      }

      console.log('[Notifications] Permission accordée');
      set({ notificationPermission: { status: finalStatus } as any });

      // Récupérer le token Expo Push
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '3f744e39-da6c-4aca-b401-9cf1926cdde6', // À remplacer par votre project ID Expo
      });

      const token = tokenData.data;
      console.log('[Notifications] Token Expo Push obtenu:', token);

      set({ expoPushToken: token });

      // Envoyer le token au backend
      await get().sendTokenToBackend(token, userRole);

      set({ isRegistered: true });

      return token;
    } catch (error) {
      console.error('[Notifications] Erreur lors de l\'enregistrement:', error);
      return null;
    }
  },

  /**
   * Envoie le token au backend pour l'enregistrer
   */
  sendTokenToBackend: async (token: string, role?: string) => {
    try {
      console.log('[Notifications] Envoi du token au backend:', { token, role });

      const response = await apiClient.post('/api/v1/notifications/register/', {
        token,
        role: role || 'patient',
        platform: Platform.OS,
        device_type: Device.deviceName || 'unknown',
      });

      console.log('[Notifications] Token enregistré avec succès sur le backend:', response.data);
    } catch (error: any) {
      // Ne pas bloquer l'app si l'envoi échoue
      console.warn('[Notifications] Erreur lors de l\'envoi du token au backend:', error.response?.data || error.message);

      // L'app peut continuer même si l'envoi échoue
      // Les notifications locales fonctionneront toujours
    }
  },

  /**
   * Configure les handlers pour les notifications
   */
  setupNotificationHandlers: () => {
    console.log('[Notifications] Configuration des handlers');

    // Handler pour les notifications reçues quand l'app est au premier plan
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('[Notifications] Notification reçue:', notification);

        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    // Configuration Android (si besoin de canaux de notification)
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      Notifications.setNotificationChannelAsync('emergency', {
        name: 'Urgences',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#DC3545',
        sound: 'default',
      });
    }

    console.log('[Notifications] Handlers configurés avec succès');
  },

  /**
   * Vérifie le statut actuel des permissions
   */
  checkPermissionStatus: async () => {
    const { status } = await Notifications.getPermissionsAsync();
    const permissionStatus = { status } as Notifications.NotificationPermissionsStatus;
    set({ notificationPermission: permissionStatus });
    return permissionStatus;
  },
}));

/**
 * Fonction utilitaire pour envoyer une notification locale immédiate
 */
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // null = immédiat
    });
    console.log('[Notifications] Notification locale envoyée:', { title, body });
  } catch (error) {
    console.error('[Notifications] Erreur lors de l\'envoi de la notification locale:', error);
  }
};

/**
 * Fonction utilitaire pour planifier une notification
 */
export const scheduleNotification = async (
  title: string,
  body: string,
  triggerDate: Date,
  data?: Record<string, any>
) => {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: {
        date: triggerDate,
      },
    });
    console.log('[Notifications] Notification planifiée:', { identifier, title, triggerDate });
    return identifier;
  } catch (error) {
    console.error('[Notifications] Erreur lors de la planification de la notification:', error);
    return null;
  }
};

/**
 * Fonction utilitaire pour annuler une notification planifiée
 */
export const cancelNotification = async (notificationId: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[Notifications] Notification annulée:', notificationId);
  } catch (error) {
    console.error('[Notifications] Erreur lors de l\'annulation de la notification:', error);
  }
};

/**
 * Fonction utilitaire pour annuler toutes les notifications planifiées
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] Toutes les notifications annulées');
  } catch (error) {
    console.error('[Notifications] Erreur lors de l\'annulation de toutes les notifications:', error);
  }
};
