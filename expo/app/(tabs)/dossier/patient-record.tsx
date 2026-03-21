import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, TextInput, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useBackendStore } from '@/store/backendStore';
import { useMedicalStore } from '@/store/medicalStore';
import { useAuthStore } from '@/store/authStore';
import { dossierAPI } from '@/store/api';
import {
  User, History, Stethoscope, FlaskConical, Syringe, Plus
} from 'lucide-react-native';

const TABS = ['Identité', 'Infos critiques', 'Antécédents', 'Consultations', 'Examens', 'Vaccins'];

export default function PatientRecordScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const store = useMedicalStore();
  const [activeTab, setActiveTab] = useState(0);
  const isReadOnly = user?.role !== 'medecin';

  // États locaux pour formulaires médecin
  const [surgeryName, setSurgeryName] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [surgeryHospital, setSurgeryHospital] = useState('');
  const [hospReason, setHospReason] = useState('');
  const [hospDateEntree, setHospDateEntree] = useState('');
  const [hospDateSortie, setHospDateSortie] = useState('');
  const [hospHopital, setHospHopital] = useState('');
  const [editBloodType, setEditBloodType] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [editChronicDiseases, setEditChronicDiseases] = useState('');
  const [editTreatments, setEditTreatments] = useState('');
  const [editPastIllnesses, setEditPastIllnesses] = useState('');
  const [editBloodTransfusion, setEditBloodTransfusion] = useState<boolean | null>(null);
  const [editTransfusionDate, setEditTransfusionDate] = useState('');

  // Médecin : chercher dans patients
  // Patient : chercher dans myRecord
  const patient = useBackendStore(s => {
    if (!patientId) return null;
    if (user?.role === 'medecin') {
      return s.patients.find(p => p.id === patientId) || null;
    } else {
      return s.myRecord?.id === patientId ? s.myRecord : null;
    }
  });

  if (!patient) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Patient non trouvé</Text>
      </View>
    );
  }

  const renderIdentity = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
          </Text>
        </View>
        <View>
          <Text style={styles.profileName}>{patient.last_name} {patient.first_name}</Text>
          <Text style={styles.profileDossier}>{patient.numero_dossier}</Text>
          {patient.age && <Text style={styles.profileAge}>{patient.age} ans • {patient.gender === 'M' ? 'Masculin' : 'Féminin'}</Text>}
        </View>
      </View>
      <View style={styles.infoGrid}>
        <InfoRow label="Téléphone" value={patient.phone || 'Non renseigné'} />
        <InfoRow label="Adresse" value={patient.address || 'Non renseigné'} />
        <InfoRow label="Ville" value={patient.city || 'Non renseigné'} />
        <InfoRow label="Préfecture" value={patient.prefecture || 'Non renseigné'} />
        <InfoRow label="Email" value={patient.email || patient.linked_email || 'Non renseigné'} />
      </View>
      {patient.emergency_contacts?.length > 0 && (
        <View style={styles.contactsSection}>
          <Text style={styles.subSectionTitle}>Contacts d'urgence</Text>
          {patient.emergency_contacts.map((c: any, i: number) => (
            <View key={i} style={styles.contactCard}>
              <Text style={styles.contactName}>{c.fullName || c.name || 'Contact'}</Text>
              <Text style={styles.contactDetail}>
                {c.relationship || c.relation || 'N/A'} • {c.phoneNumber || c.phone || 'N/A'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderCriticalInfo = () => (
    <View style={styles.tabContent}>
      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Groupe sanguin</Text>
        <Text style={styles.readValue}>{patient.blood_type || 'Non renseigné'}</Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Allergies</Text>
        <Text style={styles.readValue}>{patient.allergies || 'Aucune allergie renseignée'}</Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Maladies chroniques</Text>
        <Text style={styles.readValue}>{patient.chronic_diseases || 'Aucune'}</Text>
      </View>

      {patient.permanent_treatments && (
        <View style={styles.fieldGroup}>
          <Text style={styles.subSectionTitle}>Traitements permanents</Text>
          <Text style={styles.readValue}>{patient.permanent_treatments}</Text>
        </View>
      )}

      {!isReadOnly && (
        <View style={styles.fieldGroup}>
          <View style={styles.addForm}>
            <Text style={styles.subLabel}>Modifier les informations</Text>
            <TextInput
              label="Groupe sanguin (ex: O+, A-, B+...)"
              value={editBloodType}
              onChangeText={setEditBloodType}
              mode="outlined"
              dense
              style={styles.input}
              placeholder={patient.blood_type || 'Non renseigné'}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <TextInput
              label="Allergies (séparées par virgule)"
              value={editAllergies}
              onChangeText={setEditAllergies}
              mode="outlined"
              dense
              style={styles.input}
              multiline
              placeholder={patient.allergies || 'Aucune'}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <TextInput
              label="Maladies chroniques (séparées par virgule)"
              value={editChronicDiseases}
              onChangeText={setEditChronicDiseases}
              mode="outlined"
              dense
              style={styles.input}
              multiline
              placeholder={patient.chronic_diseases || 'Aucune'}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <TextInput
              label="Traitements permanents"
              value={editTreatments}
              onChangeText={setEditTreatments}
              mode="outlined"
              dense
              style={styles.input}
              multiline
              placeholder={patient.permanent_treatments || 'Aucun'}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <Button
              mode="contained"
              buttonColor={MedicalColors.medical}
              style={{ marginTop: 8 }}
              onPress={async () => {
                try {
                  // Envoyer directement au backend sans mapping
                  await dossierAPI.updatePatient(patient.id, {
                    blood_type: editBloodType.trim() || patient.blood_type,
                    allergies: editAllergies.trim() || patient.allergies,
                    chronic_diseases: editChronicDiseases.trim() || patient.chronic_diseases,
                    permanent_treatments: editTreatments.trim() || patient.permanent_treatments,
                  });
                  setEditBloodType('');
                  setEditAllergies('');
                  setEditChronicDiseases('');
                  setEditTreatments('');
                  await useBackendStore.getState().syncPatients();
                  Alert.alert('Succès', 'Infos critiques mises à jour');
                } catch (e: any) {
                  console.error('[CriticalInfo] Error:', e?.message, e?.response?.data);
                  Alert.alert('Erreur', e?.message || 'Échec mise à jour');
                }
              }}
            >
              Enregistrer les infos critiques
            </Button>
          </View>
        </View>
      )}
    </View>
  );

  const renderHistory = () => (
    <View style={styles.tabContent}>
      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Antécédents personnels</Text>
        <Text style={styles.readValue}>{patient.personal_history?.past_illnesses || 'Aucun'}</Text>

        {patient.personal_history?.blood_transfusion && (
          <>
            <Text style={[styles.subLabel, { marginTop: 12 }]}>Transfusion sanguine</Text>
            <Text style={styles.readValue}>Oui{patient.personal_history?.blood_transfusion_date ? ` (${patient.personal_history?.blood_transfusion_date})` : ''}</Text>
          </>
        )}

        {!isReadOnly && (
          <View style={styles.addForm}>
            <Text style={styles.subLabel}>Modifier les antécédents personnels</Text>
            <TextInput
              label="Maladies passées"
              value={editPastIllnesses}
              onChangeText={setEditPastIllnesses}
              mode="outlined"
              dense
              multiline
              style={styles.input}
              placeholder={patient.personal_history?.past_illnesses || 'Aucune'}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />

            <Text style={[styles.subLabel, { marginTop: 8 }]}>Transfusion sanguine</Text>
            <View style={styles.chipRow}>
              <Chip
                selected={editBloodTransfusion === true}
                onPress={() => setEditBloodTransfusion(true)}
                style={[styles.chip, editBloodTransfusion === true && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: editBloodTransfusion === true ? MedicalColors.white : MedicalColors.text }}
              >
                Oui
              </Chip>
              <Chip
                selected={editBloodTransfusion === false}
                onPress={() => setEditBloodTransfusion(false)}
                style={[styles.chip, editBloodTransfusion === false && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: editBloodTransfusion === false ? MedicalColors.white : MedicalColors.text }}
              >
                Non
              </Chip>
            </View>

            {editBloodTransfusion === true && (
              <TextInput
                label="Date de transfusion"
                value={editTransfusionDate}
                onChangeText={setEditTransfusionDate}
                mode="outlined"
                dense
                style={styles.input}
                placeholder="YYYY-MM-DD"
                outlineColor={MedicalColors.border}
                activeOutlineColor={MedicalColors.medical}
              />
            )}

            <Button
              mode="contained"
              buttonColor={MedicalColors.medical}
              style={{ marginTop: 8 }}
              onPress={async () => {
                try {
                  const updatedPersonalHistory = {
                    ...patient.personal_history,
                    ...(editPastIllnesses.trim() && { past_illnesses: editPastIllnesses.trim() }),
                    ...(editBloodTransfusion !== null && { blood_transfusion: editBloodTransfusion }),
                    ...(editBloodTransfusion === true && editTransfusionDate.trim() && { blood_transfusion_date: editTransfusionDate.trim() }),
                  };

                  await dossierAPI.updatePatient(patient.id, {
                    personal_history: updatedPersonalHistory,
                  });

                  setEditPastIllnesses('');
                  setEditBloodTransfusion(null);
                  setEditTransfusionDate('');
                  await useBackendStore.getState().syncPatients();
                  Alert.alert('Succès', 'Antécédents personnels mis à jour');
                } catch (e: any) {
                  console.error('[PersonalHistory] Error:', e?.message, e?.response?.data);
                  Alert.alert('Erreur', e?.message || 'Échec mise à jour');
                }
              }}
            >
              Enregistrer les antécédents personnels
            </Button>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Chirurgies</Text>
        {patient.surgeries?.length === 0 ? (
          <Text style={styles.readValue}>Aucune chirurgie enregistrée</Text>
        ) : (
          patient.surgeries?.map(s => (
            <View key={s.id} style={styles.historyItem}>
              <Text style={styles.historyItemTitle}>{s.nom}</Text>
              <Text style={styles.historyItemSub}>{s.date} {s.hopital ? `— ${s.hopital}` : ''}</Text>
            </View>
          ))
        )}

        {!isReadOnly && (
          <View style={styles.addForm}>
            <TextInput
              label="Nom chirurgie"
              value={surgeryName}
              onChangeText={setSurgeryName}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <TextInput
              label="Date (ex: 2022-03)"
              value={surgeryDate}
              onChangeText={setSurgeryDate}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <TextInput
              label="Hôpital"
              value={surgeryHospital}
              onChangeText={setSurgeryHospital}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <Button
              mode="contained"
              onPress={async () => {
                if (!surgeryName.trim() || !surgeryDate.trim()) return;
                try {
                  await dossierAPI.createSurgery(patient.id, {
                    nom: surgeryName.trim(),
                    date: surgeryDate.trim(),
                    hopital: surgeryHospital.trim() || '',
                    notes: '',
                  });
                  setSurgeryName('');
                  setSurgeryDate('');
                  setSurgeryHospital('');
                  await useBackendStore.getState().syncPatients();
                  Alert.alert('Succès', 'Chirurgie ajoutée');
                } catch (e: any) {
                  console.error('[Surgery]', e?.response?.data || e?.message);
                  Alert.alert('Erreur', JSON.stringify(e?.response?.data) || e?.message);
                }
              }}
              buttonColor={MedicalColors.medical}
              style={{ marginTop: 8 }}
            >
              Ajouter chirurgie
            </Button>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Hospitalisations</Text>
        {patient.hospitalisations?.length === 0 ? (
          <Text style={styles.readValue}>Aucune hospitalisation enregistrée</Text>
        ) : (
          patient.hospitalisations?.map(h => (
            <View key={h.id} style={styles.historyItem}>
              <Text style={styles.historyItemTitle}>{h.motif}</Text>
              <Text style={styles.historyItemSub}>
                {h.date_entree} {h.date_sortie ? `→ ${h.date_sortie}` : ''} {h.hopital ? `— ${h.hopital}` : ''}
              </Text>
            </View>
          ))
        )}

        {!isReadOnly && (
          <View style={styles.addForm}>
            <TextInput
              label="Motif"
              value={hospReason}
              onChangeText={setHospReason}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <TextInput
              label="Date entrée (ex: 2022-03-15)"
              value={hospDateEntree}
              onChangeText={setHospDateEntree}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <TextInput
              label="Date sortie (optionnel)"
              value={hospDateSortie}
              onChangeText={setHospDateSortie}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <TextInput
              label="Hôpital"
              value={hospHopital}
              onChangeText={setHospHopital}
              mode="outlined"
              dense
              style={styles.input}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
            />
            <Button
              mode="contained"
              onPress={async () => {
                if (!hospReason.trim() || !hospDateEntree.trim()) return;
                try {
                  await store.addHospitalisation(patient.id, {
                    reason: hospReason.trim(),
                    date: hospDateEntree.trim(),
                    duration: hospDateSortie.trim() || undefined,
                    hospital: hospHopital.trim() || undefined,
                  });
                  setHospReason('');
                  setHospDateEntree('');
                  setHospDateSortie('');
                  setHospHopital('');
                  await useBackendStore.getState().syncPatients();
                  Alert.alert('Succès', 'Hospitalisation ajoutée');
                } catch (e: any) {
                  console.error('[Hospitalisation] Error:', e?.message, e?.response?.data);
                  Alert.alert('Erreur', e?.message || 'Échec ajout hospitalisation');
                }
              }}
              buttonColor={MedicalColors.medical}
              style={{ marginTop: 8 }}
            >
              Ajouter hospitalisation
            </Button>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Antécédents familiaux</Text>
        {isReadOnly ? (
          <>
            {patient.family_history?.diabetes && <Text style={styles.listItem}>• Diabète</Text>}
            {patient.family_history?.hypertension && <Text style={styles.listItem}>• Hypertension</Text>}
            {patient.family_history?.cancer && <Text style={styles.listItem}>• Cancer</Text>}
            {patient.family_history?.sickleCell && <Text style={styles.listItem}>• Drépanocytose</Text>}
            {patient.family_history?.hereditary && <Text style={styles.listItem}>• Maladies héréditaires</Text>}
            {!patient.family_history?.diabetes && !patient.family_history?.hypertension && !patient.family_history?.cancer && !patient.family_history?.sickleCell && !patient.family_history?.hereditary && (
              <Text style={styles.readValue}>Aucun antécédent familial renseigné</Text>
            )}
          </>
        ) : (
          <View style={styles.chipRow}>
            {([
              ['diabetes', 'Diabète'],
              ['hypertension', 'Hypertension'],
              ['cancer', 'Cancer'],
              ['sickleCell', 'Drépanocytose'],
              ['hereditary', 'Maladies héréditaires']
            ] as const).map(([key, label]) => (
              <Chip
                key={key}
                selected={patient.family_history?.[key] || false}
                onPress={async () => {
                  await store.updateFamilyHistory(patient.id, {
                    [key]: !patient.family_history?.[key]
                  });
                  await useBackendStore.getState().syncPatients();
                }}
                style={[
                  styles.chip,
                  patient.family_history?.[key] && styles.chipSelected
                ]}
                textStyle={{
                  fontSize: 11,
                  color: patient.family_history?.[key] ? MedicalColors.white : MedicalColors.text
                }}
              >
                {label}
              </Chip>
            ))}
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Habitudes de vie</Text>
        {isReadOnly ? (
          <>
            <InfoRow label="Tabac" value={patient.life_habits?.tobacco ? 'Oui' : 'Non'} />
            <InfoRow label="Alcool" value={patient.life_habits?.alcohol ? 'Oui' : 'Non'} />
            <InfoRow label="Activité physique" value={patient.life_habits?.physical_activity || 'Non renseigné'} />
            {patient.life_habits?.specialDiet && <InfoRow label="Régime spécial" value={patient.life_habits?.specialDiet} />}
          </>
        ) : (
          <>
            <Text style={styles.subLabel}>Tabac</Text>
            <View style={styles.chipRow}>
              <Chip
                selected={patient.life_habits?.tobacco === true}
                onPress={async () => {
                  try {
                    await dossierAPI.updatePatient(patient.id, {
                      life_habits: { ...patient.life_habits, tobacco: true }
                    });
                    await useBackendStore.getState().syncPatients();
                  } catch (e: any) {
                    Alert.alert('Erreur', e?.message);
                  }
                }}
                style={[styles.chip, patient.life_habits?.tobacco === true && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: patient.life_habits?.tobacco === true ? MedicalColors.white : MedicalColors.text }}
              >
                Oui
              </Chip>
              <Chip
                selected={patient.life_habits?.tobacco === false}
                onPress={async () => {
                  try {
                    await dossierAPI.updatePatient(patient.id, {
                      life_habits: { ...patient.life_habits, tobacco: false }
                    });
                    await useBackendStore.getState().syncPatients();
                  } catch (e: any) {
                    Alert.alert('Erreur', e?.message);
                  }
                }}
                style={[styles.chip, patient.life_habits?.tobacco === false && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: patient.life_habits?.tobacco === false ? MedicalColors.white : MedicalColors.text }}
              >
                Non
              </Chip>
            </View>

            <Text style={[styles.subLabel, { marginTop: 12 }]}>Alcool</Text>
            <View style={styles.chipRow}>
              <Chip
                selected={patient.life_habits?.alcohol === true}
                onPress={async () => {
                  try {
                    await dossierAPI.updatePatient(patient.id, {
                      life_habits: { ...patient.life_habits, alcohol: true }
                    });
                    await useBackendStore.getState().syncPatients();
                  } catch (e: any) {
                    Alert.alert('Erreur', e?.message);
                  }
                }}
                style={[styles.chip, patient.life_habits?.alcohol === true && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: patient.life_habits?.alcohol === true ? MedicalColors.white : MedicalColors.text }}
              >
                Oui
              </Chip>
              <Chip
                selected={patient.life_habits?.alcohol === false}
                onPress={async () => {
                  try {
                    await dossierAPI.updatePatient(patient.id, {
                      life_habits: { ...patient.life_habits, alcohol: false }
                    });
                    await useBackendStore.getState().syncPatients();
                  } catch (e: any) {
                    Alert.alert('Erreur', e?.message);
                  }
                }}
                style={[styles.chip, patient.life_habits?.alcohol === false && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: patient.life_habits?.alcohol === false ? MedicalColors.white : MedicalColors.text }}
              >
                Non
              </Chip>
            </View>

            <Text style={[styles.subLabel, { marginTop: 12 }]}>Activité physique</Text>
            <View style={styles.chipRow}>
              {(['sedentaire', 'moderee', 'active'] as const).map(level => (
                <Chip
                  key={level}
                  selected={patient.life_habits?.physical_activity === level}
                  onPress={async () => {
                    try {
                      await dossierAPI.updatePatient(patient.id, {
                        life_habits: { ...patient.life_habits, physical_activity: level }
                      });
                      await useBackendStore.getState().syncPatients();
                    } catch (e: any) {
                      Alert.alert('Erreur', e?.message);
                    }
                  }}
                  style={[styles.chip, patient.life_habits?.physical_activity === level && styles.chipSelected]}
                  textStyle={{ fontSize: 12, color: patient.life_habits?.physical_activity === level ? MedicalColors.white : MedicalColors.text }}
                >
                  {level === 'sedentaire' ? 'Sédentaire' : level === 'moderee' ? 'Modérée' : 'Active'}
                </Chip>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderConsultations = () => (
    <View style={styles.tabContent}>
      {user?.role === 'medecin' && (
        <Button
          mode="contained"
          onPress={() => router.push({ pathname: '/(tabs)/dossier/new-consultation', params: { patientId: patient.id } })}
          buttonColor={MedicalColors.medical}
          icon={() => <Plus size={18} color={MedicalColors.white} />}
          style={styles.addBtn}
        >
          Nouvelle consultation
        </Button>
      )}
      {patient.consultations?.length === 0 ? (
        <View style={styles.emptySection}>
          <Stethoscope size={32} color={MedicalColors.border} />
          <Text style={styles.emptySectionText}>Aucune consultation</Text>
        </View>
      ) : (
        patient.consultations?.map(c => (
          <View key={c.id} style={styles.consultCard}>
            <View style={styles.consultHeader}>
              <Text style={styles.consultDate}>{new Date(c.date).toLocaleDateString('fr-FR')}</Text>
            </View>
            <Text style={styles.consultDiag}>{c.diagnostic}</Text>
            <Text style={styles.consultReason}>Motif : {c.motif}</Text>
            {c.traitement && <Text style={styles.consultTreatment}>Traitement : {c.traitement}</Text>}
            {c.poids && <Text style={styles.consultVital}>Poids : {c.poids} kg</Text>}
            {c.tension_systolique && <Text style={styles.consultVital}>TA : {c.tension_systolique}/{c.tension_diastolique}</Text>}
          </View>
        ))
      )}
    </View>
  );

  const renderExams = () => {
    // Examens dans consultations
    const consultationLabTests = patient.consultations?.flatMap(
      c => (c.lab_tests || []).map(lt => ({ ...lt, source: 'consultation' }))
    ) || [];

    // Examens standalone (créés via addLabTestDirect)
    const standaloneLabTests = (patient.lab_tests || []).map(
      lt => ({ ...lt, source: 'standalone' })
    );

    const allLabTests = [...consultationLabTests, ...standaloneLabTests];

    // Trier par date décroissante
    allLabTests.sort((a, b) =>
      new Date(b.ordered_date || b.completed_date || '').getTime() -
      new Date(a.ordered_date || a.completed_date || '').getTime()
    );

    return (
      <View style={styles.tabContent}>
        {user?.role === 'medecin' && (
          <Button
            mode="contained"
            onPress={() => router.push({
              pathname: '/(tabs)/dossier/new-lab-result',
              params: { patientId: patient.id }
            })}
            buttonColor={MedicalColors.medical}
            icon={() => <Plus size={18} color={MedicalColors.white} />}
            style={styles.addBtn}
          >
            Nouveau résultat d'examen
          </Button>
        )}
        {allLabTests.length === 0 ? (
          <View style={styles.emptySection}>
            <FlaskConical size={32} color={MedicalColors.border} />
            <Text style={styles.emptySectionText}>Aucun résultat d'examen</Text>
          </View>
        ) : (
          allLabTests.map(r => (
            <View key={r.id} style={styles.examCard}>
              <Text style={styles.examType}>{r.test_name}</Text>
              <Text style={styles.examDate}>
                {r.ordered_date ? new Date(r.ordered_date).toLocaleDateString('fr-FR') : ''}
              </Text>
              <Text style={styles.examResult}>Résultat : {r.results || 'En attente'}</Text>
              {r.interpretation && (
                <Text style={styles.examInterp}>{r.interpretation}</Text>
              )}
              <Text style={styles.examStatus}>Statut : {r.status}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderVaccines = () => (
    <View style={styles.tabContent}>
      {user?.role === 'medecin' && (
        <Button
          mode="contained"
          onPress={() => router.push({ pathname: '/(tabs)/dossier/new-vaccine', params: { patientId: patient.id } })}
          buttonColor={MedicalColors.medical}
          icon={() => <Plus size={18} color={MedicalColors.white} />}
          style={styles.addBtn}
        >
          Nouveau vaccin
        </Button>
      )}
      {patient.vaccines?.length === 0 ? (
        <View style={styles.emptySection}>
          <Syringe size={32} color={MedicalColors.border} />
          <Text style={styles.emptySectionText}>Aucun vaccin enregistré</Text>
        </View>
      ) : (
        patient.vaccines?.map(v => (
          <View key={v.id} style={styles.vaccineCard}>
            <View style={styles.vaccineInfo}>
              <Text style={styles.vaccineName}>{v.vaccine_name}</Text>
              <Text style={styles.vaccineDate}>
                {v.date_administered ? new Date(v.date_administered).toLocaleDateString('fr-FR') : 'Non programmé'}
              </Text>
              <Text style={styles.vaccineDose}>Dose {v.dose_number}</Text>
              {v.notes && <Text style={styles.vaccineNotes}>{v.notes}</Text>}
            </View>
            <Text style={styles.vaccineStatusText}>✅</Text>
          </View>
        ))
      )}
    </View>
  );

  const tabIcons = [User, Stethoscope, History, Stethoscope, FlaskConical, Syringe];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab, i) => {
          const Icon = tabIcons[i];
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === i && styles.tabItemActive]}
              onPress={() => setActiveTab(i)}
            >
              <Icon size={16} color={activeTab === i ? MedicalColors.medical : MedicalColors.textSecondary} />
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 0 && renderIdentity()}
        {activeTab === 1 && renderCriticalInfo()}
        {activeTab === 2 && renderHistory()}
        {activeTab === 3 && renderConsultations()}
        {activeTab === 4 && renderExams()}
        {activeTab === 5 && renderVaccines()}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: MedicalColors.background },
  label: { fontSize: 13, color: MedicalColors.textSecondary },
  value: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, maxWidth: '55%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: MedicalColors.textSecondary },
  tabBar: { maxHeight: 52, backgroundColor: MedicalColors.white, borderBottomWidth: 1, borderBottomColor: MedicalColors.border },
  tabBarContent: { paddingHorizontal: 8, alignItems: 'center' },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: MedicalColors.medical },
  tabText: { fontSize: 12, color: MedicalColors.textSecondary, fontWeight: '500' as const },
  tabTextActive: { color: MedicalColors.medical, fontWeight: '600' as const },
  scrollContent: { flex: 1 },
  tabContent: { padding: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: MedicalColors.medicalLight, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 22, fontWeight: '700' as const, color: MedicalColors.medical },
  profileName: { fontSize: 20, fontWeight: '700' as const, color: MedicalColors.text },
  profileDossier: { fontSize: 13, color: MedicalColors.textSecondary, fontFamily: 'monospace', marginTop: 2 },
  profileAge: { fontSize: 13, color: MedicalColors.textSecondary, marginTop: 2 },
  infoGrid: { backgroundColor: MedicalColors.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: MedicalColors.border },
  contactsSection: { marginTop: 16 },
  subSectionTitle: { fontSize: 14, fontWeight: '700' as const, color: MedicalColors.text, marginBottom: 10 },
  contactCard: { backgroundColor: MedicalColors.white, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: MedicalColors.border },
  contactName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  contactDetail: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  fieldGroup: { backgroundColor: MedicalColors.white, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: MedicalColors.border },
  readValue: { fontSize: 14, color: MedicalColors.text, lineHeight: 20 },
  subLabel: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.textSecondary, marginTop: 10, marginBottom: 4 },
  addForm: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: MedicalColors.border,
    gap: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { backgroundColor: MedicalColors.background },
  chipSelected: { backgroundColor: MedicalColors.medical },
  input: { marginBottom: 4 },
  historyItem: { backgroundColor: MedicalColors.background, borderRadius: 8, padding: 10, marginBottom: 6 },
  historyItemTitle: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  historyItemSub: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  listItem: { fontSize: 13, color: MedicalColors.text, paddingVertical: 2 },
  emptySection: { alignItems: 'center', paddingVertical: 40 },
  emptySectionText: { fontSize: 14, color: MedicalColors.textSecondary, marginTop: 8 },
  addBtn: { borderRadius: 8, marginBottom: 16 },
  consultCard: { backgroundColor: MedicalColors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: MedicalColors.border },
  consultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  consultDate: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.medical },
  consultDiag: { fontSize: 15, fontWeight: '600' as const, color: MedicalColors.text },
  consultReason: { fontSize: 13, color: MedicalColors.textSecondary, marginTop: 4 },
  consultTreatment: { fontSize: 13, color: MedicalColors.text, marginTop: 4 },
  consultVital: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  examCard: { backgroundColor: MedicalColors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: MedicalColors.border },
  examType: { fontSize: 15, fontWeight: '600' as const, color: MedicalColors.text },
  examDate: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  examResult: { fontSize: 13, color: MedicalColors.text, marginTop: 6 },
  examInterp: { fontSize: 12, color: MedicalColors.life, marginTop: 2, fontStyle: 'italic' },
  examStatus: { fontSize: 11, color: MedicalColors.textSecondary, marginTop: 4 },
  vaccineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MedicalColors.white, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: MedicalColors.border },
  vaccineInfo: { flex: 1 },
  vaccineName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  vaccineDate: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  vaccineDose: { fontSize: 11, color: MedicalColors.medical, marginTop: 2 },
  vaccineNotes: { fontSize: 11, color: MedicalColors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  vaccineStatusText: { fontSize: 18 },
});
