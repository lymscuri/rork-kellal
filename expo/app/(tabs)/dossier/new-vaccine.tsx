import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { useAuthStore } from '@/store/authStore';
import type { VaccineRecord } from '@/types/medical';

const COMMON_VACCINES = [
  'BCG', 'Hépatite B', 'Pentavalent', 'Pneumocoque',
  'Rotavirus', 'Rougeole', 'Fièvre jaune', 'Méningite A',
  'Tétanos', 'Grippe', 'COVID-19', 'Rage',
  'Typhoïde', 'Hépatite A', 'Varicelle', 'Autre',
];

const STATUSES: { value: VaccineRecord['status']; label: string }[] = [
  { value: 'fait', label: 'Fait' },
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_retard', label: 'En retard' },
];

export default function NewVaccineScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addVaccine } = useMedicalStore();

  const [vaccineName, setVaccineName] = useState('');
  const [customName, setCustomName] = useState('');
  const [facility, setFacility] = useState('');
  const [status, setStatus] = useState<VaccineRecord['status']>('fait');
  const [nextReminder, setNextReminder] = useState('');
  const [notes, setNotes] = useState('');

  const handleSelectVaccine = useCallback((name: string) => {
    if (name === 'Autre') {
      setVaccineName('');
    } else {
      setVaccineName(name);
      setCustomName('');
    }
  }, []);

  const handleSave = useCallback(() => {
    const finalName = vaccineName || customName.trim();
    if (!finalName) {
      Alert.alert('Erreur', 'Le nom du vaccin est requis');
      return;
    }
    if (!patientId || !user) return;

    addVaccine(patientId, {
      name: finalName,
      date: new Date().toISOString(),
      facility: facility.trim() || 'Non précisé',
      doctor: `Dr. ${user.lastName} ${user.firstName}`,
      nextReminder: nextReminder.trim() || undefined,
      status,
    });

    Alert.alert('Succès', 'Vaccin enregistré', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [vaccineName, customName, facility, status, nextReminder, patientId, user, addVaccine, router]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vaccin *</Text>
          <View style={styles.chipRow}>
            {COMMON_VACCINES.map(v => (
              <Chip
                key={v}
                selected={vaccineName === v}
                onPress={() => handleSelectVaccine(v)}
                style={[styles.chip, vaccineName === v && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: vaccineName === v ? MedicalColors.white : MedicalColors.text }}
              >
                {v}
              </Chip>
            ))}
          </View>
          {!vaccineName && (
            <TextInput
              label="Nom du vaccin"
              value={customName}
              onChangeText={setCustomName}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut</Text>
          <View style={styles.chipRow}>
            {STATUSES.map(s => (
              <Chip
                key={s.value}
                selected={status === s.value}
                onPress={() => setStatus(s.value)}
                style={[
                  styles.chip,
                  status === s.value && (
                    s.value === 'fait' ? styles.chipDone :
                    s.value === 'en_retard' ? styles.chipLate :
                    styles.chipPending
                  ),
                ]}
                textStyle={{ fontSize: 13, color: status === s.value ? MedicalColors.white : MedicalColors.text }}
              >
                {s.label}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Établissement</Text>
          <TextInput
            label="Centre de santé / Hôpital"
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
          <Text style={styles.sectionTitle}>Rappel</Text>
          <TextInput
            label="Date du prochain rappel (ex: 15/06/2026)"
            value={nextReminder}
            onChangeText={setNextReminder}
            mode="outlined"
            dense
            style={styles.input}
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.medical}
          />
          <TextInput
            label="Notes complémentaires"
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
          Enregistrer le vaccin
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
  chipDone: { backgroundColor: MedicalColors.life },
  chipLate: { backgroundColor: MedicalColors.urgency },
  chipPending: { backgroundColor: '#FF9800' },
  saveBtn: { borderRadius: 10, marginTop: 8, marginBottom: 20 },
  saveBtnContent: { paddingVertical: 10 },
});
