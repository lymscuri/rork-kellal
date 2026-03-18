import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from './authStore';
import { useMedicalStore } from './medicalStore';

/**
 * SyncEngine définitif pour la synchronisation médecin↔patient
 *
 * SYNC MÉDECIN :
 * - Appelle syncPatientsFromBackend() (dossiers généraux)
 * - Appelle syncMaternityPatientsFromBackend() (dossiers maternité)
 *
 * SYNC PATIENT :
 * - Appelle syncMyRecordFromBackend(userId) (dossier général)
 * - Appelle syncMyMaternityFromBackend(userId) (dossier maternité)
 *
 * TRIGGERS DE SYNC :
 * - Au montage : immédiatement
 * - AppState : quand l'app passe de 'background'/'inactive' à 'active'
 * - Interval : toutes les 60 secondes tant que l'app est active
 *
 * NETTOYAGE :
 * - Cleanup AppState listener et interval au démontage
 */
export function useSyncEngine() {
  const { user } = useAuthStore();
  const {
    syncPatientsFromBackend,
    syncMaternityPatientsFromBackend,
    syncMyRecordFromBackend,
    syncMyMaternityFromBackend,
  } = useMedicalStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = async () => {
    if (!user) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      if (user.role === 'medecin') {
        // SYNC MÉDECIN : récupérer tous les patients du médecin
        console.log('[SyncEngine] Running doctor sync...');
        await Promise.all([
          syncPatientsFromBackend(),
          syncMaternityPatientsFromBackend(),
        ]);
        console.log('[SyncEngine] Doctor sync completed');
      } else {
        // SYNC PATIENT : récupérer le dossier du patient connecté
        console.log('[SyncEngine] Running patient sync...');
        await Promise.all([
          syncMyRecordFromBackend(user.id),
          syncMyMaternityFromBackend(user.id),
        ]);
        console.log('[SyncEngine] Patient sync completed');
      }

      setLastSyncedAt(new Date());
    } catch (e: any) {
      const errorMsg = e?.message || 'Sync failed';
      console.error('[SyncEngine] Sync error:', errorMsg);
      setSyncError(errorMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      console.log('[SyncEngine] No user, skipping sync');
      return;
    }

    console.log('[SyncEngine] Initializing for user:', user.email, 'role:', user.role);

    // Sync immédiate au montage
    runSync();

    // AppState listener : sync quand l'app revient au premier plan
    const subscription = AppState.addEventListener('change',
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current !== 'active' &&
          nextState === 'active'
        ) {
          console.log('[SyncEngine] App became active, triggering sync');
          runSync();
        }
        appStateRef.current = nextState;
      }
    );

    // Interval 60s : sync périodique tant que l'app est active
    intervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active') {
        console.log('[SyncEngine] Periodic sync (60s interval)');
        runSync();
      }
    }, 60_000);

    return () => {
      console.log('[SyncEngine] Cleanup');
      subscription.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id, user?.role]);

  return { isSyncing, lastSyncedAt, syncError, runSync };
}
