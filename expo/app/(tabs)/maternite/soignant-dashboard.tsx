import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { useAuthStore } from '@/store/authStore';
import { BarChart3, Users, Calendar, Syringe, AlertTriangle } from 'lucide-react-native';

export default function SoignantDashboardScreen() {
  const { user } = useAuthStore();
  const { maternityPatients } = useMedicalStore();

  const doctorPatients = useMemo(() => {
    if (!user) return maternityPatients;
    return maternityPatients.filter(p => !p.soignantId || p.soignantId === user.id);
  }, [maternityPatients, user]);

  const stats = useMemo(() => {
    const total = doctorPatients.length;
    const pregnancyActive = doctorPatients.filter(p => p.pregnancy.isActive).length;
    const alerts = doctorPatients.filter(p => p.alertLevel === 'rouge').length;

    let consultsDone = 0;
    let consultsTotal = 0;
    let vaccinesDone = 0;

    doctorPatients.forEach(p => {
      p.prenatalConsultations.forEach(c => {
        consultsTotal++;
        if (c.status === 'effectuee') consultsDone++;
      });
      p.childVaccines.forEach(v => {
        if (v.status === 'fait') vaccinesDone++;
      });
    });

    return { total, pregnancyActive, alerts, consultsDone, consultsTotal, vaccinesDone };
  }, [doctorPatients]);

  const alertPatients = useMemo(() => {
    return doctorPatients.filter(p => p.alertLevel === 'rouge' || p.alertLevel === 'jaune');
  }, [doctorPatients]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <BarChart3 size={24} color={MedicalColors.white} />
        <Text style={styles.headerTitle}>Tableau de bord maternité</Text>
        <Text style={styles.headerDate}>{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: MedicalColors.maternityLight }]}>
          <Users size={20} color={MedicalColors.maternity} />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Femmes suivies</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: MedicalColors.lifeLight }]}>
          <Calendar size={20} color={MedicalColors.life} />
          <Text style={styles.statValue}>{stats.consultsDone}/{stats.consultsTotal}</Text>
          <Text style={styles.statLabel}>Consultations</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Syringe size={20} color={MedicalColors.medical} />
          <Text style={styles.statValue}>{stats.vaccinesDone}</Text>
          <Text style={styles.statLabel}>Vaccins ce mois</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: MedicalColors.urgencyLight }]}>
          <AlertTriangle size={20} color={MedicalColors.urgency} />
          <Text style={styles.statValue}>{stats.alerts}</Text>
          <Text style={styles.statLabel}>Alertes actives</Text>
        </View>
      </View>

      {stats.consultsTotal > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultations effectuées vs prévues</Text>
          <View style={styles.barContainer}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${(stats.consultsDone / stats.consultsTotal) * 100}%` }]} />
            </View>
            <Text style={styles.barLabel}>{((stats.consultsDone / stats.consultsTotal) * 100).toFixed(0)}%</Text>
          </View>
        </View>
      )}

      {alertPatients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertes actives</Text>
          {alertPatients.map(p => (
            <View key={p.id} style={styles.alertCard}>
              <View style={[styles.alertDot, { backgroundColor: p.alertLevel === 'rouge' ? MedicalColors.urgency : MedicalColors.warning }]} />
              <View style={styles.alertInfo}>
                <Text style={styles.alertName}>{p.pregnancy.firstName}</Text>
                <Text style={styles.alertDetail}>
                  Semaine {p.pregnancy.currentWeek} — {p.alertLevel === 'rouge' ? 'Alerte grave' : 'Consultation en retard'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {doctorPatients.length === 0 && (
        <View style={styles.emptySection}>
          <Users size={40} color={MedicalColors.border} />
          <Text style={styles.emptyText}>Aucune patiente suivie</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: { backgroundColor: MedicalColors.maternity, borderRadius: 16, padding: 20, marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: MedicalColors.white, marginTop: 8 },
  headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', borderRadius: 14, padding: 16, marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: '700' as const, color: MedicalColors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: MedicalColors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.text, marginBottom: 14 },
  barContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barBg: { flex: 1, height: 12, backgroundColor: MedicalColors.background, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12, backgroundColor: MedicalColors.maternity, borderRadius: 6 },
  barLabel: { fontSize: 14, fontWeight: '700' as const, color: MedicalColors.maternity },
  alertCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: MedicalColors.background },
  alertDot: { width: 10, height: 10, borderRadius: 5 },
  alertInfo: { flex: 1, marginLeft: 12 },
  alertName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  alertDetail: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  emptySection: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: MedicalColors.textSecondary, marginTop: 12 },
});
