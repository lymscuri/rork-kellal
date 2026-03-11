import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import { UserPlus } from 'lucide-react-native';
import type { PatientIdentity } from '@/types/medical';

export default function AddPatientScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addPatient } = useMedicalStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | ''>('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [commune, setCommune] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleSave = useCallback(() => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erreur', 'Le nom et le prénom sont requis');
      return;
    }
    if (!user) return;

    const identity: Partial<PatientIdentity> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate.trim() || undefined,
      sex: sex === 'M' || sex === 'F' ? sex : undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      commune: commune.trim() || undefined,
      prefecture: prefecture.trim() || undefined,
      emergencyContacts: contactName.trim() ? [{
        id: Date.now().toString(),
        fullName: contactName.trim(),
        relationship: contactRelation.trim() || 'Non précisé',
        phoneNumber: contactPhone.trim(),
      }] : [],
    };

    const patientId = addPatient(user.id, identity);
    console.log('[AddPatient] Created patient:', patientId);
    Alert.alert('Succès', 'Patient ajouté avec succès', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [firstName, lastName, birthDate, sex, phone, address, commune, prefecture, contactName, contactRelation, contactPhone, user, addPatient, router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <UserPlus size={28} color={MedicalColors.medical} />
        </View>
        <Text style={styles.headerTitle}>Nouveau Patient</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identité</Text>
        <TextInput label="Prénom *" value={firstName} onChangeText={setFirstName} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Nom *" value={lastName} onChangeText={setLastName} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Date de naissance (JJ/MM/AAAA)" value={birthDate} onChangeText={setBirthDate} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />

        <Text style={styles.fieldLabel}>Sexe</Text>
        <View style={styles.sexRow}>
          {(['M', 'F'] as const).map(s => (
            <Button
              key={s}
              mode={sex === s ? 'contained' : 'outlined'}
              onPress={() => setSex(s)}
              style={styles.sexBtn}
              buttonColor={sex === s ? MedicalColors.medical : undefined}
              textColor={sex === s ? MedicalColors.white : MedicalColors.text}
            >
              {s === 'M' ? 'Masculin' : 'Féminin'}
            </Button>
          ))}
        </View>

        <TextInput label="Téléphone" value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Adresse / Quartier" value={address} onChangeText={setAddress} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Commune" value={commune} onChangeText={setCommune} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Préfecture" value={prefecture} onChangeText={setPrefecture} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact d'urgence</Text>
        <TextInput label="Nom complet" value={contactName} onChangeText={setContactName} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Lien de parenté" value={contactRelation} onChangeText={setContactRelation} mode="outlined" style={styles.input} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
        <TextInput label="Téléphone" value={contactPhone} onChangeText={setContactPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
      </View>

      <Button mode="contained" onPress={handleSave} style={styles.saveBtn} buttonColor={MedicalColors.medical} contentStyle={styles.saveBtnContent}>
        Enregistrer le patient
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  iconHeader: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: MedicalColors.medicalLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: MedicalColors.text },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: MedicalColors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.medical, marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: MedicalColors.white },
  fieldLabel: { fontSize: 13, color: MedicalColors.textSecondary, marginBottom: 8 },
  sexRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sexBtn: { flex: 1, borderColor: MedicalColors.border },
  saveBtn: { borderRadius: 10, marginTop: 8 },
  saveBtnContent: { paddingVertical: 8 },
});
