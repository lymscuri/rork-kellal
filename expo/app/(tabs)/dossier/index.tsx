import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput as RNTextInput, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import {
  Search, Plus, QrCode, Users, Calendar, FileText, ClipboardList,
  AlertCircle, ChevronRight, Activity, LogOut, ScanLine
} from 'lucide-react-native';
import type { PatientRecord } from '@/types/medical';

function DoctorDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const allPatients = useMedicalStore((s) => s.patients);
  const getPatientsByDoctor = useMedicalStore((s) => s.getPatientsByDoctor);
  const getDoctorStats = useMedicalStore((s) => s.getDoctorStats);
  const syncPatientsFromBackend = useMedicalStore((s) => s.syncPatientsFromBackend);
  const [search, setSearch] = useState('');

  const patients = useMemo(
    () => {
      if (!user) return [];
      return getPatientsByDoctor(user.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, allPatients, getPatientsByDoctor]
  );

  const stats = useMemo(
    () => {
      if (!user) return { totalPatients: 0, monthConsultations: 0, monthPrescriptions: 0, patientsFollowed: 0 };
      return getDoctorStats(user.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, allPatients, getDoctorStats]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(p =>
      p.identity.firstName.toLowerCase().includes(q) ||
      p.identity.lastName.toLowerCase().includes(q) ||
      p.identity.dossierNumber.toLowerCase().includes(q)
    );
  }, [patients, search]);

  // Synchroniser les patients depuis le backend au montage
  useEffect(() => {
    console.log('[DoctorDashboard] Syncing patients from backend on mount');
    syncPatientsFromBackend();
  }, [syncPatientsFromBackend]);

  const getAlertLevel = useCallback((patient: PatientRecord) => {
    if (patient.consultations.length === 0) return 'none';
    const last = patient.consultations[0];
    if (last.vitalSigns.systolicBP && last.vitalSigns.systolicBP >= 140) return 'red';
    const lastDate = new Date(last.date);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 90) return 'yellow';
    return 'green';
  }, []);

  const renderPatient = useCallback(({ item }: { item: PatientRecord }) => {
    const alert = getAlertLevel(item);
    return (
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => router.push({ pathname: '/(tabs)/dossier/patient-record', params: { patientId: item.id } })}
        activeOpacity={0.7}
      >
        <View style={[styles.patientAvatar, { backgroundColor: alert === 'red' ? '#FFEBEE' : alert === 'yellow' ? '#FFF8E1' : MedicalColors.medicalLight }]}>
          <Text style={[styles.avatarText, { color: alert === 'red' ? MedicalColors.urgency : alert === 'yellow' ? '#F57F17' : MedicalColors.medical }]}>
            {item.identity.firstName.charAt(0)}{item.identity.lastName.charAt(0)}
          </Text>
          {alert === 'red' && <View style={styles.alertDotRed} />}
          {alert === 'yellow' && <View style={styles.alertDotYellow} />}
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.identity.lastName} {item.identity.firstName}</Text>
          <Text style={styles.patientDossier}>{item.identity.dossierNumber}</Text>
          {item.consultations.length > 0 && (
            <Text style={styles.patientLastVisit}>
              Dernière visite : {new Date(item.consultations[0].date).toLocaleDateString('fr-FR')}
            </Text>
          )}
        </View>
        <ChevronRight size={20} color={MedicalColors.textSecondary} />
      </TouchableOpacity>
    );
  }, [getAlertLevel, router]);

  const handleLogout = useCallback(() => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerDoc}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Bonjour, Dr.</Text>
            <Text style={styles.doctorName}>{user?.lastName} {user?.firstName}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={20} color={MedicalColors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Users size={18} color={MedicalColors.medical} />
            <Text style={styles.statValue}>{stats.totalPatients}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={18} color={MedicalColors.life} />
            <Text style={styles.statValue}>{stats.monthConsultations}</Text>
            <Text style={styles.statLabel}>Consultations</Text>
          </View>
          <View style={styles.statCard}>
            <ClipboardList size={18} color={MedicalColors.maternity} />
            <Text style={styles.statValue}>{stats.monthPrescriptions}</Text>
            <Text style={styles.statLabel}>Ordonnances</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={MedicalColors.textSecondary} />
        <RNTextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou n° dossier..."
          placeholderTextColor={MedicalColors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: MedicalColors.medical }]}
          onPress={() => router.push('/(tabs)/dossier/add-patient')}
        >
          <Plus size={18} color={MedicalColors.white} />
          <Text style={styles.actionBtnText}>Nouveau patient</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: MedicalColors.dark }]}
          onPress={() => router.push('/(tabs)/dossier/scanner')}
        >
          <ScanLine size={18} color={MedicalColors.white} />
          <Text style={styles.actionBtnText}>Scanner QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: MedicalColors.life }]}
          onPress={() => router.push('/(tabs)/dossier/doctor-reports')}
        >
          <FileText size={18} color={MedicalColors.white} />
          <Text style={styles.actionBtnText}>Rapports</Text>
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={MedicalColors.border} />
          <Text style={styles.emptyText}>
            {search ? 'Aucun patient trouvé' : 'Aucun patient enregistré'}
          </Text>
          <Text style={styles.emptySubtext}>
            {search ? 'Modifiez votre recherche' : 'Ajoutez votre premier patient'}
          </Text>
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

function PatientDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const allPatients = useMedicalStore((s) => s.patients);
  const getMyRecord = useMedicalStore((s) => s.getMyRecord);
  const getMyRecordByEmail = useMedicalStore((s) => s.getMyRecordByEmail);
  const autoLinkPatientByEmail = useMedicalStore((s) => s.autoLinkPatientByEmail);
  const getMyPrescriptions = useMedicalStore((s) => s.getMyPrescriptions);
  const hasAttemptedAutoLink = React.useRef(false);

  useEffect(() => {
    if (!user || hasAttemptedAutoLink.current) return;
    const byId = getMyRecord(user.id);
    if (!byId && user.email) {
      console.log('[PatientDashboard] No record by userId, trying auto-link by email:', user.email);
      const linked = autoLinkPatientByEmail(user.email, user.id);
      if (linked) {
        console.log('[PatientDashboard] Auto-linked patient record:', linked.id);
      } else {
        console.log('[PatientDashboard] No record found by email either');
      }
      hasAttemptedAutoLink.current = true;
    }
  }, [user, allPatients, getMyRecord, autoLinkPatientByEmail]);

  const record = useMemo(() => {
    if (!user) return null;
    console.log('[PatientDashboard] Looking for record with userId:', user.id, 'email:', user.email, 'total patients:', allPatients.length);
    const byId = getMyRecord(user.id);
    if (byId) {
      console.log('[PatientDashboard] Found record by userId:', byId.id);
      return byId;
    }
    if (user.email) {
      const byEmail = getMyRecordByEmail(user.email);
      if (byEmail) {
        console.log('[PatientDashboard] Found record by email:', byEmail.id);
        return byEmail;
      }
    }
    console.log('[PatientDashboard] No record found');
    return null;
  }, [user, allPatients, getMyRecord, getMyRecordByEmail]);

  const prescriptions = useMemo(
    () => {
      if (!user) return [];
      return getMyPrescriptions(user.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, allPatients, getMyPrescriptions]
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerPatient}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Mon Dossier Médical</Text>
            <Text style={styles.doctorName}>{user?.firstName} {user?.lastName}</Text>
            {user?.dossierNumber && (
              <Text style={styles.dossierNum}>{user.dossierNumber}</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtnPatient}>
            <LogOut size={20} color={MedicalColors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.patientMenuContainer}>
        {record ? (
          <>
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => router.push({ pathname: '/(tabs)/dossier/patient-record', params: { patientId: record.id, readOnly: 'true' } })}
            >
              <View style={[styles.menuIcon, { backgroundColor: MedicalColors.medicalLight }]}>
                <FileText size={24} color={MedicalColors.medical} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>Mon dossier complet</Text>
                <Text style={styles.menuSubtitle}>Identité, infos critiques, antécédents, consultations</Text>
              </View>
              <ChevronRight size={20} color={MedicalColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => router.push('/(tabs)/dossier/prescriptions')}
            >
              <View style={[styles.menuIcon, { backgroundColor: MedicalColors.lifeLight }]}>
                <ClipboardList size={24} color={MedicalColors.life} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>Mes ordonnances</Text>
                <Text style={styles.menuSubtitle}>{prescriptions.length} ordonnance(s)</Text>
              </View>
              <ChevronRight size={20} color={MedicalColors.textSecondary} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noDossierCard}>
            <AlertCircle size={40} color={MedicalColors.warning} />
            <Text style={styles.noDossierTitle}>Aucun dossier trouvé</Text>
            <Text style={styles.noDossierText}>
              Votre dossier sera créé lorsqu'un médecin vous ajoutera dans son suivi.
              Présentez votre QR code à votre médecin.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/(tabs)/dossier/my-qrcode')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
            <QrCode size={24} color={MedicalColors.maternity} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Mon QR Code</Text>
            <Text style={styles.menuSubtitle}>À présenter à votre médecin</Text>
          </View>
          <ChevronRight size={20} color={MedicalColors.textSecondary} />
        </TouchableOpacity>

        {record && (
          <View style={styles.criticalSummary}>
            <Text style={styles.criticalTitle}>Informations critiques</Text>
            <View style={styles.criticalRow}>
              <View style={styles.criticalItem}>
                <Activity size={16} color={MedicalColors.urgency} />
                <Text style={styles.criticalLabel}>Groupe sanguin</Text>
                <Text style={styles.criticalValue}>{record.criticalInfo.bloodGroup || 'Non renseigné'}</Text>
              </View>
              <View style={styles.criticalItem}>
                <AlertCircle size={16} color={MedicalColors.warning} />
                <Text style={styles.criticalLabel}>Allergies</Text>
                <Text style={styles.criticalValue}>{record.criticalInfo.drugAllergies.length + record.criticalInfo.foodAllergies.length}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function DossierIndex() {
  const { user } = useAuthStore();

  if (user?.role === 'medecin') {
    return <DoctorDashboard />;
  }
  return <PatientDashboard />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  headerDoc: {
    backgroundColor: MedicalColors.medical,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerPatient: {
    backgroundColor: MedicalColors.medical,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: MedicalColors.white,
    marginTop: 2,
  },
  dossierNum: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnPatient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: MedicalColors.white,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MedicalColors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: MedicalColors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: MedicalColors.white,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MedicalColors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  alertDotRed: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: MedicalColors.urgency,
    borderWidth: 2,
    borderColor: MedicalColors.white,
  },
  alertDotYellow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: MedicalColors.warning,
    borderWidth: 2,
    borderColor: MedicalColors.white,
  },
  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: MedicalColors.text,
  },
  patientDossier: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  patientLastVisit: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: MedicalColors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  patientMenuContainer: {
    padding: 16,
  },
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
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuInfo: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: MedicalColors.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  noDossierCard: {
    backgroundColor: MedicalColors.warningLight,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  noDossierTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: MedicalColors.text,
    marginTop: 12,
  },
  noDossierText: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  criticalSummary: {
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: MedicalColors.border,
    marginTop: 4,
  },
  criticalTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: MedicalColors.text,
    marginBottom: 12,
  },
  criticalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  criticalItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: MedicalColors.background,
    borderRadius: 10,
    padding: 12,
  },
  criticalLabel: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    marginTop: 6,
  },
  criticalValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: MedicalColors.text,
    marginTop: 2,
  },
});
