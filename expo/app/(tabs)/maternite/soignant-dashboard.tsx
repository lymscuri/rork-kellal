import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import {
  BarChart3, Users, Calendar, Syringe, AlertTriangle,
  CheckCircle, Clock, ChevronRight, Heart
} from 'lucide-react-native';
import type { MaternityPatient } from '@/types/medical';

function getPatientConsultProgress(p: MaternityPatient) {
  const total = p.prenatalConsultations.length;
  const done = p.prenatalConsultations.filter(c => c.status === 'effectuee').length;
  const overdue = p.prenatalConsultations.filter(
    c => c.status !== 'effectuee' && c.weekTarget <= p.pregnancy.currentWeek
  ).length;
  const upcoming = p.prenatalConsultations.filter(
    c => c.status !== 'effectuee' && c.weekTarget > p.pregnancy.currentWeek
  ).length;
  const isUpToDate = overdue === 0;
  return { total, done, overdue, upcoming, isUpToDate };
}

type DashTab = 'resume' | 'patientes';

export default function SoignantDashboardScreen() {
  const { user } = useAuthStore();
  const { maternityPatients } = useMedicalStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashTab>('resume');

  const doctorPatients = useMemo(() => {
    if (!user) return maternityPatients;
    return maternityPatients.filter(p => !p.soignantId || p.soignantId === user.id);
  }, [maternityPatients, user]);

  const stats = useMemo(() => {
    const total = doctorPatients.length;
    const pregnancyActive = doctorPatients.filter(p => p.pregnancy.isActive).length;
    // Toute alerte non-verte est signalée dans le badge principal.
    const alerts = doctorPatients.filter(
      p => p.alertLevel === 'rouge' || p.alertLevel === 'orange' || p.alertLevel === 'jaune'
    ).length;

    let consultsDone = 0;
    let consultsTotal = 0;
    let consultsOverdue = 0;
    let vaccinesDone = 0;
    let patientsUpToDate = 0;
    let patientsOverdue = 0;

    doctorPatients.forEach(p => {
      const progress = getPatientConsultProgress(p);
      consultsDone += progress.done;
      consultsTotal += progress.total;
      consultsOverdue += progress.overdue;
      if (progress.isUpToDate) patientsUpToDate++;
      else patientsOverdue++;

      p.childVaccines.forEach(v => {
        if (v.status === 'fait') vaccinesDone++;
      });
    });

    return { total, pregnancyActive, alerts, consultsDone, consultsTotal, consultsOverdue, vaccinesDone, patientsUpToDate, patientsOverdue };
  }, [doctorPatients]);

  const sortedPatients = useMemo(() => {
    const rank: Record<string, number> = { rouge: 0, orange: 1, jaune: 2, vert: 3 };
    return [...doctorPatients].sort((a, b) => {
      const ra = rank[a.alertLevel] ?? 3;
      const rb = rank[b.alertLevel] ?? 3;
      if (ra !== rb) return ra - rb;
      const pa = getPatientConsultProgress(a);
      const pb = getPatientConsultProgress(b);
      return pb.overdue - pa.overdue;
    });
  }, [doctorPatients]);

  const consultPct = stats.consultsTotal > 0 ? (stats.consultsDone / stats.consultsTotal) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <BarChart3 size={24} color={MedicalColors.white} />
        <Text style={styles.headerTitle}>Tableau de bord maternité</Text>
        <Text style={styles.headerDate}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'resume' && styles.tabActive]}
          onPress={() => setActiveTab('resume')}
        >
          <BarChart3 size={16} color={activeTab === 'resume' ? MedicalColors.white : MedicalColors.maternity} />
          <Text style={[styles.tabText, activeTab === 'resume' && styles.tabTextActive]}>Résumé</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'patientes' && styles.tabActive]}
          onPress={() => setActiveTab('patientes')}
        >
          <Users size={16} color={activeTab === 'patientes' ? MedicalColors.white : MedicalColors.maternity} />
          <Text style={[styles.tabText, activeTab === 'patientes' && styles.tabTextActive]}>Par patiente</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'resume' ? (
        <>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: MedicalColors.maternityLight }]}>
              <Users size={20} color={MedicalColors.maternity} />
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Femmes suivies</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: MedicalColors.lifeLight }]}>
              <CheckCircle size={20} color={MedicalColors.life} />
              <Text style={styles.statValue}>{stats.patientsUpToDate}</Text>
              <Text style={styles.statLabel}>À jour</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Clock size={20} color={MedicalColors.warning} />
              <Text style={styles.statValue}>{stats.patientsOverdue}</Text>
              <Text style={styles.statLabel}>En retard</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: MedicalColors.urgencyLight }]}>
              <AlertTriangle size={20} color={MedicalColors.urgency} />
              <Text style={styles.statValue}>{stats.alerts}</Text>
              <Text style={styles.statLabel}>Alertes</Text>
            </View>
          </View>

          {stats.consultsTotal > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consultations globales</Text>
              <View style={styles.consultSummaryRow}>
                <View style={styles.consultSummaryItem}>
                  <Text style={[styles.consultSummaryValue, { color: MedicalColors.life }]}>{stats.consultsDone}</Text>
                  <Text style={styles.consultSummaryLabel}>Effectuées</Text>
                </View>
                <View style={styles.consultSummaryDivider} />
                <View style={styles.consultSummaryItem}>
                  <Text style={[styles.consultSummaryValue, { color: MedicalColors.urgency }]}>{stats.consultsOverdue}</Text>
                  <Text style={styles.consultSummaryLabel}>En retard</Text>
                </View>
                <View style={styles.consultSummaryDivider} />
                <View style={styles.consultSummaryItem}>
                  <Text style={[styles.consultSummaryValue, { color: MedicalColors.maternity }]}>{stats.consultsTotal}</Text>
                  <Text style={styles.consultSummaryLabel}>Total</Text>
                </View>
              </View>
              <View style={styles.barContainer}>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${consultPct}%` }]} />
                </View>
                <Text style={styles.barLabel}>{consultPct.toFixed(0)}%</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vaccinations & Suivi</Text>
            <View style={styles.vaccineRow}>
              <Syringe size={18} color={MedicalColors.medical} />
              <Text style={styles.vaccineText}>{stats.vaccinesDone} vaccins administrés</Text>
            </View>
            <View style={styles.vaccineRow}>
              <Heart size={18} color={MedicalColors.maternity} />
              <Text style={styles.vaccineText}>{stats.pregnancyActive} grossesses actives</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MedicalColors.life }]} />
              <Text style={styles.legendText}>À jour</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MedicalColors.warning }]} />
              <Text style={styles.legendText}>En retard</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MedicalColors.urgency }]} />
              <Text style={styles.legendText}>Alerte</Text>
            </View>
          </View>

          {sortedPatients.length === 0 ? (
            <View style={styles.emptySection}>
              <Users size={40} color={MedicalColors.border} />
              <Text style={styles.emptyText}>Aucune patiente suivie</Text>
            </View>
          ) : (
            sortedPatients.map(p => {
              const progress = getPatientConsultProgress(p);
              const pct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
              // Couleurs distinctes pour les 4 niveaux d'alerte serveur,
              // avec fallback sur l'avancement des consultations pour le vert.
              const alertColorMap: Record<string, string> = {
                rouge: MedicalColors.urgency,
                orange: '#FF7043',
                jaune: MedicalColors.warning,
              };
              const statusColor = alertColorMap[p.alertLevel] ??
                (progress.isUpToDate ? MedicalColors.life : MedicalColors.warning);

              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.patientDetailCard}
                  onPress={() => router.push({ pathname: '/(tabs)/maternite/patient-dossier', params: { patientId: p.id } })}
                >
                  <View style={styles.patientDetailHeader}>
                    <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                    <View style={styles.patientDetailInfo}>
                      <Text style={styles.patientDetailName}>{p.pregnancy.firstName}, {p.pregnancy.age} ans</Text>
                      <Text style={styles.patientDetailWeek}>Semaine {p.pregnancy.currentWeek} • G{p.pregnancy.gravidity} P{p.pregnancy.parity}</Text>
                    </View>
                    <ChevronRight size={18} color={MedicalColors.textSecondary} />
                  </View>

                  <View style={styles.consultGrid}>
                    <View style={styles.consultGridItem}>
                      <CheckCircle size={14} color={MedicalColors.life} />
                      <Text style={styles.consultGridValue}>{progress.done}</Text>
                      <Text style={styles.consultGridLabel}>Faites</Text>
                    </View>
                    <View style={styles.consultGridItem}>
                      <Clock size={14} color={MedicalColors.warning} />
                      <Text style={styles.consultGridValue}>{progress.overdue}</Text>
                      <Text style={styles.consultGridLabel}>Retard</Text>
                    </View>
                    <View style={styles.consultGridItem}>
                      <Calendar size={14} color={MedicalColors.maternity} />
                      <Text style={styles.consultGridValue}>{progress.upcoming}</Text>
                      <Text style={styles.consultGridLabel}>À venir</Text>
                    </View>
                  </View>

                  <View style={styles.patientProgressBar}>
                    <View style={[styles.patientProgressFill, { width: `${pct}%`, backgroundColor: statusColor }]} />
                  </View>

                  {progress.overdue > 0 && (
                    <View style={styles.overdueList}>
                      {p.prenatalConsultations
                        .filter(c => c.status !== 'effectuee' && c.weekTarget <= p.pregnancy.currentWeek)
                        .slice(0, 3)
                        .map(c => (
                          <View key={c.id} style={styles.overdueItem}>
                            <AlertTriangle size={12} color={MedicalColors.urgency} />
                            <Text style={styles.overdueItemText} numberOfLines={1}>S{c.weekTarget} — {c.description}</Text>
                          </View>
                        ))
                      }
                    </View>
                  )}

                  {p.weeklyCheckups.length > 0 && (() => {
                    const last = p.weeklyCheckups[p.weeklyCheckups.length - 1];
                    // Le niveau et les raisons viennent du serveur, pas
                    // d'un recalcul local — la règle vit dans
                    // apps/maternite/alerts.py.
                    const alertColor = alertColorMap[p.alertLevel];
                    const hasAlert = p.alertLevel !== 'vert';
                    return (
                      <View style={[styles.lastCheckupBox, hasAlert ? styles.lastCheckupBoxAlert : null]}>
                        <View style={styles.lastCheckupRow}>
                          <Text style={styles.lastCheckupLabel}>Dernier suivi S{last.week}:</Text>
                          <Text style={styles.lastCheckupDate}>
                            {new Date(last.date).toLocaleDateString('fr-FR')}
                          </Text>
                          {hasAlert && alertColor && (
                            <AlertTriangle size={14} color={alertColor} />
                          )}
                        </View>
                        <View style={styles.lastCheckupDetails}>
                          {last.weight != null && <Text style={styles.lastCheckupDetail}>Poids: {last.weight}kg</Text>}
                          {last.systolicBP != null && (
                            <Text style={styles.lastCheckupDetail}>
                              TA: {last.systolicBP}/{last.diastolicBP}
                            </Text>
                          )}
                          {last.fetalMovements && (
                            <Text style={styles.lastCheckupDetail}>
                              Mvts: {last.fetalMovements}
                            </Text>
                          )}
                          {last.mood && <Text style={styles.lastCheckupDetail}>Humeur: {last.mood}</Text>}
                        </View>
                        {p.alertReasons && p.alertReasons.length > 0 && (
                          <View style={styles.alertReasonsBox}>
                            {p.alertReasons.map((r, i) => (
                              <Text key={i} style={[styles.alertReasonText, alertColor ? { color: alertColor } : null]}>
                                • {r}
                              </Text>
                            ))}
                          </View>
                        )}
                        {last.symptoms && last.symptoms.length > 0 && (
                          <Text style={styles.lastCheckupSymptoms} numberOfLines={1}>
                            Symptômes: {last.symptoms.join(', ')}
                          </Text>
                        )}
                        <Text style={styles.lastCheckupCount}>{p.weeklyCheckups.length} suivi(s) total</Text>
                      </View>
                    );
                  })()}
                </TouchableOpacity>
              );
            })
          )}
        </>
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
  headerDate: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, textTransform: 'capitalize' as const },
  tabRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 16 },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: MedicalColors.white,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  tabActive: { backgroundColor: MedicalColors.maternity, borderColor: MedicalColors.maternity },
  tabText: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.maternity },
  tabTextActive: { color: MedicalColors.white },
  statsGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'space-between' as const },
  statCard: { width: '48%' as const, borderRadius: 14, padding: 16, marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: '700' as const, color: MedicalColors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: MedicalColors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.text, marginBottom: 14 },
  consultSummaryRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-around' as const, marginBottom: 14 },
  consultSummaryItem: { alignItems: 'center' as const },
  consultSummaryValue: { fontSize: 26, fontWeight: '700' as const },
  consultSummaryLabel: { fontSize: 11, color: MedicalColors.textSecondary, marginTop: 2 },
  consultSummaryDivider: { width: 1, height: 36, backgroundColor: MedicalColors.border },
  barContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  barBg: { flex: 1, height: 12, backgroundColor: MedicalColors.background, borderRadius: 6, overflow: 'hidden' as const },
  barFill: { height: 12, backgroundColor: MedicalColors.maternity, borderRadius: 6 },
  barLabel: { fontSize: 14, fontWeight: '700' as const, color: MedicalColors.maternity },
  vaccineRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 8 },
  vaccineText: { fontSize: 14, color: MedicalColors.text },
  legendRow: { flexDirection: 'row' as const, justifyContent: 'center' as const, gap: 18, marginBottom: 14 },
  legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: MedicalColors.textSecondary },
  patientDetailCard: {
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  patientDetailHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 12 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  patientDetailInfo: { flex: 1, marginLeft: 12 },
  patientDetailName: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.text },
  patientDetailWeek: { fontSize: 12, color: MedicalColors.maternity, fontWeight: '600' as const, marginTop: 2 },
  consultGrid: { flexDirection: 'row' as const, gap: 8, marginBottom: 10 },
  consultGridItem: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
    backgroundColor: MedicalColors.background,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  consultGridValue: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.text },
  consultGridLabel: { fontSize: 10, color: MedicalColors.textSecondary },
  patientProgressBar: { height: 6, backgroundColor: MedicalColors.background, borderRadius: 3, overflow: 'hidden' as const, marginBottom: 8 },
  patientProgressFill: { height: 6, borderRadius: 3 },
  overdueList: { gap: 4, marginBottom: 6 },
  overdueItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: '#FFF3E0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  overdueItemText: { flex: 1, fontSize: 11, color: MedicalColors.text },
  lastCheckupBox: { backgroundColor: MedicalColors.background, borderRadius: 10, padding: 10, marginTop: 8 },
  lastCheckupBoxAlert: { backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: MedicalColors.urgency },
  lastCheckupRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  lastCheckupLabel: { fontSize: 11, color: MedicalColors.textSecondary },
  lastCheckupDate: { fontSize: 11, fontWeight: '600' as const, color: MedicalColors.maternity },
  lastCheckupDetails: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 6 },
  lastCheckupDetail: { fontSize: 11, fontWeight: '600' as const, color: MedicalColors.text, backgroundColor: MedicalColors.white, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  lastCheckupDetailAlert: { color: MedicalColors.urgency, backgroundColor: '#FFEBEE' },
  lastCheckupSymptoms: { fontSize: 10, color: MedicalColors.warning, marginTop: 4, fontStyle: 'italic' as const },
  lastCheckupCount: { fontSize: 10, color: MedicalColors.textSecondary, marginTop: 4 },
  alertReasonsBox: { marginTop: 6, gap: 2 },
  alertReasonText: { fontSize: 11, fontWeight: '600' as const },
  emptySection: { alignItems: 'center' as const, paddingVertical: 60 },
  emptyText: { fontSize: 15, color: MedicalColors.textSecondary, marginTop: 12 },
});
