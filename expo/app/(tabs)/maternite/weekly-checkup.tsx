import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useBackendStore } from '@/store/backendStore';
import { maternityAPI } from '@/store/api';
import { useAuthStore } from '@/store/authStore';
import { Heart, AlertTriangle } from 'lucide-react-native';

const SYMPTOMS = [
  'Nausées/vomissements', 'Fatigue intense', 'Douleurs abdominales',
  'Maux de tête persistants', 'Gonflement visage-mains-pieds', 'Saignements',
  'Mouvements fœtaux diminués', 'Fièvre', 'Pertes vaginales anormales', 'Vision floue',
];

export default function WeeklyCheckupScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const myMaternity = useBackendStore(s => s.myMaternity);

  const currentWeek = myMaternity?.pregnancy?.current_week || 0;

  const [weight, setWeight] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [fetalMovements, setFetalMovements] = useState<'actifs' | 'normaux' | 'reduits' | 'absents' | ''>('');
  const [mood, setMood] = useState<'bien' | 'fatigue' | 'anxieux' | ''>('');

  const toggleSymptom = useCallback((s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);

  const handleSave = useCallback(async () => {
    const pregnancyId = myMaternity?.pregnancy?.id;

    if (!myMaternity?.pregnancy || !pregnancyId) {
      Alert.alert('Erreur', 'Aucune grossesse active');
      return;
    }

    // Alertes cliniques : déclenchées AVANT toute logique réseau ni tout
    // branchement sur le rôle. Une urgence obstétrique doit s'afficher
    // même si le backend est injoignable ou si l'utilisateur est la
    // patiente elle-même.
    const sys = systolic ? parseInt(systolic) : undefined;
    const dia = diastolic ? parseInt(diastolic) : undefined;

    if (sys && sys >= 140) {
      Alert.alert('⚠️ ALERTE TENSION', 'Votre tension est élevée (≥140). Consultez immédiatement votre sage-femme !', [{ text: 'Compris' }]);
    }
    if (dia && dia >= 90) {
      Alert.alert('⚠️ ALERTE TENSION', 'Votre tension diastolique est élevée (≥90). Consultez immédiatement votre sage-femme !', [{ text: 'Compris' }]);
    }
    if (fetalMovements === 'absents') {
      Alert.alert('🚨 URGENCE', 'Mouvements fœtaux absents — appelez le 442 ou rendez-vous aux urgences immédiatement !', [{ text: 'Compris' }]);
    }

    try {
      // Payload aligné sur WeeklyCheckupSerializer (apps/maternite/serializers.py:73).
      // checkup_date est obligatoire côté serializer.
      await maternityAPI.createWeeklyCheckup(myMaternity.id, pregnancyId, {
        checkup_date: new Date().toISOString(),
        week_number: currentWeek,
        weight: weight ? parseFloat(weight) : null,
        blood_pressure_systolic: sys ?? null,
        blood_pressure_diastolic: dia ?? null,
        symptoms,
        fetal_movements: fetalMovements || '',
        mood: mood || '',
      });

      if (user) {
        await useBackendStore.getState().syncMyMaternity(user.id);
      }

      Alert.alert('Succès', 'Suivi enregistré', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.error('[WeeklyCheckup]', e?.response?.data || e?.message);
      const detail = e?.response?.data?.error?.message
        || (e?.response?.data ? JSON.stringify(e.response.data) : null)
        || e?.message
        || 'Enregistrement impossible.';
      Alert.alert(
        "Suivi non enregistré",
        `${detail}\n\nVotre suivi n'a PAS été envoyé au serveur. Réessayez quand vous aurez du réseau.`,
      );
    }
  }, [myMaternity, weight, systolic, diastolic, symptoms, fetalMovements, mood, currentWeek, user, router]);

  const weightHistory = useMemo(() => {
    const checkups = myMaternity?.weekly_checkups || [];
    return checkups
      .filter((c: any) => c.weight)
      .sort((a: any, b: any) => a.week - b.week)
      .slice(-8);
  }, [myMaternity]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.weekBadge}>
        <Heart size={20} color={MedicalColors.maternity} />
        <Text style={styles.weekText}>Semaine {currentWeek}</Text>
      </View>

      {weightHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Évolution du poids</Text>
          <View style={styles.weightRow}>
            {weightHistory.map((c, i) => (
              <View key={i} style={styles.weightItem}>
                <Text style={styles.weightValue}>{c.weight} kg</Text>
                <Text style={styles.weightWeek}>S{c.week}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mesures</Text>
        <TextInput label="Poids (kg)" value={weight} onChangeText={setWeight} mode="outlined" dense style={styles.input} keyboardType="decimal-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
        <View style={styles.row}>
          <TextInput label="TA Systolique" value={systolic} onChangeText={setSystolic} mode="outlined" dense style={styles.inputHalf} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
          <TextInput label="TA Diastolique" value={diastolic} onChangeText={setDiastolic} mode="outlined" dense style={styles.inputHalf} keyboardType="number-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.maternity} />
        </View>
        {(systolic && parseInt(systolic) >= 140) || (diastolic && parseInt(diastolic) >= 90) ? (
          <View style={styles.alertBanner}>
            <AlertTriangle size={18} color={MedicalColors.urgency} />
            <Text style={styles.alertText}>Tension élevée ! Consultez immédiatement votre sage-femme.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Symptômes ressentis</Text>
        <View style={styles.chipRow}>
          {SYMPTOMS.map(s => (
            <Chip
              key={s}
              selected={symptoms.includes(s)}
              onPress={() => toggleSymptom(s)}
              style={[styles.chip, symptoms.includes(s) && styles.chipSelected]}
              textStyle={{ fontSize: 12, color: symptoms.includes(s) ? MedicalColors.white : MedicalColors.text }}
            >
              {s}
            </Chip>
          ))}
        </View>
      </View>

      {currentWeek >= 20 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mouvements fœtaux</Text>
          <View style={styles.chipRow}>
            {(['actifs', 'normaux', 'reduits', 'absents'] as const).map(m => (
              <Chip
                key={m}
                selected={fetalMovements === m}
                onPress={() => setFetalMovements(m)}
                style={[styles.chip, fetalMovements === m && (m === 'absents' ? styles.chipDanger : m === 'reduits' ? styles.chipWarn : styles.chipSelected)]}
                textStyle={{ fontSize: 12, color: fetalMovements === m ? MedicalColors.white : MedicalColors.text }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Chip>
            ))}
          </View>
          {fetalMovements === 'absents' && (
            <View style={styles.urgentBanner}>
              <Text style={styles.urgentText}>🚨 URGENCE — Mouvements absents. Appelez le 442 immédiatement !</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Humeur générale</Text>
        <View style={styles.chipRow}>
          {([{ key: 'bien' as const, label: '😊 Bien' }, { key: 'fatigue' as const, label: '😴 Fatiguée' }, { key: 'anxieux' as const, label: '😟 Anxieuse' }]).map(m => (
            <Chip
              key={m.key}
              selected={mood === m.key}
              onPress={() => setMood(m.key)}
              style={[styles.chip, mood === m.key && styles.chipSelected]}
              textStyle={{ fontSize: 12, color: mood === m.key ? MedicalColors.white : MedicalColors.text }}
            >
              {m.label}
            </Chip>
          ))}
        </View>
      </View>

      <Button mode="contained" onPress={handleSave} buttonColor={MedicalColors.maternity} style={styles.saveBtn} contentStyle={styles.saveBtnContent}>
        Enregistrer le suivi
      </Button>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  weekBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: MedicalColors.maternityLight, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginBottom: 16 },
  weekText: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.maternity },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: MedicalColors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: MedicalColors.maternity, marginBottom: 12 },
  input: { marginBottom: 10, backgroundColor: MedicalColors.white },
  row: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1, marginBottom: 10, backgroundColor: MedicalColors.white },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: MedicalColors.background, marginBottom: 4 },
  chipSelected: { backgroundColor: MedicalColors.maternity },
  chipDanger: { backgroundColor: MedicalColors.urgency },
  chipWarn: { backgroundColor: MedicalColors.warning },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 12, marginTop: 8 },
  alertText: { flex: 1, fontSize: 13, color: MedicalColors.urgency, fontWeight: '600' as const },
  urgentBanner: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 14, marginTop: 10, borderWidth: 1, borderColor: MedicalColors.urgency },
  urgentText: { fontSize: 14, color: MedicalColors.urgency, fontWeight: '700' as const, textAlign: 'center' },
  weightRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  weightItem: { backgroundColor: MedicalColors.maternityLight, borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 60 },
  weightValue: { fontSize: 14, fontWeight: '700' as const, color: MedicalColors.maternity },
  weightWeek: { fontSize: 11, color: MedicalColors.textSecondary, marginTop: 2 },
  saveBtn: { borderRadius: 10, marginTop: 8 },
  saveBtnContent: { paddingVertical: 10 },
});
