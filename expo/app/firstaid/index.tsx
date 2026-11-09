import { useRouter } from 'expo-router';
import { Phone, ChevronRight, WifiOff } from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MedicalColors } from '@/constants/colors';
import { UI_LANG } from '@/constants/i18n';
import { useFirstAidStore } from '@/store/firstaidStore';
import { anyUnvalidatedFromCache } from '@/store/firstaid/logic';
import type { FirstAidMeta, ProtocolSummary } from '@/types/firstaid';

const LANG = UI_LANG;

export default function FirstAidListScreen() {
  const router = useRouter();
  const {
    getCachedMeta,
    getCachedList,
    fetchMeta,
    fetchProtocols,
    isOffline,
    cache,
  } = useFirstAidStore();

  // Cache servi immédiatement.
  const [meta, setMeta] = useState<FirstAidMeta | null>(() => getCachedMeta(LANG));
  const [protocols, setProtocols] = useState<ProtocolSummary[] | null>(() => getCachedList(LANG));
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const [m, list] = await Promise.all([fetchMeta(LANG), fetchProtocols(LANG)]);
    if (m) setMeta(m);
    if (list) setProtocols(list);
  }, [fetchMeta, fetchProtocols]);

  // Rafraîchissement en arrière-plan au montage.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const emergencyNumber = meta?.emergency_number ?? '';
  const call = useCallback(() => {
    if (emergencyNumber) void Linking.openURL(`tel:${emergencyNumber}`);
  }, [emergencyNumber]);

  const showTestBanner =
    !!protocols && anyUnvalidatedFromCache(protocols, cache.protocols, LANG);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Bouton d'appel d'urgence en haut, numéro en grand */}
      {emergencyNumber ? (
        <TouchableOpacity style={styles.callButton} onPress={call} activeOpacity={0.85}>
          <Phone color={MedicalColors.white} size={28} />
          <View style={styles.callTextWrap}>
            <Text style={styles.callLabel}>Appeler les secours</Text>
            <Text style={styles.callNumber}>{emergencyNumber}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {isOffline ? (
        <View style={styles.offlineRow}>
          <WifiOff color={MedicalColors.textSecondary} size={14} />
          <Text style={styles.offlineText}>hors ligne</Text>
        </View>
      ) : null}

      {showTestBanner ? (
        <View style={styles.testBanner}>
          <Text style={styles.testBannerText}>
            Données de test, non validées médicalement
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {(protocols ?? []).map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push(`/firstaid/${p.id}`)}
          >
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={3}>
                {p.description}
              </Text>
            </View>
            <ChevronRight color={MedicalColors.textSecondary} size={22} />
          </TouchableOpacity>
        ))}

        {protocols && protocols.length === 0 ? (
          <Text style={styles.empty}>Aucun protocole disponible.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MedicalColors.background },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MedicalColors.urgency,
    margin: 16,
    marginBottom: 8,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 16,
  },
  callTextWrap: { flex: 1 },
  callLabel: { color: MedicalColors.white, fontSize: 15, fontWeight: '600' },
  callNumber: { color: MedicalColors.white, fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  offlineText: { color: MedicalColors.textSecondary, fontSize: 12 },
  testBanner: {
    backgroundColor: MedicalColors.warningLight,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MedicalColors.warning,
  },
  testBannerText: { color: MedicalColors.dark, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  list: { padding: 16, paddingTop: 8, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MedicalColors.card,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: MedicalColors.text },
  cardDesc: { fontSize: 14, color: MedicalColors.textSecondary, lineHeight: 20 },
  empty: { textAlign: 'center', color: MedicalColors.textSecondary, marginTop: 40 },
});
