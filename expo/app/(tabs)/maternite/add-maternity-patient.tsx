import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { Baby } from 'lucide-react-native';

export default function AddMaternityPatientScreen() {
  const router = useRouter();
  const { addMaternityPatient } = useMedicalStore();

  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [gravidity, setGravidity] = useState('1');
  const [parity, setParity] = useState('0');
  const [previousPregnancies, setPreviousPregnancies] = useState<string[]>([]);
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [referentDoctor, setReferentDoctor] = useState('');

  const PREVIOUS_OPTIONS = ['Normales', 'Complications', 'Fausse couche', 'Césarienne'];
  const DELIVERY_OPTIONS = ['Maternité', 'Domicile assisté', 'Accoucheuse traditionnelle'];

  const togglePrevious = useCallback((opt: string) => {
    setPreviousPregnancies(prev => prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]);
  }, []);

  const calculateDueDate = (ddr: string): string | undefined => {
    try {
      const parts = ddr.split('/');
      if (parts.length === 3) {
        const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        date.setDate(date.getDate() + 280);
        return date.toISOString();
      }
    } catch {}
    return undefined;
  };

  const calculateCurrentWeek = (ddr: string): number => {
    try {
      const parts = ddr.split('/');
      if (parts.length === 3) {
        const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const diff = Date.now() - date.getTime();
        return Math.max(0, Math.min(42, Math.floor(diff / (7 * 24 * 60 * 60 * 1000))));
      }
    } catch {}
    return 0;
  };

  const handleSave = useCallback(() => {
    if (!firstName.trim()) {
      Alert.alert('Erreur', 'Le prénom est requis');
      return;
    }
    if (!age.trim() || isNaN(parseInt(age))) {
      Alert.alert('Erreur', 'L\'âge est requis');
      return;
    }

    const dueDate = lastPeriodDate ? calculateDueDate(lastPeriodDate) : undefined;
    const currentWeek = lastPeriodDate ? calculateCurrentWeek(lastPeriodDate) : 0;

    addMaternityPatient('', {
      firstName: firstName.trim(),
      age: parseInt(age),
      lastPeriodDate: lastPeriodDate.trim() || undefined,
      dueDate,
      currentWeek,
      gravidity: parseInt(gravidity) || 1,
      parity: parseInt(parity) || 0,
      previousPregnancies,
      deliveryPlace: deliveryPlace || 'Maternité',
      referentDoctor: referentDoctor.trim() || undefined,
      isActive: true,
    });

    Alert.alert('Succès', 'Patiente ajoutée avec succès', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [firstName, age, lastPeriodDate, gravidity, parity, previousPregnancies, deliveryPlace, referentDoctor, addMaternityPatient, router]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <Baby size={28} color={MedicalColors.maternity} />
        </View>
        <Text style={styles.headerTitle}>Nouvelle patiente</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <TextInput label="Prénom *" value={firstName} onChangeText={setFirstName} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
        <TextInput label="Âge *" value={age} onChangeText={setAge} mode="outlined" style={styles.input} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
        <TextInput label="DDR (JJ/MM/AAAA)" value={lastPeriodDate} onChangeText={setLastPeriodDate} mode="outlined" style={styles.input} placeholder="01/01/2025" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Antécédents obstétricaux</Text>
        <View style={styles.row}>
          <TextInput label="Gestité (G)" value={gravidity} onChangeText={setGravidity} mode="outlined" dense style={styles.inputHalf} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
          <TextInput label="Parité (P)" value={parity} onChangeText={setParity} mode="outlined" dense style={styles.inputHalf} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
        </View>

        <Text style={styles.fieldLabel}>Grossesses précédentes</Text>
        <View style={styles.chipRow}>
          {PREVIOUS_OPTIONS.map(opt => (
            <Chip
              key={opt}
              selected={previousPregnancies.includes(opt)}
              onPress={() => togglePrevious(opt)}
              style={[styles.chip, previousPregnancies.includes(opt) && styles.chipSelected]}
              textStyle={{ fontSize: 12, color: previousPregnancies.includes(opt) ? MedicalColors.white : MedicalColors.text }}
            >
              {opt}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lieu d'accouchement prévu</Text>
        <View style={styles.chipRow}>
          {DELIVERY_OPTIONS.map(opt => (
            <Chip
              key={opt}
              selected={deliveryPlace === opt}
              onPress={() => setDeliveryPlace(opt)}
              style={[styles.chip, deliveryPlace === opt && styles.chipSelected]}
              textStyle={{ fontSize: 12, color: deliveryPlace === opt ? MedicalColors.white : MedicalColors.text }}
            >
              {opt}
            </Chip>
          ))}
        </View>
        <TextInput label="Sage-femme / Médecin référent" value={referentDoctor} onChangeText={setReferentDoctor} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
      </View>

      <Button mode="contained" onPress={handleSave} buttonColor={MedicalColors.maternity} style={styles.saveBtn} contentStyle={styles.saveBtnContent}>
        Enregistrer la patiente
      </Button>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  iconHeader: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: MedicalColors.maternityLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: MedicalColors.text },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: MedicalColors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: MedicalColors.maternity, marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: MedicalColors.white },
  row: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1, marginBottom: 12, backgroundColor: MedicalColors.white },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { backgroundColor: MedicalColors.background },
  chipSelected: { backgroundColor: MedicalColors.maternity },
  saveBtn: { borderRadius: 10, marginTop: 8 },
  saveBtnContent: { paddingVertical: 10 },
});
