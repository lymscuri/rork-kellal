import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform, Share } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import { QrCode, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

export default function MyQRCodeScreen() {
  const { user } = useAuthStore();
  const { getQRCodeData, getMyRecord } = useMedicalStore();

  const qrData = useMemo(() => {
    if (!user) {
      return JSON.stringify({ error: 'Non connecté' });
    }
    const data = getQRCodeData(user.id);
    try {
      const parsed = JSON.parse(data);
      parsed.userId = user.id;
      return JSON.stringify(parsed);
    } catch {
      return JSON.stringify({
        userId: user.id,
        dossierNumber: user.dossierNumber || 'N/A',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }
  }, [user, getQRCodeData]);

  const record = useMemo(() => {
    if (!user) return null;
    return getMyRecord(user.id);
  }, [user, getMyRecord]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mon dossier Keneya: ${user?.dossierNumber || 'N/A'}\n\nPrésentez ce numéro à votre médecin pour accéder à votre dossier.`,
      });
    } catch (e) {
      console.log('[QR] Share error:', e);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.qrCard}>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.dossier}>{user?.dossierNumber || 'Pas de numéro de dossier'}</Text>

        <View style={styles.qrContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.qrFallback}>
              <QrCode size={80} color={MedicalColors.medical} />
              <Text style={styles.qrFallbackText}>QR Code disponible sur mobile</Text>
            </View>
          ) : (
            <QRCode value={qrData} size={220} backgroundColor={MedicalColors.white} color={MedicalColors.text} />
          )}
        </View>

        <Text style={styles.infoLabel}>Données incluses dans le QR :</Text>
        <View style={styles.infoList}>
          <InfoBadge label="Identité complète" />
          <InfoBadge label="Groupe sanguin + Rhésus" />
          <InfoBadge label="Allergies" />
          <InfoBadge label="Maladies chroniques" />
          <InfoBadge label="Traitements permanents" />
          <InfoBadge label="Contacts d'urgence" />
          <InfoBadge label="N° de dossier" />
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleShare}
          buttonColor={MedicalColors.medical}
          icon={() => <Share2 size={18} color={MedicalColors.white} />}
          style={styles.actionBtn}
          contentStyle={styles.actionBtnContent}
        >
          Partager
        </Button>
      </View>

      <View style={styles.offlineBadge}>
        <Text style={styles.offlineText}>✅ Disponible hors connexion</Text>
        <Text style={styles.offlineSubtext}>Votre QR code fonctionne même sans internet</Text>
      </View>

      {record && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé médical</Text>
          <SummaryRow label="Groupe sanguin" value={record.criticalInfo?.bloodGroup || 'Non renseigné'} />
          <SummaryRow label="Allergies médicamenteuses" value={(record.criticalInfo?.drugAllergies?.length || 0) > 0 ? record.criticalInfo.drugAllergies.map(a => a.name).join(', ') : 'Aucune'} />
          <SummaryRow label="Maladies chroniques" value={(record.criticalInfo?.chronicDiseases?.length || 0) > 0 ? record.criticalInfo.chronicDiseases.join(', ') : 'Aucune'} />
          <SummaryRow label="Contacts d'urgence" value={(record.identity.emergencyContacts?.length || 0) > 0 ? record.identity.emergencyContacts.map(c => `${c.fullName} (${c.phoneNumber})`).join(', ') : 'Aucun'} />
        </View>
      )}
    </ScrollView>
  );
}

function InfoBadge({ label }: { label: string }) {
  return (
    <View style={styles.infoBadge}>
      <Text style={styles.infoBadgeText}>• {label}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  qrCard: { backgroundColor: MedicalColors.white, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: MedicalColors.border },
  name: { fontSize: 22, fontWeight: '700' as const, color: MedicalColors.text },
  dossier: { fontSize: 14, color: MedicalColors.textSecondary, fontFamily: 'monospace', marginTop: 4, marginBottom: 20 },
  qrContainer: { padding: 20, backgroundColor: MedicalColors.white, borderRadius: 16, borderWidth: 2, borderColor: MedicalColors.border },
  qrFallback: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center' },
  qrFallbackText: { fontSize: 13, color: MedicalColors.textSecondary, marginTop: 12, textAlign: 'center' },
  infoLabel: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, marginTop: 20, alignSelf: 'flex-start' },
  infoList: { alignSelf: 'flex-start', marginTop: 8 },
  infoBadge: { paddingVertical: 2 },
  infoBadgeText: { fontSize: 12, color: MedicalColors.textSecondary },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, borderRadius: 12 },
  actionBtnContent: { paddingVertical: 8 },
  offlineBadge: { backgroundColor: MedicalColors.lifeLight, borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' },
  offlineText: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.life },
  offlineSubtext: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 4 },
  summaryCard: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: MedicalColors.border },
  summaryTitle: { fontSize: 15, fontWeight: '700' as const, color: MedicalColors.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: MedicalColors.background },
  summaryLabel: { fontSize: 13, color: MedicalColors.textSecondary, flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, flex: 1, textAlign: 'right' },
});
