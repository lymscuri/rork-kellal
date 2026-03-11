import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import {
  Baby, Calendar, Heart, Plus, ChevronRight,
  Users, BarChart3, MessageSquare, LogOut
} from 'lucide-react-native';
import type { MaternityPatient } from '@/types/medical';

function PatientView() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { maternityPatients } = useMedicalStore();

  const myData = useMemo(() => {
    if (!user) return null;
    return maternityPatients.find(p => p.userId === user.id) || null;
  }, [maternityPatients, user]);

  const pregnancy = myData?.pregnancy;
  const progressPercent = pregnancy ? Math.min((pregnancy.currentWeek / 40) * 100, 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerPatiente}>
          <View style={styles.headerContent}>
            <Baby size={28} color={MedicalColors.white} />
            <Text style={styles.headerTitle}>Maternité</Text>
            {pregnancy && (
              <Text style={styles.headerWeek}>Semaine {pregnancy.currentWeek} / 40</Text>
            )}
          </View>

          {pregnancy && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent.toFixed(0)}% de la grossesse</Text>
            </View>
          )}
        </View>

        <View style={styles.menuList}>
          {pregnancy && (
            <>
              <View style={styles.pregnancyCard}>
                <Text style={styles.pregnancyName}>{pregnancy.firstName}, {pregnancy.age} ans</Text>
                <View style={styles.pregnancyDetails}>
                  <View style={styles.pregnancyDetail}>
                    <Text style={styles.detailLabel}>DPA</Text>
                    <Text style={styles.detailValue}>
                      {pregnancy.dueDate ? new Date(pregnancy.dueDate).toLocaleDateString('fr-FR') : 'Non calculée'}
                    </Text>
                  </View>
                  <View style={styles.pregnancyDetail}>
                    <Text style={styles.detailLabel}>G/P</Text>
                    <Text style={styles.detailValue}>G{pregnancy.gravidity} P{pregnancy.parity}</Text>
                  </View>
                  <View style={styles.pregnancyDetail}>
                    <Text style={styles.detailLabel}>Lieu prévu</Text>
                    <Text style={styles.detailValue}>{pregnancy.deliveryPlace || 'Non défini'}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(tabs)/maternite/weekly-checkup' as never)}>
                <View style={[styles.menuIcon, { backgroundColor: '#FCE4EC' }]}>
                  <Heart size={22} color="#E91E63" />
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuTitle}>Suivi hebdomadaire</Text>
                  <Text style={styles.menuSubtitle}>Poids, tension, symptômes</Text>
                </View>
                <ChevronRight size={20} color={MedicalColors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(tabs)/maternite/prenatal-calendar' as never)}>
                <View style={[styles.menuIcon, { backgroundColor: MedicalColors.maternityLight }]}>
                  <Calendar size={22} color={MedicalColors.maternity} />
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuTitle}>Calendrier prénatal</Text>
                  <Text style={styles.menuSubtitle}>Consultations recommandées OMS</Text>
                </View>
                <ChevronRight size={20} color={MedicalColors.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          {myData && myData.children.length > 0 && (
            <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(tabs)/maternite/child-tracking' as never)}>
              <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                <Baby size={22} color={MedicalColors.life} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>Suivi pédiatrique</Text>
                <Text style={styles.menuSubtitle}>{myData.children.length} enfant(s) enregistré(s)</Text>
              </View>
              <ChevronRight size={20} color={MedicalColors.textSecondary} />
            </TouchableOpacity>
          )}

          {!pregnancy && (
            <View style={styles.emptyCard}>
              <Baby size={48} color={MedicalColors.border} />
              <Text style={styles.emptyTitle}>Pas de grossesse en cours</Text>
              <Text style={styles.emptySubtext}>
                Votre sage-femme ou médecin créera votre suivi de grossesse lors de votre première consultation.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SoignantView() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { maternityPatients } = useMedicalStore();
  const [search] = useState('');

  const doctorPatients = useMemo(() => {
    if (!user) return maternityPatients;
    return maternityPatients.filter(p => !p.soignantId || p.soignantId === user.id);
  }, [maternityPatients, user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return doctorPatients;
    const q = search.toLowerCase();
    return doctorPatients.filter(p =>
      p.pregnancy.firstName.toLowerCase().includes(q)
    );
  }, [doctorPatients, search]);

  const alertCounts = useMemo(() => {
    let rouge = 0;
    let jaune = 0;
    let vert = 0;
    doctorPatients.forEach(p => {
      if (p.alertLevel === 'rouge') rouge++;
      else if (p.alertLevel === 'jaune') jaune++;
      else vert++;
    });
    return { rouge, jaune, vert };
  }, [doctorPatients]);

  const handleLogout = useCallback(() => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  const getAlertColor = (level: string) => {
    if (level === 'rouge') return MedicalColors.urgency;
    if (level === 'jaune') return MedicalColors.warning;
    return MedicalColors.life;
  };

  const renderPatient = useCallback(({ item }: { item: MaternityPatient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => router.push({ pathname: '/(tabs)/maternite/patient-dossier' as never, params: { patientId: item.id } })}
    >
      <View style={[styles.alertDot, { backgroundColor: getAlertColor(item.alertLevel) }]} />
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.pregnancy.firstName}</Text>
        <Text style={styles.patientWeek}>Semaine {item.pregnancy.currentWeek} • G{item.pregnancy.gravidity} P{item.pregnancy.parity}</Text>
      </View>
      <ChevronRight size={18} color={MedicalColors.textSecondary} />
    </TouchableOpacity>
  ), [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerSoignant}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Suivi Maternité</Text>
            <Text style={styles.soignantName}>{user?.role === 'medecin' ? 'Dr.' : ''} {user?.lastName}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={20} color={MedicalColors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.alertRow}>
          <View style={[styles.alertBadge, { backgroundColor: 'rgba(220,53,69,0.2)' }]}>
            <Text style={[styles.alertValue, { color: MedicalColors.urgency }]}>{alertCounts.rouge}</Text>
            <Text style={styles.alertLabel}>🔴 Alertes</Text>
          </View>
          <View style={[styles.alertBadge, { backgroundColor: 'rgba(255,193,7,0.2)' }]}>
            <Text style={[styles.alertValue, { color: '#F57F17' }]}>{alertCounts.jaune}</Text>
            <Text style={styles.alertLabel}>🟡 Retard</Text>
          </View>
          <View style={[styles.alertBadge, { backgroundColor: 'rgba(76,175,80,0.2)' }]}>
            <Text style={[styles.alertValue, { color: MedicalColors.life }]}>{alertCounts.vert}</Text>
            <Text style={styles.alertLabel}>🟢 Normal</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: MedicalColors.maternity }]} onPress={() => router.push('/(tabs)/maternite/add-maternity-patient' as never)}>
          <Plus size={16} color={MedicalColors.white} />
          <Text style={styles.actionBtnText}>Patiente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: MedicalColors.dark }]} onPress={() => router.push('/(tabs)/maternite/soignant-dashboard' as never)}>
          <BarChart3 size={16} color={MedicalColors.white} />
          <Text style={styles.actionBtnText}>Tableau</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: MedicalColors.life }]} onPress={() => router.push('/(tabs)/maternite/sms-system' as never)}>
          <MessageSquare size={16} color={MedicalColors.white} />
          <Text style={styles.actionBtnText}>SMS</Text>
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={MedicalColors.border} />
          <Text style={styles.emptyTitle}>{search ? 'Aucune patiente trouvée' : 'Aucune patiente'}</Text>
          <Text style={styles.emptySubtext}>Ajoutez votre première patiente</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderPatient}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

export default function MaterniteIndex() {
  const { user } = useAuthStore();
  if (user?.role === 'medecin') {
    return <SoignantView />;
  }
  return <PatientView />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  headerPatiente: {
    backgroundColor: MedicalColors.maternity,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: { alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, color: MedicalColors.white, marginTop: 8 },
  headerWeek: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  progressContainer: { marginTop: 16 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: MedicalColors.white, borderRadius: 4 },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  menuList: { padding: 16 },
  pregnancyCard: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  pregnancyName: { fontSize: 18, fontWeight: '700' as const, color: MedicalColors.text, marginBottom: 12 },
  pregnancyDetails: { flexDirection: 'row', gap: 12 },
  pregnancyDetail: { flex: 1, backgroundColor: MedicalColors.background, borderRadius: 10, padding: 10, alignItems: 'center' },
  detailLabel: { fontSize: 11, color: MedicalColors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '700' as const, color: MedicalColors.text, marginTop: 2 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  menuIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1, marginLeft: 14 },
  menuTitle: { fontSize: 15, fontWeight: '600' as const, color: MedicalColors.text },
  menuSubtitle: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  emptyCard: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, color: MedicalColors.text, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: MedicalColors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  headerSoignant: {
    backgroundColor: MedicalColors.maternity,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  soignantName: { fontSize: 22, fontWeight: '700' as const, color: MedicalColors.white, marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  alertRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  alertBadge: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  alertValue: { fontSize: 22, fontWeight: '700' as const },
  alertLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 14, marginBottom: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: MedicalColors.white, fontSize: 13, fontWeight: '600' as const },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  listContent: { padding: 16, paddingTop: 8 },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MedicalColors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  alertDot: { width: 10, height: 10, borderRadius: 5 },
  patientInfo: { flex: 1, marginLeft: 12 },
  patientName: { fontSize: 15, fontWeight: '600' as const, color: MedicalColors.text },
  patientWeek: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
});
