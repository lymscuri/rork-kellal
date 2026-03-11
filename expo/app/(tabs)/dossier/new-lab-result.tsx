import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { useAuthStore } from '@/store/authStore';

const EXAM_TYPES = [
  'NFS', 'Glycémie', 'Créatinine', 'Goutte épaisse', 'TDR Palu',
  'ECBU', 'Sérologie VIH', 'Bilan hépatique', 'Bilan rénal',
  'Hémoglobine', 'Groupe sanguin', 'VS/CRP', 'Radiographie',
  'Échographie', 'Scanner', 'IRM', 'ECG', 'Autre',
];

const INTERPRETATIONS = ['Normal', 'Anormal', 'Critique', 'À surveiller'];

export default function NewLabResultScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addLabResult } = useMedicalStore();

  const [examType, setExamType] = useState('');
  const [customExamType, setCustomExamType] = useState('');
  const [facility, setFacility] = useState('');
  const [result, setResult] = useState('');
  const [unit, setUnit] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSelectExamType = useCallback((type: string) => {
    if (type === 'Autre') {
      setExamType('');
    } else {
      setExamType(type);
      setCustomExamType('');
    }
  }, []);

  const handleSave = useCallback(() => {
    const finalExamType = examType || customExamType.trim();
    if (!finalExamType) {
      Alert.alert('Erreur', "Le type d'examen est requis");
      return;
    }
    if (!result.trim()) {
      Alert.alert('Erreur', 'Le résultat est requis');
      return;
    }
    if (!patientId || !user) return;

    addLabResult(patientId, {
      examType: finalExamType,
      date: new Date().toISOString(),
      facility: facility.trim() || 'Non précisé',
      result: result.trim(),
      unit: unit.trim() || undefined,
      interpretation: interpretation || undefined,
      prescribedBy: `Dr. ${user.lastName} ${user.firstName}`,
    });

    Alert.alert('Succès', "Résultat d'examen enregistré", [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [examType, customExamType, result, facility, unit, interpretation, patientId, user, addLabResult, router]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type d'examen *</Text>
          <View style={styles.chipRow}>
            {EXAM_TYPES.map(t => (
              <Chip
                key={t}
                selected={examType === t}
                onPress={() => handleSelectExamType(t)}
                style={[styles.chip, examType === t && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: examType === t ? MedicalColors.white : MedicalColors.text }}
              >
                {t}
              </Chip>
            ))}
          </View>
          {!examType && (
            <TextInput
              label="Type d'examen personnalisé"
              value={customExamType}
              onChangeText={setCustomExamType}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Établissement</Text>
          <TextInput
            label="Laboratoire / Hôpital"
            value={facility}
            onChangeText={setFacility}
            mode="outlined"
            dense
            style={styles.input}
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.medical}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résultat *</Text>
          <TextInput
            label="Résultat"
            value={result}
            onChangeText={setResult}
            mode="outlined"
            multiline
            style={styles.input}
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.medical}
          />
          <TextInput
            label="Unité (ex: g/dL, mmol/L)"
            value={unit}
            onChangeText={setUnit}
            mode="outlined"
            dense
            style={styles.input}
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.medical}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interprétation</Text>
          <View style={styles.chipRow}>
            {INTERPRETATIONS.map(i => (
              <Chip
                key={i}
                selected={interpretation === i}
                onPress={() => setInterpretation(prev => prev === i ? '' : i)}
                style={[
                  styles.chip,
                  interpretation === i && (i === 'Critique' ? styles.chipDanger : i === 'Anormal' ? styles.chipWarning : i === 'À surveiller' ? styles.chipCaution : styles.chipSelected),
                ]}
                textStyle={{ fontSize: 12, color: interpretation === i ? MedicalColors.white : MedicalColors.text }}
              >
                {i}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            label="Observations complémentaires"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.medical}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          buttonColor={MedicalColors.medical}
          style={styles.saveBtn}
          contentStyle={styles.saveBtnContent}
        >
          Enregistrer le résultat
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: MedicalColors.medical,
    marginBottom: 12,
  },
  input: { marginBottom: 10, backgroundColor: MedicalColors.white },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { backgroundColor: MedicalColors.background },
  chipSelected: { backgroundColor: MedicalColors.medical },
  chipDanger: { backgroundColor: MedicalColors.urgency },
  chipWarning: { backgroundColor: '#F57F17' },
  chipCaution: { backgroundColor: '#FF9800' },
  saveBtn: { borderRadius: 10, marginTop: 8, marginBottom: 20 },
  saveBtnContent: { paddingVertical: 10 },
});
