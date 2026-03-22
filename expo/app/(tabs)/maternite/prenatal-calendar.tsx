import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useBackendStore } from '@/store/backendStore';
import { useAuthStore } from '@/store/authStore';
import { Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react-native';

const OMS_CONSULTATIONS = [
  { id: '1', weekTarget: 8,  description: 'Première consultation prénatale', details: 'Bilan sanguin complet, groupe sanguin, VDRL, VIH, glycémie, urine' },
  { id: '2', weekTarget: 12, description: 'Échographie du 1er trimestre', details: 'Clarté nucale, dépistage T21, morphologie précoce' },
  { id: '3', weekTarget: 16, description: 'Consultation de suivi', details: 'TA, poids, hauteur utérine, mouvements fœtaux' },
  { id: '4', weekTarget: 20, description: 'Échographie morphologique', details: 'Morphologie complète du fœtus, placenta, liquide amniotique' },
  { id: '5', weekTarget: 24, description: 'Dépistage diabète gestationnel', details: 'Test HGPO, numération formule sanguine' },
  { id: '6', weekTarget: 28, description: 'Consultation 3ème trimestre', details: 'TA, poids, hauteur utérine, position fœtale' },
  { id: '7', weekTarget: 32, description: 'Échographie 3ème trimestre', details: 'Croissance fœtale, position, placenta, liquide amniotique' },
  { id: '8', weekTarget: 36, description: 'Préparation accouchement', details: 'Bilan pré-accouchement, présentation fœtale, plan de naissance' },
];

type ConsultationStatus = 'effectuee' | 'en_retard' | 'a_venir';

export default function PrenatalCalendarScreen() {
  const { user } = useAuthStore();
  const myMaternity = useBackendStore(s => s.myMaternity);

  const pregnancy = myMaternity?.pregnancy;
  const currentWeek = pregnancy?.current_week || 0;
  const dueDate = pregnancy?.due_date;

  // Calculer la date estimée de chaque consultation depuis DPA
  const getEstimatedDate = (weekTarget: number): string => {
    if (!dueDate) return 'Date à calculer';
    const due = new Date(dueDate);
    // DPA = 40 semaines depuis DLM
    // Date consultation = DPA - (40 - weekTarget) semaines
    const consultDate = new Date(due);
    consultDate.setDate(consultDate.getDate() - (40 - weekTarget) * 7);
    return consultDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Statut de chaque consultation
  const getStatus = (weekTarget: number): ConsultationStatus => {
    if (currentWeek > weekTarget + 2) return 'en_retard';
    if (currentWeek >= weekTarget) return 'effectuee';
    return 'a_venir';
  };

  const consultationsWithStatus = useMemo(() => {
    return OMS_CONSULTATIONS.map(c => ({
      ...c,
      status: getStatus(c.weekTarget),
      estimatedDate: getEstimatedDate(c.weekTarget),
    }));
  }, [currentWeek, dueDate]);

  const stats = useMemo(() => {
    const effectuees = consultationsWithStatus.filter(c => c.status === 'effectuee').length;
    const prochaine = consultationsWithStatus.find(c => c.status !== 'effectuee');
    return { effectuees, prochaine };
  }, [consultationsWithStatus]);

  const getStatusIcon = (status: ConsultationStatus) => {
    if (status === 'effectuee') return <CheckCircle size={20} color={MedicalColors.life} />;
    if (status === 'en_retard') return <AlertTriangle size={20} color={MedicalColors.urgency} />;
    return <Clock size={20} color={MedicalColors.warning} />;
  };

  const getStatusColor = (status: ConsultationStatus) => {
    if (status === 'effectuee') return MedicalColors.lifeLight;
    if (status === 'en_retard') return MedicalColors.urgencyLight;
    return MedicalColors.warningLight;
  };

  const getStatusLabel = (status: ConsultationStatus) => {
    if (status === 'effectuee') return 'Effectuée';
    if (status === 'en_retard') return 'En retard';
    return 'À venir';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Calendar size={24} color={MedicalColors.maternity} />
        <Text style={styles.headerTitle}>Consultations prénatales OMS</Text>
        <Text style={styles.headerSubtitle}>8 consultations recommandées pendant la grossesse</Text>
      </View>

      {!pregnancy && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucune grossesse en cours</Text>
        </View>
      )}

      {pregnancy && (
        <>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.effectuees}/8</Text>
              <Text style={styles.statLabel}>Consultations effectuées</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>S{currentWeek}</Text>
              <Text style={styles.statLabel}>Semaine actuelle</Text>
            </View>
          </View>

          {stats.prochaine && (
            <View style={styles.nextConsultCard}>
              <Text style={styles.nextConsultLabel}>Prochaine consultation</Text>
              <Text style={styles.nextConsultTitle}>S{stats.prochaine.weekTarget} — {stats.prochaine.description}</Text>
              <Text style={styles.nextConsultDate}>{stats.prochaine.estimatedDate}</Text>
            </View>
          )}

          {consultationsWithStatus.map((c) => (
            <View
              key={c.id}
              style={[
                styles.card,
                { borderLeftColor: c.status === 'effectuee' ? MedicalColors.life : c.status === 'en_retard' ? MedicalColors.urgency : MedicalColors.warning }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(c.status) }]}>
                  {getStatusIcon(c.status)}
                  <Text style={styles.statusText}>{getStatusLabel(c.status)}</Text>
                </View>
                <Text style={styles.weekBadge}>S{c.weekTarget}</Text>
              </View>

              <Text style={styles.cardDescription}>{c.description}</Text>
              <Text style={styles.cardEstimatedDate}>Date estimée : {c.estimatedDate}</Text>

              <View style={styles.cardDetails}>
                <Text style={styles.cardDetailsTitle}>Bilan recommandé :</Text>
                <Text style={styles.cardDetailsText}>{c.details}</Text>
              </View>
            </View>
          ))}

          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>ℹ️ Calendrier indicatif</Text>
            <Text style={styles.reminderText}>Ce calendrier est basé sur les recommandations de l'OMS. Les dates sont estimées à partir de votre date prévue d'accouchement.</Text>
            <Text style={styles.reminderText}>Votre médecin planifiera les dates exactes de vos consultations.</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: MedicalColors.text, marginTop: 8 },
  headerSubtitle: { fontSize: 13, color: MedicalColors.textSecondary, marginTop: 4 },
  emptyCard: {
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: MedicalColors.textSecondary },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700' as const, color: MedicalColors.maternity },
  statLabel: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: MedicalColors.border, marginHorizontal: 16 },
  nextConsultCard: {
    backgroundColor: MedicalColors.maternity,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  nextConsultLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  nextConsultTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.white, marginTop: 4 },
  nextConsultDate: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
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
  cardDescription: { fontSize: 15, fontWeight: '600' as const, color: MedicalColors.text, lineHeight: 20, marginBottom: 6 },
  cardEstimatedDate: { fontSize: 12, color: MedicalColors.maternity, marginBottom: 10 },
  cardDetails: {
    backgroundColor: MedicalColors.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  cardDetailsTitle: { fontSize: 11, fontWeight: '700' as const, color: MedicalColors.textSecondary, marginBottom: 4 },
  cardDetailsText: { fontSize: 12, color: MedicalColors.text, lineHeight: 18 },
  reminderInfo: { backgroundColor: MedicalColors.maternityLight, borderRadius: 14, padding: 16, marginTop: 8 },
  reminderTitle: { fontSize: 14, fontWeight: '700' as const, color: MedicalColors.maternity, marginBottom: 8 },
  reminderText: { fontSize: 12, color: MedicalColors.text, lineHeight: 20, marginBottom: 4 },
});
