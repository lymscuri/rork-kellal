import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import { UserPlus, CheckCircle, Search } from 'lucide-react-native';
import type { PatientIdentity } from '@/types/medical';
import type { User } from '@/store/authStore';

export default function AddPatientScreen() {
  const router = useRouter();
  const { user, findPatientByEmail } = useAuthStore();
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
  const [patientEmail, setPatientEmail] = useState('');
  const [linkedUser, setLinkedUser] = useState<User | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);

  const handleSearchUser = useCallback(async () => {
    if (!patientEmail.trim()) {
      Alert.alert('Info', 'Entrez l\'email du compte patient pour le lier');
      return;
    }
    setSearchingUser(true);
    try {
      const found = await findPatientByEmail(patientEmail.trim());
      if (found) {
        setLinkedUser(found);
        if (!firstName.trim()) setFirstName(found.firstName);
        if (!lastName.trim()) setLastName(found.lastName);
        if (!phone.trim() && found.phone) setPhone(found.phone);
        Alert.alert('Patient trouvé', `Compte lié à ${found.firstName} ${found.lastName}`);
      } else {
        setLinkedUser(null);
        Alert.alert('Non trouvé', 'Aucun compte patient trouvé avec cet email. Le dossier sera créé sans liaison.');
      }
    } catch (e) {
      console.error('[AddPatient] Search user error:', e);
    } finally {
      setSearchingUser(false);
    }
  }, [patientEmail, findPatientByEmail, firstName, lastName, phone]);

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

    const patientId = addPatient(user.id, identity, linkedUser?.id);
    console.log('[AddPatient] Created patient:', patientId, 'linked to user:', linkedUser?.id);
    Alert.alert('Succès', linkedUser ? `Patient ajouté et lié au compte de ${linkedUser.firstName} ${linkedUser.lastName}` : 'Patient ajouté avec succès', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [firstName, lastName, birthDate, sex, phone, address, commune, prefecture, contactName, contactRelation, contactPhone, user, addPatient, router, linkedUser]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <UserPlus size={28} color={MedicalColors.medical} />
        </View>
        <Text style={styles.headerTitle}>Nouveau Patient</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lier à un compte patient</Text>
        <Text style={styles.linkDescription}>Si le patient a déjà un compte Keneya, entrez son email pour lier le dossier à son compte. Il pourra voir son dossier depuis son app.</Text>
        <View style={styles.linkRow}>
          <TextInput
            label="Email du patient"
            value={patientEmail}
            onChangeText={(text) => { setPatientEmail(text); setLinkedUser(null); }}
            mode="outlined"
            style={styles.linkInput}
            keyboardType="email-address"
            autoCapitalize="none"
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.medical}
          />
          <TouchableOpacity style={styles.linkBtn} onPress={handleSearchUser} disabled={searchingUser}>
            {searchingUser ? (
              <ActivityIndicator size="small" color={MedicalColors.white} />
            ) : (
              <Search size={20} color={MedicalColors.white} />
            )}
          </TouchableOpacity>
        </View>
        {linkedUser && (
          <View style={styles.linkedBadge}>
            <CheckCircle size={16} color={MedicalColors.life} />
            <Text style={styles.linkedText}>Lié à : {linkedUser.firstName} {linkedUser.lastName} ({linkedUser.email})</Text>
          </View>
        )}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  linkDescription: { fontSize: 12, color: MedicalColors.textSecondary, marginBottom: 12, lineHeight: 17 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkInput: { flex: 1, backgroundColor: MedicalColors.white },
  linkBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: MedicalColors.medical, justifyContent: 'center', alignItems: 'center' },
  linkedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: MedicalColors.lifeLight, borderRadius: 8, padding: 10, marginTop: 10 },
  linkedText: { fontSize: 12, color: MedicalColors.life, fontWeight: '600' as const, flex: 1 },
});
