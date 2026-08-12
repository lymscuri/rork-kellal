import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useBackendStore } from '@/store/backendStore';
import { maternityAPI } from '@/store/api';
import { useAuthStore } from '@/store/authStore';
import { Heart, Stethoscope, CheckCircle, Calendar, CalendarDays, Activity, AlertTriangle, Smile, Moon, Frown } from 'lucide-react-native';

const LAB_OPTIONS = ['NFS', 'Groupe sanguin', 'Sérologie VIH', 'TPHA', 'Goutte épaisse', 'Glycémie', 'ECBU'];

function DatePickerInline({ value, onChange, label }: { value: string; onChange: (d: string) => void; label: string }) {
  const [day, setDay] = useState(() => value ? new Date(value).getDate().toString() : '');
  const [month, setMonth] = useState(() => value ? (new Date(value).getMonth() + 1).toString() : '');
  const [year, setYear] = useState(() => value ? new Date(value).getFullYear().toString() : new Date().getFullYear().toString());

  const handleUpdate = useCallback((d: string, m: string, y: string) => {
    const dayNum = parseInt(d);
    const monthNum = parseInt(m);
    const yearNum = parseInt(y);
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2024) {
      const date = new Date(yearNum, monthNum - 1, dayNum);
      onChange(date.toISOString());
    }
  }, [onChange]);

  return (
    <View style={dateStyles.container}>
      <Text style={dateStyles.label}>{label}</Text>
      <View style={dateStyles.row}>
        <TextInput
          label="Jour"
          value={day}
          onChangeText={(v) => { setDay(v); handleUpdate(v, month, year); }}
          mode="outlined"
          dense
          style={dateStyles.dayInput}
          keyboardType="number-pad"
          maxLength={2}
          outlineColor={MedicalColors.border}
          activeOutlineColor={MedicalColors.maternity}
        />
        <TextInput
          label="Mois"
          value={month}
          onChangeText={(v) => { setMonth(v); handleUpdate(day, v, year); }}
          mode="outlined"
          dense
          style={dateStyles.monthInput}
          keyboardType="number-pad"
          maxLength={2}
          outlineColor={MedicalColors.border}
          activeOutlineColor={MedicalColors.maternity}
        />
        <TextInput
          label="Année"
          value={year}
          onChangeText={(v) => { setYear(v); handleUpdate(day, month, v); }}
          mode="outlined"
          dense
          style={dateStyles.yearInput}
          keyboardType="number-pad"
          maxLength={4}
          outlineColor={MedicalColors.border}
          activeOutlineColor={MedicalColors.maternity}
        />
      </View>
    </View>
  );
}

const dateStyles = StyleSheet.create({
  container: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  dayInput: { flex: 1, backgroundColor: MedicalColors.white },
  monthInput: { flex: 1, backgroundColor: MedicalColors.white },
  yearInput: { flex: 1.3, backgroundColor: MedicalColors.white },
});

export default function PatientDossierScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const { user: _user } = useAuthStore();

  const patient = useBackendStore(s =>
    s.maternityPatients.find(p => p.id === patientId) || null
  );

  const [weight, setWeight] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [uterineHeight, setUterineHeight] = useState('');
  const [fetalHR, setFetalHR] = useState('');
  const [presentation, setPresentation] = useState<'cephalique' | 'siege' | 'transverse' | ''>('');
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [ultrasound, setUltrasound] = useState('');
  const [observations, setObservations] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);

  const toggleLab = useCallback((lab: string) => {
    setSelectedLabs(prev => prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab]);
  }, []);

  const handleScheduleDate = useCallback((consultationId: string, date: string) => {
    console.log('[PatientDossier] Scheduled consultation', consultationId, 'to', date);
    // TODO: Implémenter via medicalStore
  }, []);

  const handleSaveExam = useCallback(async () => {
    if (!patient || !patient.pregnancy || !patient.pregnancy.id) {
      Alert.alert('Erreur', 'Aucune grossesse active');
      return;
    }

    try {
      // Créer une consultation prénatale
      await maternityAPI.createPrenatalConsultation(patient.id, patient.pregnancy.id, {
        consultation_date: new Date().toISOString().split('T')[0],
        consultation_number: (patient.prenatal_consultations?.length || 0) + 1,
        week_of_gestation: patient.pregnancy.current_week || 0,
        weight: weight ? parseFloat(weight) : null,
        blood_pressure_systolic: systolic ? parseInt(systolic) : null,
        blood_pressure_diastolic: diastolic ? parseInt(diastolic) : null,
        fetal_heart_rate: fetalHR ? parseInt(fetalHR) : null,
        fetal_presentation: presentation || null,
        complaints: observations.trim() || null,
        recommendations: observations.trim() || null,
      });

      await useBackendStore.getState().syncMaternityPatients();

      Alert.alert('Succès', 'Consultation prénatale enregistrée', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      console.error('[PatientDossier]', e?.response?.data || e?.message);
      Alert.alert('Erreur', JSON.stringify(e?.response?.data) || e?.message);
    }
  }, [patient, weight, systolic, diastolic, fetalHR, presentation, observations, router]);

  if (!patient) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Patiente non trouvée</Text>
      </View>
    );
  }

  const pregnancy = patient.pregnancy;
  const consultationsDone = patient.prenatal_consultations?.length || 0;
  const upcomingConsultations: any[] = [];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.patientHeader}>
        <View style={styles.patientAvatar}>
          <Heart size={24} color={MedicalColors.maternity} />
        </View>
        <View style={styles.patientHeaderInfo}>
          <Text style={styles.patientName}>{patient.first_name}, {patient.age || 'N/A'} ans</Text>
          <Text style={styles.patientWeek}>Semaine {pregnancy?.current_week || 'N/A'} • G{pregnancy?.gravidity || 0} P{pregnancy?.parity || 0}</Text>
          <Text style={styles.patientConsults}>{consultationsDone} consultations effectuées</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.schedulerToggle}
          onPress={() => setShowScheduler(!showScheduler)}
          activeOpacity={0.7}
        >
          <View style={styles.schedulerToggleLeft}>
            <CalendarDays size={20} color={MedicalColors.maternity} />
            <Text style={styles.schedulerToggleText}>Planifier les RDV</Text>
          </View>
          <View style={[styles.schedulerBadge, { backgroundColor: upcomingConsultations.filter(c => !c.scheduledDate).length > 0 ? MedicalColors.warning : MedicalColors.life }]}>
            <Text style={styles.schedulerBadgeText}>
              {upcomingConsultations.filter(c => c.scheduledDate).length}/{upcomingConsultations.length}
            </Text>
          </View>
        </TouchableOpacity>

        {showScheduler && (
          <View style={styles.schedulerContent}>
            <Text style={styles.schedulerHint}>
              Définissez la date de chaque RDV. La patiente verra ces dates dans son calendrier.
            </Text>
            {upcomingConsultations.map((c) => (
              <View key={c.id} style={styles.rdvCard}>
                <View style={styles.rdvCardHeader}>
                  <View style={styles.rdvWeekBadge}>
                    <Text style={styles.rdvWeekText}>S{c.weekTarget}</Text>
                  </View>
                  <Text style={styles.rdvDescription} numberOfLines={2}>{c.description}</Text>
                </View>
                {c.scheduledDate ? (
                  <View style={styles.rdvScheduledRow}>
                    <Calendar size={14} color={MedicalColors.life} />
                    <Text style={styles.rdvScheduledDate}>
                      RDV : {new Date(c.scheduledDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                ) : null}
                <DatePickerInline
                  value={c.scheduledDate || ''}
                  onChange={(date) => handleScheduleDate(c.id, date)}
                  label={c.scheduledDate ? "Modifier la date" : "Définir la date du RDV"}
                />
                {c.scheduledDate && (
                  <View style={styles.rdvConfirmed}>
                    <CheckCircle size={14} color={MedicalColors.life} />
                    <Text style={styles.rdvConfirmedText}>Date planifiée</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {patient.prenatal_consultations && patient.prenatal_consultations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultations prénatales ({patient.prenatal_consultations.length})</Text>
          {patient.prenatal_consultations.slice(0, 5).map((c: any) => (
            <View key={c.id} style={styles.examCard}>
              <View style={styles.examHeader}>
                <CheckCircle size={16} color={MedicalColors.life} />
                <Text style={styles.examDate}>
                  S{c.week} — {
                    c.date
                      ? new Date(c.date).toLocaleDateString('fr-FR')
                      : c.scheduled_date
                        ? `Prévue le ${new Date(c.scheduled_date).toLocaleDateString('fr-FR')}`
                        : c.status === 'annulee' ? 'Annulée' : 'Non réalisée'
                  }
                </Text>
              </View>
              <View style={styles.examDetails}>
                {c.weight && <Text style={styles.examDetail}>Poids: {c.weight} kg</Text>}
                {c.blood_pressure && <Text style={styles.examDetail}>TA: {c.blood_pressure}</Text>}
                {c.fetal_heart_rate && <Text style={styles.examDetail}>BCF: {c.fetal_heart_rate} bpm</Text>}
                {c.notes && <Text style={styles.examDetail}>Notes: {c.notes}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Stethoscope size={18} color={MedicalColors.maternity} />
          <Text style={styles.sectionTitle}>Nouvelle consultation prénatale</Text>
        </View>

        <View style={styles.row}>
          <TextInput label="Poids (kg)" value={weight} onChangeText={setWeight} mode="outlined" dense style={styles.inputHalf} keyboardType="decimal-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
          <TextInput label="HU (cm)" value={uterineHeight} onChangeText={setUterineHeight} mode="outlined" dense style={styles.inputHalf} keyboardType="decimal-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
        </View>

        <View style={styles.row}>
          <TextInput label="TA Sys" value={systolic} onChangeText={setSystolic} mode="outlined" dense style={styles.inputHalf} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
          <TextInput label="TA Dia" value={diastolic} onChangeText={setDiastolic} mode="outlined" dense style={styles.inputHalf} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
        </View>

        {(systolic && parseInt(systolic) >= 140) || (diastolic && parseInt(diastolic) >= 90) ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>⚠️ Tension élevée — Pré-éclampsie possible</Text>
          </View>
        ) : null}

        <TextInput label="BCF (bpm)" value={fetalHR} onChangeText={setFetalHR} mode="outlined" dense style={styles.input} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />

        <Text style={styles.fieldLabel}>Présentation fœtale</Text>
        <View style={styles.chipRow}>
          {(['cephalique', 'siege', 'transverse'] as const).map(p => (
            <Chip
              key={p}
              selected={presentation === p}
              onPress={() => setPresentation(p)}
              style={[styles.chip, presentation === p && styles.chipSelected]}
              textStyle={{ fontSize: 12, color: presentation === p ? MedicalColors.white : MedicalColors.text }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Chip>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Résultats analyses</Text>
        <View style={styles.chipRow}>
          {LAB_OPTIONS.map(lab => (
            <Chip
              key={lab}
              selected={selectedLabs.includes(lab)}
              onPress={() => toggleLab(lab)}
              style={[styles.chip, selectedLabs.includes(lab) && styles.chipSelected]}
              textStyle={{ fontSize: 11, color: selectedLabs.includes(lab) ? MedicalColors.white : MedicalColors.text }}
            >
              {lab}
            </Chip>
          ))}
        </View>

        <TextInput label="Échographie" value={ultrasound} onChangeText={setUltrasound} mode="outlined" multiline dense style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />

        <View style={styles.prescriptionBox}>
          <Text style={styles.prescriptionTitle}>Prescriptions systématiques</Text>
          <Text style={styles.prescriptionItem}>• Fer + Acide folique</Text>
          <Text style={styles.prescriptionItem}>• Fansidar (chimioprévention paludisme)</Text>
        </View>

        <TextInput label="Observations" value={observations} onChangeText={setObservations} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />

        <Button mode="contained" onPress={handleSaveExam} buttonColor={MedicalColors.maternity} style={styles.saveBtn} contentStyle={styles.saveBtnContent}>
          Marquer consultation effectuée
        </Button>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: MedicalColors.textSecondary },
  patientHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: MedicalColors.white, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: MedicalColors.border },
  patientHeaderInfo: { flex: 1 },
  patientAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: MedicalColors.maternityLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  patientName: { fontSize: 18, fontWeight: '700' as const, color: MedicalColors.text },
  patientWeek: { fontSize: 13, color: MedicalColors.maternity, fontWeight: '600' as const, marginTop: 2 },
  patientConsults: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: MedicalColors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.maternity },
  schedulerToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  schedulerToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  schedulerToggleText: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.maternity },
  schedulerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  schedulerBadgeText: { fontSize: 12, fontWeight: '700' as const, color: MedicalColors.white },
  schedulerContent: { marginTop: 14 },
  schedulerHint: { fontSize: 12, color: MedicalColors.textSecondary, marginBottom: 14, lineHeight: 18, backgroundColor: MedicalColors.maternityLight, padding: 12, borderRadius: 10 },
  rdvCard: { backgroundColor: MedicalColors.background, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: MedicalColors.border },
  rdvCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  rdvWeekBadge: { backgroundColor: MedicalColors.maternity, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rdvWeekText: { fontSize: 13, fontWeight: '700' as const, color: MedicalColors.white },
  rdvDescription: { flex: 1, fontSize: 13, color: MedicalColors.text, lineHeight: 18 },
  rdvScheduledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, backgroundColor: MedicalColors.lifeLight, padding: 8, borderRadius: 8 },
  rdvScheduledDate: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.life },
  rdvConfirmed: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  rdvConfirmedText: { fontSize: 11, color: MedicalColors.life, fontWeight: '600' as const },
  examCard: { backgroundColor: MedicalColors.background, borderRadius: 10, padding: 12, marginBottom: 8 },
  examHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  examDate: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text },
  examDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  examDetail: { fontSize: 12, color: MedicalColors.textSecondary, backgroundColor: MedicalColors.white, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  input: { marginBottom: 10, backgroundColor: MedicalColors.white },
  row: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1, marginBottom: 10, backgroundColor: MedicalColors.white },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { backgroundColor: MedicalColors.background },
  chipSelected: { backgroundColor: MedicalColors.maternity },
  alertBanner: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: MedicalColors.urgency },
  alertText: { fontSize: 13, color: MedicalColors.urgency, fontWeight: '700' as const },
  prescriptionBox: { backgroundColor: MedicalColors.maternityLight, borderRadius: 10, padding: 12, marginBottom: 12 },
  prescriptionTitle: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.maternity, marginBottom: 6 },
  prescriptionItem: { fontSize: 12, color: MedicalColors.text, lineHeight: 20 },
  saveBtn: { borderRadius: 10, marginTop: 8 },
  saveBtnContent: { paddingVertical: 10 },
  checkupCard: { backgroundColor: MedicalColors.background, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: MedicalColors.border },
  checkupCardAlert: { borderColor: MedicalColors.urgency, backgroundColor: '#FFF8F8' },
  checkupHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 10 },
  checkupWeekBadge: { backgroundColor: MedicalColors.maternity, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  checkupWeekBadgeAlert: { backgroundColor: MedicalColors.urgency },
  checkupWeekText: { fontSize: 13, fontWeight: '700' as const, color: MedicalColors.white },
  checkupDate: { flex: 1, fontSize: 13, color: MedicalColors.textSecondary },
  checkupMetrics: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 6 },
  checkupMetric: { backgroundColor: MedicalColors.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 80 },
  checkupMetricLabel: { fontSize: 10, color: MedicalColors.textSecondary, marginBottom: 2 },
  checkupMetricValue: { fontSize: 14, fontWeight: '700' as const, color: MedicalColors.text },
  checkupMetricDanger: { color: MedicalColors.urgency },
  checkupMetricWarn: { color: MedicalColors.warning },
  checkupMoodRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  checkupSymptoms: { marginTop: 6 },
  checkupSymptomsLabel: { fontSize: 11, fontWeight: '600' as const, color: MedicalColors.textSecondary, marginBottom: 6 },
  checkupSymptomsList: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 4 },
  checkupSymptomTag: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  checkupSymptomTagDanger: { backgroundColor: '#FFEBEE' },
  checkupSymptomText: { fontSize: 11, color: MedicalColors.text },
  checkupSymptomTextDanger: { color: MedicalColors.urgency, fontWeight: '600' as const },
});
