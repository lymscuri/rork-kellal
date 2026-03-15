import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import { extractErrorMessage } from '@/store/api';
import { ScanLine, Search, Mail } from 'lucide-react-native';

export default function ScannerScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getPatientByDossierNumber, getPatientByUserId, linkPatientToDoctor, addPatient, searchPatientInStore } = useMedicalStore();
  const [dossierNumber, setDossierNumber] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [searchingEmail, setSearchingEmail] = useState(false);

  const handleSearch = useCallback(() => {
    if (!dossierNumber.trim() || !user) return;
    const patient = getPatientByDossierNumber(dossierNumber.trim());
    if (patient) {
      linkPatientToDoctor(dossierNumber.trim(), user.id);
      Alert.alert('Patient trouvé', `${patient.identity.lastName} ${patient.identity.firstName}`, [
        {
          text: 'Voir le dossier',
          onPress: () => {
            router.back();
            setTimeout(() => {
              router.push({ pathname: '/(tabs)/dossier/patient-record', params: { patientId: patient.id } });
            }, 100);
          },
        },
      ]);
    } else {
      Alert.alert('Non trouvé', 'Aucun patient trouvé avec ce numéro de dossier. Voulez-vous créer un nouveau patient ?', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nouveau patient',
          onPress: () => {
            router.back();
            setTimeout(() => {
              router.push('/(tabs)/dossier/add-patient');
            }, 100);
          },
        },
      ]);
    }
  }, [dossierNumber, user, getPatientByDossierNumber, linkPatientToDoctor, router]);

  const handleSearchByEmail = useCallback(async () => {
    if (!patientEmail.trim() || !user) return;
    setSearchingEmail(true);
    try {
      const existingRecord = searchPatientInStore(patientEmail.trim());
      if (existingRecord) {
        const existingDoctorIds = existingRecord.doctorIds || [existingRecord.doctorId];
        if (!existingDoctorIds.includes(user.id)) {
          linkPatientToDoctor(existingRecord.identity.dossierNumber, user.id);
        }
        Alert.alert('Patient trouvé', `${existingRecord.identity.lastName} ${existingRecord.identity.firstName} — dossier existant`, [
          {
            text: 'Voir le dossier',
            onPress: () => {
              router.back();
              setTimeout(() => {
                router.push({ pathname: '/(tabs)/dossier/patient-record', params: { patientId: existingRecord.id } });
              }, 100);
            },
          },
        ]);
      } else {
        Alert.alert('Non trouvé', 'Aucun dossier patient avec cet email. Le médecin doit d\'abord créer le dossier via "Nouveau patient".');
      }
    } catch (e) {
      console.error('[Scanner] Email search error:', e);
      const message = extractErrorMessage(e) || 'Erreur lors de la recherche';
      Alert.alert('Erreur', message);
    } finally {
      setSearchingEmail(false);
    }
  }, [patientEmail, user, searchPatientInStore, linkPatientToDoctor, router]);

  return (
    <View style={styles.container}>
      <View style={styles.iconArea}>
        <View style={styles.scanIcon}>
          <ScanLine size={64} color={MedicalColors.medical} />
        </View>
        <Text style={styles.title}>Scanner un QR Code</Text>
        <Text style={styles.subtitle}>
          {Platform.OS === 'web'
            ? 'Le scanner QR n\'est pas disponible sur le web. Utilisez la recherche ci-dessous.'
            : 'Scannez le QR code du patient ou recherchez par numéro de dossier.'}
        </Text>
      </View>

      <View style={styles.manualSection}>
        <Text style={styles.manualTitle}>Recherche par email du patient</Text>
        <View style={styles.searchRow}>
          <TextInput
            label="Email du patient"
            value={patientEmail}
            onChangeText={setPatientEmail}
            mode="outlined"
            style={styles.searchInput}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon={() => <Mail size={20} color={MedicalColors.textSecondary} />} />}
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.medical}
          />
          <TouchableOpacity style={styles.searchIconBtn} onPress={handleSearchByEmail} disabled={searchingEmail}>
            {searchingEmail ? (
              <ActivityIndicator size="small" color={MedicalColors.white} />
            ) : (
              <Search size={20} color={MedicalColors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.manualSection}>
        <Text style={styles.manualTitle}>Recherche par n° de dossier</Text>
        <TextInput
          label="N° de dossier (ex: KNY-2025-00142)"
          value={dossierNumber}
          onChangeText={setDossierNumber}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon={() => <Search size={20} color={MedicalColors.textSecondary} />} />}
          outlineColor={MedicalColors.border}
          activeOutlineColor={MedicalColors.medical}
        />
        <Button mode="contained" onPress={handleSearch} buttonColor={MedicalColors.medical} style={styles.searchBtn} contentStyle={styles.searchBtnContent}>
          Rechercher le patient
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background, padding: 24 },
  iconArea: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  scanIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: MedicalColors.medicalLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700' as const, color: MedicalColors.text },
  subtitle: { fontSize: 14, color: MedicalColors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  manualSection: { backgroundColor: MedicalColors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: MedicalColors.border, marginBottom: 12 },
  manualTitle: { fontSize: 16, fontWeight: '600' as const, color: MedicalColors.text, marginBottom: 12 },
  input: { marginBottom: 16, backgroundColor: MedicalColors.white },
  searchBtn: { borderRadius: 10 },
  searchBtnContent: { paddingVertical: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, backgroundColor: MedicalColors.white },
  searchIconBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: MedicalColors.medical, justifyContent: 'center', alignItems: 'center' },
});
