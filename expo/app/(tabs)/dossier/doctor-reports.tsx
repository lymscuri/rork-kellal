import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import { BarChart3, Users, Calendar, AlertTriangle, TrendingUp } from 'lucide-react-native';

export default function DoctorReportsScreen() {
  const { user } = useAuthStore();
  const { getPatientsByDoctor, getDoctorStats } = useMedicalStore();
  const allPatients = useMedicalStore((s) => s.patients);

  const stats = useMemo(() => {
    if (!user) return { totalPatients: 0, monthConsultations: 0, monthPrescriptions: 0, patientsFollowed: 0 };
    return getDoctorStats(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, allPatients, getDoctorStats]);

  const patients = useMemo(() => {
    if (!user) return [];
    return getPatientsByDoctor(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, allPatients, getPatientsByDoctor]);

  const latePatients = useMemo(() => {
    return patients.filter(p => {
      if (p.consultations?.length === 0) return true;
      const lastDate = new Date(p.consultations[0].date);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 90;
    });
  }, [patients]);

  const topDiagnoses = useMemo(() => {
    const diagMap: Record<string, number> = {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    patients.forEach(p => {
      p.consultations?.forEach(c => {
        if (c.date >= monthStart && c.mainDiagnosis) {
          diagMap[c.mainDiagnosis] = (diagMap[c.mainDiagnosis] || 0) + 1;
        }
      });
    });
    return Object.entries(diagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [patients]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <BarChart3 size={24} color={MedicalColors.white} />
        <Text style={styles.headerTitle}>Rapport mensuel</Text>
        <Text style={styles.headerDate}>{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon={<Users size={20} color={MedicalColors.medical} />} value={stats.totalPatients.toString()} label="Patients total" color={MedicalColors.medicalLight} />
        <StatCard icon={<Calendar size={20} color={MedicalColors.life} />} value={stats.monthConsultations.toString()} label="Consultations ce mois" color={MedicalColors.lifeLight} />
        <StatCard icon={<TrendingUp size={20} color={MedicalColors.maternity} />} value={stats.monthPrescriptions.toString()} label="Ordonnances émises" color={MedicalColors.maternityLight} />
        <StatCard icon={<AlertTriangle size={20} color={MedicalColors.warning} />} value={latePatients.length.toString()} label="Patients en retard" color={MedicalColors.warningLight} />
      </View>

      {latePatients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patients en retard de consultation</Text>
          {latePatients.map(p => (
            <View key={p.id} style={styles.lateCard}>
              <View style={styles.lateAvatar}>
                <Text style={styles.lateAvatarText}>{p.identity.firstName.charAt(0)}{p.identity.lastName.charAt(0)}</Text>
              </View>
              <View style={styles.lateInfo}>
                <Text style={styles.lateName}>{p.identity.lastName} {p.identity.firstName}</Text>
                <Text style={styles.lateDetail}>
                  {p.consultations?.length > 0
                    ? `Dernière visite : ${new Date(p.consultations[0].date).toLocaleDateString('fr-FR')}`
                    : 'Aucune consultation'
                  }
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {topDiagnoses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 5 diagnostics ce mois</Text>
          {topDiagnoses.map(([diag, count], i) => (
            <View key={diag} style={styles.diagRow}>
              <View style={styles.diagRank}>
                <Text style={styles.diagRankText}>{i + 1}</Text>
              </View>
              <Text style={styles.diagName}>{diag}</Text>
              <View style={styles.diagCount}>
                <Text style={styles.diagCountText}>{count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <View style={[statStyles.card, { backgroundColor: color }]}>
      {icon}
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 10, width: '48%' as any },
  value: { fontSize: 28, fontWeight: '700' as const, color: MedicalColors.text, marginTop: 8 },
  label: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: { backgroundColor: MedicalColors.medical, borderRadius: 16, padding: 20, marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: MedicalColors.white, marginTop: 8 },
  headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: MedicalColors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.text, marginBottom: 14 },
  lateCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: MedicalColors.background },
  lateAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: MedicalColors.warningLight, justifyContent: 'center', alignItems: 'center' },
  lateAvatarText: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.warning },
  lateInfo: { flex: 1, marginLeft: 12 },
  lateName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  lateDetail: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  diagRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: MedicalColors.background },
  diagRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: MedicalColors.medicalLight, justifyContent: 'center', alignItems: 'center' },
  diagRankText: { fontSize: 13, fontWeight: '700' as const, color: MedicalColors.medical },
  diagName: { flex: 1, fontSize: 14, color: MedicalColors.text, marginLeft: 12 },
  diagCount: { backgroundColor: MedicalColors.background, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  diagCountText: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text },
});
