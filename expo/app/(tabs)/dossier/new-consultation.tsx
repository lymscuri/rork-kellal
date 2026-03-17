import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/store/api';
import type { VitalSigns, ClinicalExam, PrescriptionItem } from '@/types/medical';

const EXAM_SYSTEMS = ['Cardiovasculaire', 'Pulmonaire', 'Abdominal', 'Neurologique', 'ORL', 'Peau', 'Autres'];
const DIAGNOSIS_SUGGESTIONS = ['Paludisme', 'Hypertension', 'Diabète', 'Pneumonie', 'Gastro-entérite', 'Anémie', 'Infection urinaire', 'Grippe'];
const EXAM_OPTIONS = ['NFS', 'Glycémie', 'Créatinine', 'Goutte épaisse', 'TDR palu', 'ECBU', 'Sérologie VIH', 'Bilan hépatique', 'Radio', 'Échographie'];

export default function NewConsultationScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addConsultation, getPatientById } = useMedicalStore();

  const patient = patientId ? getPatientById(patientId) : null;

  const [reason, setReason] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [temperature, setTemperature] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [respRate, setRespRate] = useState('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [examObservations, setExamObservations] = useState<Record<string, string>>({});
  const [mainDiagnosis, setMainDiagnosis] = useState('');
  const [diffDiagnosis, setDiffDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [requestedExams, setRequestedExams] = useState<string[]>([]);
  const [nextAppointment, setNextAppointment] = useState('');
  const [observations, setObservations] = useState('');

  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medFreq, setMedFreq] = useState('');
  const [medDuration, setMedDuration] = useState('');
  const [medRoute, setMedRoute] = useState<'oral' | 'injectable' | 'topique'>('oral');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);

  const bmi = weight && height ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1) : '';

  const toggleExamSystem = useCallback((system: string) => {
    setSelectedExams(prev => prev.includes(system) ? prev.filter(s => s !== system) : [...prev, system]);
  }, []);

  const toggleRequestedExam = useCallback((exam: string) => {
    setRequestedExams(prev => prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam]);
  }, []);

  const doAddPrescription = useCallback((hasAlert: boolean) => {
    const item: PrescriptionItem = {
      id: Date.now().toString(),
      nameDCI: medName.trim(),
      dose: medDose.trim(),
      unit: 'mg',
      frequency: medFreq.trim() ? medFreq.split('/') : [],
      duration: medDuration.trim(),
      route: medRoute,
      allergyAlert: hasAlert,
    };
    setPrescriptions(prev => [...prev, item]);
    setMedName('');
    setMedDose('');
    setMedFreq('');
    setMedDuration('');
  }, [medName, medDose, medFreq, medDuration, medRoute]);

  const addPrescriptionItem = useCallback(() => {
    if (!medName.trim()) return;
    const allergyAlert = patient?.criticalInfo.drugAllergies?.some(
      a => a.name.toLowerCase().includes(medName.toLowerCase())
    );
    if (allergyAlert) {
      Alert.alert('⚠️ ALERTE ALLERGIE', `Le patient est allergique à "${medName}". Voulez-vous quand même prescrire ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Prescrire quand même', style: 'destructive', onPress: () => doAddPrescription(true) },
      ]);
    } else {
      doAddPrescription(false);
    }
  }, [medName, patient, doAddPrescription]);

  const handleSave = useCallback(async () => {
    if (!reason.trim() || !mainDiagnosis.trim()) {
      Alert.alert('Erreur', 'Le motif et le diagnostic sont requis');
      return;
    }
    if (!patientId || !user) return;

    const vitalSigns: VitalSigns = {
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
      bmi: bmi ? parseFloat(bmi) : undefined,
      temperature: temperature ? parseFloat(temperature) : undefined,
      systolicBP: systolic ? parseInt(systolic) : undefined,
      diastolicBP: diastolic ? parseInt(diastolic) : undefined,
      heartRate: heartRate ? parseInt(heartRate) : undefined,
      spo2: spo2 ? parseInt(spo2) : undefined,
      respiratoryRate: respRate ? parseInt(respRate) : undefined,
    };

    const clinicalExams: ClinicalExam[] = EXAM_SYSTEMS.map(system => ({
      system,
      checked: selectedExams.includes(system),
      observation: examObservations[system] || undefined,
    }));

    try {
      await addConsultation(patientId, {
        doctorId: user.id,
        doctorName: `${user.lastName} ${user.firstName}`,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        reason: reason.trim(),
        vitalSigns,
        clinicalExams,
        mainDiagnosis: mainDiagnosis.trim(),
        differentialDiagnosis: diffDiagnosis.trim() || undefined,
        treatment: treatment.trim(),
        prescriptions,
        requestedExams,
        nextAppointment: nextAppointment.trim() || undefined,
        observations: observations.trim() || undefined,
      });

      Alert.alert('Succès', 'Consultation enregistrée', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[NewConsultation] Error:', error);
      const message = extractErrorMessage(error) || 'Impossible d\'enregistrer la consultation. Vérifiez votre connexion.';
      Alert.alert('Erreur', message);
    }
  }, [reason, mainDiagnosis, patientId, user, weight, height, bmi, temperature, systolic, diastolic, heartRate, spo2, respRate, selectedExams, examObservations, diffDiagnosis, treatment, prescriptions, requestedExams, nextAppointment, observations, addConsultation, router]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Motif de consultation *</Text>
        <TextInput label="Motif" value={reason} onChangeText={setReason} mode="outlined" multiline style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Constantes vitales</Text>
        <View style={styles.row}>
          <TextInput label="Poids (kg)" value={weight} onChangeText={setWeight} mode="outlined" dense style={styles.inputHalf} keyboardType="decimal-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
          <TextInput label="Taille (cm)" value={height} onChangeText={setHeight} mode="outlined" dense style={styles.inputHalf} keyboardType="decimal-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        </View>
        {bmi ? <Text style={styles.bmiText}>IMC : {bmi}</Text> : null}
        <TextInput label="Température (°C)" value={temperature} onChangeText={setTemperature} mode="outlined" dense style={styles.input} keyboardType="decimal-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <View style={styles.row}>
          <TextInput label="TA Sys (mmHg)" value={systolic} onChangeText={setSystolic} mode="outlined" dense style={styles.inputHalf} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
          <TextInput label="TA Dia (mmHg)" value={diastolic} onChangeText={setDiastolic} mode="outlined" dense style={styles.inputHalf} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        </View>
        <View style={styles.row}>
          <TextInput label="FC (bpm)" value={heartRate} onChangeText={setHeartRate} mode="outlined" dense style={styles.inputThird} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
          <TextInput label="SpO2 (%)" value={spo2} onChangeText={setSpo2} mode="outlined" dense style={styles.inputThird} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
          <TextInput label="FR (/min)" value={respRate} onChangeText={setRespRate} mode="outlined" dense style={styles.inputThird} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Examen clinique</Text>
        <View style={styles.chipRow}>
          {EXAM_SYSTEMS.map(s => (
            <Chip key={s} selected={selectedExams.includes(s)} onPress={() => toggleExamSystem(s)} style={[styles.chip, selectedExams.includes(s) && styles.chipSelected]} textStyle={{ fontSize: 12, color: selectedExams.includes(s) ? MedicalColors.white : MedicalColors.text }}>
              {s}
            </Chip>
          ))}
        </View>
        {selectedExams.map(s => (
          <TextInput key={s} label={`Observation — ${s}`} value={examObservations[s] || ''} onChangeText={(v) => setExamObservations(prev => ({ ...prev, [s]: v }))} mode="outlined" dense multiline style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnostic *</Text>
        <View style={styles.chipRow}>
          {DIAGNOSIS_SUGGESTIONS.map(d => (
            <Chip key={d} onPress={() => setMainDiagnosis(d)} selected={mainDiagnosis === d} style={[styles.chip, mainDiagnosis === d && styles.chipSelected]} textStyle={{ fontSize: 12, color: mainDiagnosis === d ? MedicalColors.white : MedicalColors.text }}>
              {d}
            </Chip>
          ))}
        </View>
        <TextInput label="Diagnostic principal" value={mainDiagnosis} onChangeText={setMainDiagnosis} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Diagnostics différentiels" value={diffDiagnosis} onChangeText={setDiffDiagnosis} mode="outlined" multiline style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Conduite à tenir" value={treatment} onChangeText={setTreatment} mode="outlined" multiline style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ordonnance</Text>
        {prescriptions.map((p) => (
          <View key={p.id} style={[styles.prescCard, p.allergyAlert && styles.prescAlertCard]}>
            {p.allergyAlert && <Text style={styles.allergyWarning}>⚠️ Allergie connue</Text>}
            <Text style={styles.prescName}>{p.nameDCI}</Text>
            <Text style={styles.prescDetail}>{p.dose} — {p.frequency.join('/')} — {p.duration} — {p.route}</Text>
          </View>
        ))}
        <TextInput label="Nom médicament (DCI)" value={medName} onChangeText={setMedName} mode="outlined" dense style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <View style={styles.row}>
          <TextInput label="Dose + unité" value={medDose} onChangeText={setMedDose} mode="outlined" dense style={styles.inputHalf} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
          <TextInput label="Fréquence" value={medFreq} onChangeText={setMedFreq} mode="outlined" dense style={styles.inputHalf} placeholder="Matin/Soir" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        </View>
        <View style={styles.row}>
          <TextInput label="Durée" value={medDuration} onChangeText={setMedDuration} mode="outlined" dense style={styles.inputHalf} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
          <View style={styles.inputHalf}>
            <View style={styles.chipRow}>
              {(['oral', 'injectable', 'topique'] as const).map(r => (
                <Chip key={r} selected={medRoute === r} onPress={() => setMedRoute(r)} compact style={styles.chipSmall} textStyle={{ fontSize: 10 }}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Chip>
              ))}
            </View>
          </View>
        </View>
        <Button mode="outlined" onPress={addPrescriptionItem} textColor={MedicalColors.medical} style={styles.addMedBtn}>
          + Ajouter médicament
        </Button>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Examens complémentaires demandés</Text>
        <View style={styles.chipRow}>
          {EXAM_OPTIONS.map(e => (
            <Chip key={e} selected={requestedExams.includes(e)} onPress={() => toggleRequestedExam(e)} style={[styles.chip, requestedExams.includes(e) && styles.chipSelected]} textStyle={{ fontSize: 11, color: requestedExams.includes(e) ? MedicalColors.white : MedicalColors.text }}>
              {e}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suivi</Text>
        <TextInput label="Date prochain RDV" value={nextAppointment} onChangeText={setNextAppointment} mode="outlined" dense style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Observations libres" value={observations} onChangeText={setObservations} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
      </View>

      <Button mode="contained" onPress={handleSave} buttonColor={MedicalColors.medical} style={styles.saveBtn} contentStyle={styles.saveBtnContent}>
        Enregistrer la consultation
      </Button>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: MedicalColors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: MedicalColors.medical, marginBottom: 12 },
  input: { marginBottom: 10, backgroundColor: MedicalColors.white },
  row: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1, marginBottom: 10 },
  inputThird: { flex: 1, marginBottom: 10 },
  bmiText: { fontSize: 13, color: MedicalColors.medical, fontWeight: '600' as const, marginBottom: 8, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { backgroundColor: MedicalColors.background },
  chipSelected: { backgroundColor: MedicalColors.medical },
  chipSmall: { marginBottom: 4 },
  prescCard: { backgroundColor: MedicalColors.background, borderRadius: 10, padding: 12, marginBottom: 8 },
  prescAlertCard: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: MedicalColors.warning },
  allergyWarning: { fontSize: 12, color: MedicalColors.urgency, fontWeight: '700' as const, marginBottom: 4 },
  prescName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  prescDetail: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  addMedBtn: { borderColor: MedicalColors.medical, marginTop: 4 },
  saveBtn: { borderRadius: 10, marginTop: 8, marginBottom: 20 },
  saveBtnContent: { paddingVertical: 10 },
});
