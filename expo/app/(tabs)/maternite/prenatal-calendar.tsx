import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react-native';

export default function PrenatalCalendarScreen() {
  const { maternityPatients, markPrenatalConsultationDone } = useMedicalStore();

  const myData = useMemo(() => maternityPatients[0] || null, [maternityPatients]);
  const consultations = useMemo(() => myData?.prenatalConsultations || [], [myData]);
  const currentWeek = myData?.pregnancy?.currentWeek || 0;

  const handleMarkDone = useCallback((consultationId: string, weekTarget: number) => {
    if (!myData) return;
    Alert.alert('Confirmer', `Marquer la consultation S${weekTarget} comme effectuée ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: () => markPrenatalConsultationDone(myData.id, consultationId, new Date().toISOString()),
      },
    ]);
  }, [myData, markPrenatalConsultationDone]);

  const getStatusIcon = (status: string) => {
    if (status === 'effectuee') return <CheckCircle size={20} color={MedicalColors.life} />;
    if (status === 'en_retard') return <AlertTriangle size={20} color={MedicalColors.urgency} />;
    return <Clock size={20} color={MedicalColors.warning} />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'effectuee') return MedicalColors.lifeLight;
    if (status === 'en_retard') return MedicalColors.urgencyLight;
    return MedicalColors.warningLight;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Calendar size={24} color={MedicalColors.maternity} />
        <Text style={styles.headerTitle}>Consultations prénatales OMS</Text>
        <Text style={styles.headerSubtitle}>8 consultations recommandées pendant la grossesse</Text>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          {consultations.filter(c => c.status === 'effectuee').length} / {consultations.length} effectuées
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${consultations.length > 0 ? (consultations.filter(c => c.status === 'effectuee').length / consultations.length) * 100 : 0}%` }]} />
        </View>
      </View>

      {consultations.map((c) => (
        <View key={c.id} style={[styles.card, { borderLeftColor: c.status === 'effectuee' ? MedicalColors.life : c.status === 'en_retard' ? MedicalColors.urgency : MedicalColors.warning }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(c.status) }]}>
              {getStatusIcon(c.status)}
              <Text style={styles.statusText}>
                {c.status === 'effectuee' ? 'Effectuée' : c.status === 'en_retard' ? 'En retard' : 'À venir'}
              </Text>
            </View>
            <Text style={styles.weekBadge}>S{c.weekTarget}</Text>
          </View>

          <Text style={styles.cardDescription}>{c.description}</Text>

          {c.actualDate && (
            <Text style={styles.cardDate}>Réalisée le {new Date(c.actualDate).toLocaleDateString('fr-FR')}</Text>
          )}
          {c.notes && <Text style={styles.cardNotes}>{c.notes}</Text>}

          {c.status !== 'effectuee' && currentWeek >= c.weekTarget - 2 && (
            <Button
              mode="contained"
              compact
              onPress={() => handleMarkDone(c.id, c.weekTarget)}
              buttonColor={MedicalColors.maternity}
              style={styles.markBtn}
            >
              Marquer effectuée
            </Button>
          )}
        </View>
      ))}

      <View style={styles.reminderInfo}>
        <Text style={styles.reminderTitle}>Rappels automatiques</Text>
        <Text style={styles.reminderText}>• Notification 3 jours avant chaque consultation</Text>
        <Text style={styles.reminderText}>• Notification le jour J</Text>
        <Text style={styles.reminderText}>• SMS en langue locale si numéro renseigné</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: MedicalColors.text, marginTop: 8 },
  headerSubtitle: { fontSize: 13, color: MedicalColors.textSecondary, marginTop: 4 },
  progressRow: { marginBottom: 16 },
  progressLabel: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, marginBottom: 6 },
  progressBar: { height: 8, backgroundColor: MedicalColors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: MedicalColors.maternity, borderRadius: 4 },
  card: {
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' as const, color: MedicalColors.text },
  weekBadge: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.maternity },
  cardDescription: { fontSize: 14, color: MedicalColors.text, lineHeight: 20 },
  cardDate: { fontSize: 12, color: MedicalColors.life, marginTop: 6, fontWeight: '600' as const },
  cardNotes: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  markBtn: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 8 },
  reminderInfo: { backgroundColor: MedicalColors.maternityLight, borderRadius: 14, padding: 16, marginTop: 8 },
  reminderTitle: { fontSize: 14, fontWeight: '700' as const, color: MedicalColors.maternity, marginBottom: 8 },
  reminderText: { fontSize: 12, color: MedicalColors.text, lineHeight: 20 },
});
