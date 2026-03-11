import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { useAuthStore } from '@/store/authStore';
import { Heart, Stethoscope, CheckCircle } from 'lucide-react-native';

const LAB_OPTIONS = ['NFS', 'Groupe sanguin', 'Sérologie VIH', 'TPHA', 'Goutte épaisse', 'Glycémie', 'ECBU'];

export default function PatientDossierScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const _user = useAuthStore();
  const { maternityPatients, addPrenatalExam, markPrenatalConsultationDone } = useMedicalStore();

  const patient = useMemo(() => {
    return maternityPatients.find(p => p.id === patientId) || null;
  }, [maternityPatients, patientId]);

  const [weight, setWeight] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [uterineHeight, setUterineHeight] = useState('');
  const [fetalHR, setFetalHR] = useState('');
  const [presentation, setPresentation] = useState<'cephalique' | 'siege' | 'transverse' | ''>('');
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [ultrasound, setUltrasound] = useState('');
  const [observations, setObservations] = useState('');

  const toggleLab = useCallback((lab: string) => {
    setSelectedLabs(prev => prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab]);
  }, []);

  const handleSaveExam = useCallback(() => {
    if (!patient || !patientId) return;

    const sys = systolic ? parseInt(systolic) : undefined;
    const dia = diastolic ? parseInt(diastolic) : undefined;

    addPrenatalExam(patientId, {
      date: new Date().toISOString(),
      week: patient.pregnancy.currentWeek,
      weight: weight ? parseFloat(weight) : undefined,
      systolicBP: sys,
      diastolicBP: dia,
      uterineHeight: uterineHeight ? parseFloat(uterineHeight) : undefined,
      fetalHeartRate: fetalHR ? parseInt(fetalHR) : undefined,
      fetalPresentation: presentation || undefined,
      labResults: selectedLabs,
      ultrasound: ultrasound.trim() || undefined,
      prescriptions: ['Fer + Acide folique', 'Fansidar (chimioprévention paludisme)'],
      observations: observations.trim() || undefined,
      markedDone: true,
    });

    const nextConsultation = patient.prenatalConsultations.find(
      c => c.status !== 'effectuee' && c.weekTarget <= patient.pregnancy.currentWeek + 2
    );
    if (nextConsultation) {
      markPrenatalConsultationDone(patientId, nextConsultation.id, new Date().toISOString());
    }

    Alert.alert('Enregistré', 'Consultation prénatale enregistrée avec succès.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [patient, patientId, weight, systolic, diastolic, uterineHeight, fetalHR, presentation, selectedLabs, ultrasound, observations, addPrenatalExam, markPrenatalConsultationDone, router]);

  if (!patient) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Patiente non trouvée</Text>
      </View>
    );
  }

  const pregnancy = patient.pregnancy;
  const consultationsDone = patient.prenatalConsultations.filter(c => c.status === 'effectuee').length;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.patientHeader}>
        <View style={styles.patientAvatar}>
          <Heart size={24} color={MedicalColors.maternity} />
        </View>
        <View>
          <Text style={styles.patientName}>{pregnancy.firstName}, {pregnancy.age} ans</Text>
          <Text style={styles.patientWeek}>Semaine {pregnancy.currentWeek} • G{pregnancy.gravidity} P{pregnancy.parity}</Text>
          <Text style={styles.patientConsults}>{consultationsDone} / {patient.prenatalConsultations.length} consultations effectuées</Text>
        </View>
      </View>

      {patient.prenatalExams.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultations précédentes</Text>
          {patient.prenatalExams.slice(0, 3).map(exam => (
            <View key={exam.id} style={styles.examCard}>
              <View style={styles.examHeader}>
                <CheckCircle size={16} color={MedicalColors.life} />
                <Text style={styles.examDate}>S{exam.week} — {new Date(exam.date).toLocaleDateString('fr-FR')}</Text>
              </View>
              <View style={styles.examDetails}>
                {exam.weight && <Text style={styles.examDetail}>Poids: {exam.weight} kg</Text>}
                {exam.systolicBP && <Text style={styles.examDetail}>TA: {exam.systolicBP}/{exam.diastolicBP}</Text>}
                {exam.uterineHeight && <Text style={styles.examDetail}>HU: {exam.uterineHeight} cm</Text>}
                {exam.fetalHeartRate && <Text style={styles.examDetail}>BCF: {exam.fetalHeartRate} bpm</Text>}
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
  patientAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: MedicalColors.maternityLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  patientName: { fontSize: 18, fontWeight: '700' as const, color: MedicalColors.text },
  patientWeek: { fontSize: 13, color: MedicalColors.maternity, fontWeight: '600' as const, marginTop: 2 },
  patientConsults: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: MedicalColors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.maternity },
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
});
