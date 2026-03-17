import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { useAuthStore } from '@/store/authStore';
import {
  User, History, Stethoscope, FlaskConical, Syringe,
  Plus, Shield
} from 'lucide-react-native';
import type { BloodGroup, AllergySeverity, Surgery, Hospitalization } from '@/types/medical';

const TABS = ['Identité', 'Infos critiques', 'Antécédents', 'Consultations', 'Examens', 'Vaccins'];
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CHRONIC_OPTIONS = ['Diabète', 'Hypertension', 'Asthme', 'Drépanocytose', 'VIH', 'Insuffisance rénale', 'Épilepsie'];

export default function PatientRecordScreen() {
  const { patientId, readOnly: readOnlyParam } = useLocalSearchParams<{ patientId: string; readOnly?: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const store = useMedicalStore();
  const [activeTab, setActiveTab] = useState(0);
  const isReadOnly = readOnlyParam === 'true' || user?.role === 'patient';

  const patient = useMemo(() => {
    if (!patientId) return null;
    return store.getPatientById(patientId);
  }, [patientId, store]);

  const [allergyName, setAllergyName] = useState('');

  const [pastIllnesses, setPastIllnesses] = useState(patient?.personalHistory.pastIllnesses || '');
  const [surgeryName, setSurgeryName] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [surgeryHospital, setSurgeryHospital] = useState('');
  const [hospReason, setHospReason] = useState('');
  const [hospDate, setHospDate] = useState('');
  const [hospDuration, setHospDuration] = useState('');
  const [hospHospital, setHospHospital] = useState('');
  const [transfusionDate, setTransfusionDate] = useState(patient?.personalHistory.bloodTransfusionDate || '');
  const [tobaccoQty, setTobaccoQty] = useState(patient?.lifeHabits.tobaccoQuantity || '');
  const [specialDiet, setSpecialDiet] = useState(patient?.lifeHabits.specialDiet || '');
  const [allergySeverity, setAllergySeverity] = useState<AllergySeverity>('legere');
  const [allergyType, setAllergyType] = useState<'medicament' | 'alimentaire'>('medicament');

  const handleAddSurgery = useCallback(() => {
    if (!surgeryName.trim() || !surgeryDate.trim() || !patientId) return;
    const current = patient?.personalHistory;
    if (!current) return;
    const newSurgery: Surgery = { id: Date.now().toString(), name: surgeryName.trim(), date: surgeryDate.trim(), hospital: surgeryHospital.trim() || undefined };
    store.updatePersonalHistory(patientId, { surgeries: [...current.surgeries, newSurgery] });
    setSurgeryName('');
    setSurgeryDate('');
    setSurgeryHospital('');
  }, [surgeryName, surgeryDate, surgeryHospital, patientId, patient, store]);

  const handleAddHospitalization = useCallback(() => {
    if (!hospReason.trim() || !hospDate.trim() || !patientId) return;
    const current = patient?.personalHistory;
    if (!current) return;
    const newHosp: Hospitalization = { id: Date.now().toString(), reason: hospReason.trim(), date: hospDate.trim(), duration: hospDuration.trim() || undefined, hospital: hospHospital.trim() || undefined };
    store.updatePersonalHistory(patientId, { hospitalizations: [...current.hospitalizations, newHosp] });
    setHospReason('');
    setHospDate('');
    setHospDuration('');
    setHospHospital('');
  }, [hospReason, hospDate, hospDuration, hospHospital, patientId, patient, store]);

  const handleAddAllergy = useCallback(() => {
    if (!allergyName.trim() || !patientId) return;
    const current = patient?.criticalInfo;
    if (!current) return;
    const newAllergy = { id: Date.now().toString(), name: allergyName.trim(), type: allergyType, severity: allergySeverity };
    if (allergyType === 'medicament') {
      store.updateCriticalInfo(patientId, { drugAllergies: [...current.drugAllergies, newAllergy] });
    } else {
      store.updateCriticalInfo(patientId, { foodAllergies: [...current.foodAllergies, newAllergy] });
    }
    setAllergyName('');
  }, [allergyName, allergyType, allergySeverity, patientId, patient, store]);

  const toggleChronic = useCallback((disease: string) => {
    if (!patientId || !patient) return;
    const current = patient.criticalInfo?.chronicDiseases || [];
    const updated = current.includes(disease)
      ? current.filter(d => d !== disease)
      : [...current, disease];
    store.updateCriticalInfo(patientId, { chronicDiseases: updated });
  }, [patientId, patient, store]);

  if (!patient) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Patient non trouvé</Text>
      </View>
    );
  }

  const age = patient.identity.birthDate
    ? Math.floor((Date.now() - new Date(patient.identity.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const renderIdentity = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {patient.identity.firstName.charAt(0)}{patient.identity.lastName.charAt(0)}
          </Text>
        </View>
        <View>
          <Text style={styles.profileName}>{patient.identity.lastName} {patient.identity.firstName}</Text>
          <Text style={styles.profileDossier}>{patient.identity.dossierNumber}</Text>
          {age !== null && <Text style={styles.profileAge}>{age} ans • {patient.identity.sex === 'M' ? 'Masculin' : patient.identity.sex === 'F' ? 'Féminin' : ''}</Text>}
        </View>
      </View>
      <View style={styles.infoGrid}>
        <InfoRow label="Téléphone" value={patient.identity.phone || 'Non renseigné'} />
        <InfoRow label="Adresse" value={patient.identity.address || 'Non renseigné'} />
        <InfoRow label="Commune" value={patient.identity.commune || 'Non renseigné'} />
        <InfoRow label="Préfecture" value={patient.identity.prefecture || 'Non renseigné'} />
      </View>
      {patient.identity.emergencyContacts?.length > 0 && (
        <View style={styles.contactsSection}>
          <Text style={styles.subSectionTitle}>Contacts d'urgence</Text>
          {patient.identity.emergencyContacts?.map(c => (
            <View key={c.id} style={styles.contactCard}>
              <Text style={styles.contactName}>{c.fullName}</Text>
              <Text style={styles.contactDetail}>{c.relationship} • {c.phoneNumber}</Text>
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
        {isReadOnly ? (
          <Text style={styles.readValue}>{patient.criticalInfo.bloodGroup || 'Non renseigné'} {patient.criticalInfo.rhFactor ? `(Rh ${patient.criticalInfo.rhFactor})` : ''}</Text>
        ) : (
          <View style={styles.chipRow}>
            {BLOOD_GROUPS.map(bg => (
              <Chip
                key={bg}
                selected={patient.criticalInfo.bloodGroup === bg}
                onPress={() => store.updateCriticalInfo(patientId!, { bloodGroup: bg })}
                style={[styles.chip, patient.criticalInfo.bloodGroup === bg && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: patient.criticalInfo.bloodGroup === bg ? MedicalColors.white : MedicalColors.text }}
              >
                {bg}
              </Chip>
            ))}
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Allergies médicamenteuses</Text>
        {patient.criticalInfo.drugAllergies?.map(a => (
          <View key={a.id} style={[styles.allergyBadge, a.severity === 'anaphylaxie' ? styles.allergyDanger : a.severity === 'severe' ? styles.allergyWarn : styles.allergyMild]}>
            <Text style={styles.allergyText}>{a.name} — {a.severity}</Text>
          </View>
        ))}
        {patient.criticalInfo.foodAllergies?.length || 0 > 0 && (
          <>
            <Text style={[styles.subSectionTitle, { marginTop: 12 }]}>Allergies alimentaires</Text>
            {patient.criticalInfo.foodAllergies?.map(a => (
              <View key={a.id} style={[styles.allergyBadge, styles.allergyMild]}>
                <Text style={styles.allergyText}>{a.name}</Text>
              </View>
            ))}
          </>
        )}
        {!isReadOnly && (
          <View style={styles.addAllergyForm}>
            <TextInput label="Nom allergie" value={allergyName} onChangeText={setAllergyName} mode="outlined" dense style={styles.inputSmall} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
            <View style={styles.chipRow}>
              {(['medicament', 'alimentaire'] as const).map(t => (
                <Chip key={t} selected={allergyType === t} onPress={() => setAllergyType(t)} style={styles.chipSmall}>
                  {t === 'medicament' ? 'Médicament' : 'Alimentaire'}
                </Chip>
              ))}
            </View>
            <View style={styles.chipRow}>
              {(['legere', 'severe', 'anaphylaxie'] as const).map(s => (
                <Chip key={s} selected={allergySeverity === s} onPress={() => setAllergySeverity(s)} style={styles.chipSmall}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Chip>
              ))}
            </View>
            <Button mode="contained" onPress={handleAddAllergy} compact buttonColor={MedicalColors.medical} style={styles.addBtn}>
              Ajouter allergie
            </Button>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Maladies chroniques actives</Text>
        {isReadOnly ? (
          <View style={styles.chipRow}>
            {patient.criticalInfo.chronicDiseases?.map(d => (
              <Chip key={d} style={styles.chipActive} textStyle={{ color: MedicalColors.white, fontSize: 12 }}>{d}</Chip>
            ))}
            {patient.criticalInfo.chronicDiseases?.length || 0 === 0 && <Text style={styles.readValue}>Aucune</Text>}
          </View>
        ) : (
          <View style={styles.chipRow}>
            {CHRONIC_OPTIONS.map(d => (
              <Chip
                key={d}
                selected={patient.criticalInfo.chronicDiseases?.includes(d)}
                onPress={() => toggleChronic(d)}
                style={[styles.chip, patient.criticalInfo.chronicDiseases?.includes(d) && styles.chipSelected]}
                textStyle={{ fontSize: 11, color: patient.criticalInfo.chronicDiseases?.includes(d) ? MedicalColors.white : MedicalColors.text }}
              >
                {d}
              </Chip>
            ))}
          </View>
        )}
      </View>

      {patient.criticalInfo.permanentTreatments?.length || 0 > 0 && (
        <View style={styles.fieldGroup}>
          <Text style={styles.subSectionTitle}>Traitements permanents</Text>
          {patient.criticalInfo.permanentTreatments?.map(t => (
            <View key={t.id} style={styles.treatmentCard}>
              <Text style={styles.treatmentName}>{t.medication}</Text>
              <Text style={styles.treatmentDetail}>{t.dosage} — {t.frequency}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderHistory = () => (
    <View style={styles.tabContent}>
      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Antécédents personnels</Text>

        <Text style={styles.subLabel}>Maladies passées</Text>
        {isReadOnly ? (
          <Text style={styles.readValue}>{patient.personalHistory.pastIllnesses || 'Aucune'}</Text>
        ) : (
          <View style={styles.editRow}>
            <TextInput
              label="Maladies passées"
              value={pastIllnesses}
              onChangeText={setPastIllnesses}
              mode="outlined"
              dense
              style={styles.inputSmall}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
              onBlur={() => {
                if (patientId) store.updatePersonalHistory(patientId, { pastIllnesses: pastIllnesses.trim() || undefined });
              }}
            />
          </View>
        )}

        <Text style={[styles.subLabel, { marginTop: 12 }]}>Transfusion sanguine</Text>
        {isReadOnly ? (
          <Text style={styles.readValue}>{patient.personalHistory.bloodTransfusion ? `Oui${patient.personalHistory.bloodTransfusionDate ? ` (${patient.personalHistory.bloodTransfusionDate})` : ''}` : 'Non'}</Text>
        ) : (
          <View>
            <View style={styles.chipRow}>
              <Chip
                selected={patient.personalHistory.bloodTransfusion}
                onPress={() => store.updatePersonalHistory(patientId!, { bloodTransfusion: true })}
                style={[styles.chip, patient.personalHistory.bloodTransfusion && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: patient.personalHistory.bloodTransfusion ? MedicalColors.white : MedicalColors.text }}
              >Oui</Chip>
              <Chip
                selected={!patient.personalHistory.bloodTransfusion}
                onPress={() => store.updatePersonalHistory(patientId!, { bloodTransfusion: false, bloodTransfusionDate: undefined })}
                style={[styles.chip, !patient.personalHistory.bloodTransfusion && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: !patient.personalHistory.bloodTransfusion ? MedicalColors.white : MedicalColors.text }}
              >Non</Chip>
            </View>
            {patient.personalHistory.bloodTransfusion && (
              <TextInput
                label="Date de transfusion"
                value={transfusionDate}
                onChangeText={setTransfusionDate}
                placeholder="ex: 2023-06"
                mode="outlined"
                dense
                style={[styles.inputSmall, { marginTop: 8 }]}
                outlineColor={MedicalColors.border}
                activeOutlineColor={MedicalColors.medical}
                onBlur={() => {
                  if (patientId) store.updatePersonalHistory(patientId, { bloodTransfusionDate: transfusionDate.trim() || undefined });
                }}
              />
            )}
          </View>
        )}

        <Text style={[styles.subLabel, { marginTop: 14 }]}>Chirurgies</Text>
        {patient.personalHistory.surgeries.map(s => (
          <View key={s.id} style={styles.historyItem}>
            <Text style={styles.historyItemTitle}>{s.name}</Text>
            <Text style={styles.historyItemSub}>{s.date}{s.hospital ? ` — ${s.hospital}` : ''}</Text>
          </View>
        ))}
        {patient.personalHistory.surgeries.length === 0 && <Text style={styles.readValue}>Aucune</Text>}
        {!isReadOnly && (
          <View style={styles.addHistoryForm}>
            <TextInput label="Nom chirurgie" value={surgeryName} onChangeText={setSurgeryName} mode="outlined" dense style={styles.inputSmall} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
            <View style={styles.rowInputs}>
              <TextInput label="Date" value={surgeryDate} onChangeText={setSurgeryDate} placeholder="ex: 2022-03" mode="outlined" dense style={[styles.inputSmall, styles.halfInput]} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
              <TextInput label="Hôpital" value={surgeryHospital} onChangeText={setSurgeryHospital} mode="outlined" dense style={[styles.inputSmall, styles.halfInput]} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
            </View>
            <Button mode="contained" onPress={handleAddSurgery} compact buttonColor={MedicalColors.medical} style={styles.addBtnSmall} labelStyle={styles.addBtnLabel}>
              Ajouter chirurgie
            </Button>
          </View>
        )}

        <Text style={[styles.subLabel, { marginTop: 14 }]}>Hospitalisations</Text>
        {patient.personalHistory.hospitalizations.map(h => (
          <View key={h.id} style={styles.historyItem}>
            <Text style={styles.historyItemTitle}>{h.reason}</Text>
            <Text style={styles.historyItemSub}>{h.date}{h.hospital ? ` — ${h.hospital}` : ''}{h.duration ? ` (${h.duration})` : ''}</Text>
          </View>
        ))}
        {patient.personalHistory.hospitalizations.length === 0 && <Text style={styles.readValue}>Aucune</Text>}
        {!isReadOnly && (
          <View style={styles.addHistoryForm}>
            <TextInput label="Motif" value={hospReason} onChangeText={setHospReason} mode="outlined" dense style={styles.inputSmall} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
            <View style={styles.rowInputs}>
              <TextInput label="Date" value={hospDate} onChangeText={setHospDate} placeholder="ex: 2021-08" mode="outlined" dense style={[styles.inputSmall, styles.halfInput]} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
              <TextInput label="Durée" value={hospDuration} onChangeText={setHospDuration} placeholder="ex: 5 jours" mode="outlined" dense style={[styles.inputSmall, styles.halfInput]} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
            </View>
            <TextInput label="Hôpital" value={hospHospital} onChangeText={setHospHospital} mode="outlined" dense style={styles.inputSmall} outlineColor={MedicalColors.border} activeOutlineColor={MedicalColors.medical} />
            <Button mode="contained" onPress={handleAddHospitalization} compact buttonColor={MedicalColors.medical} style={styles.addBtnSmall} labelStyle={styles.addBtnLabel}>
              Ajouter hospitalisation
            </Button>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.subSectionTitle}>Antécédents familiaux</Text>
        {isReadOnly ? (
          <View style={styles.chipRow}>
            {patient.familyHistory.diabetes && <Chip style={styles.chipActive} textStyle={styles.chipActiveText}>Diabète</Chip>}
            {patient.familyHistory.hypertension && <Chip style={styles.chipActive} textStyle={styles.chipActiveText}>Hypertension</Chip>}
            {patient.familyHistory.cancer && <Chip style={styles.chipActive} textStyle={styles.chipActiveText}>Cancer</Chip>}
            {patient.familyHistory.sickleCell && <Chip style={styles.chipActive} textStyle={styles.chipActiveText}>Drépanocytose</Chip>}
            {patient.familyHistory.hereditary && <Chip style={styles.chipActive} textStyle={styles.chipActiveText}>Maladies héréditaires</Chip>}
            {!patient.familyHistory.diabetes && !patient.familyHistory.hypertension && !patient.familyHistory.cancer && !patient.familyHistory.sickleCell && !patient.familyHistory.hereditary && <Text style={styles.readValue}>Aucun antécédent familial renseigné</Text>}
          </View>
        ) : (
          <View style={styles.chipRow}>
            {([['diabetes', 'Diabète'], ['hypertension', 'Hypertension'], ['cancer', 'Cancer'], ['sickleCell', 'Drépanocytose'], ['hereditary', 'Maladies héréditaires']] as const).map(([key, label]) => (
              <Chip
                key={key}
                selected={patient.familyHistory[key]}
                onPress={() => store.updateFamilyHistory(patientId!, { [key]: !patient.familyHistory[key] })}
                style={[styles.chip, patient.familyHistory[key] && styles.chipSelected]}
                textStyle={{ fontSize: 11, color: patient.familyHistory[key] ? MedicalColors.white : MedicalColors.text }}
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
            <InfoRow label="Tabac" value={patient.lifeHabits.tobacco ? `Oui${patient.lifeHabits.tobaccoQuantity ? ` (${patient.lifeHabits.tobaccoQuantity})` : ''}` : 'Non'} />
            <InfoRow label="Alcool" value={patient.lifeHabits.alcohol ? 'Oui' : 'Non'} />
            <InfoRow label="Activité physique" value={patient.lifeHabits.physicalActivity === 'sedentaire' ? 'Sédentaire' : patient.lifeHabits.physicalActivity === 'moderee' ? 'Modérée' : 'Active'} />
            {patient.lifeHabits.specialDiet && <InfoRow label="Régime spécial" value={patient.lifeHabits.specialDiet} />}
          </>
        ) : (
          <>
            <Text style={styles.subLabel}>Tabac</Text>
            <View style={styles.chipRow}>
              <Chip
                selected={patient.lifeHabits.tobacco}
                onPress={() => store.updateLifeHabits(patientId!, { tobacco: true })}
                style={[styles.chip, patient.lifeHabits.tobacco && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: patient.lifeHabits.tobacco ? MedicalColors.white : MedicalColors.text }}
              >Oui</Chip>
              <Chip
                selected={!patient.lifeHabits.tobacco}
                onPress={() => store.updateLifeHabits(patientId!, { tobacco: false, tobaccoQuantity: undefined })}
                style={[styles.chip, !patient.lifeHabits.tobacco && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: !patient.lifeHabits.tobacco ? MedicalColors.white : MedicalColors.text }}
              >Non</Chip>
            </View>
            {patient.lifeHabits.tobacco && (
              <TextInput
                label="Quantité"
                value={tobaccoQty}
                onChangeText={setTobaccoQty}
                placeholder="ex: 10 cigarettes/jour"
                mode="outlined"
                dense
                style={[styles.inputSmall, { marginTop: 6 }]}
                outlineColor={MedicalColors.border}
                activeOutlineColor={MedicalColors.medical}
                onBlur={() => {
                  if (patientId) store.updateLifeHabits(patientId, { tobaccoQuantity: tobaccoQty.trim() || undefined });
                }}
              />
            )}

            <Text style={[styles.subLabel, { marginTop: 12 }]}>Alcool</Text>
            <View style={styles.chipRow}>
              <Chip
                selected={patient.lifeHabits.alcohol}
                onPress={() => store.updateLifeHabits(patientId!, { alcohol: true })}
                style={[styles.chip, patient.lifeHabits.alcohol && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: patient.lifeHabits.alcohol ? MedicalColors.white : MedicalColors.text }}
              >Oui</Chip>
              <Chip
                selected={!patient.lifeHabits.alcohol}
                onPress={() => store.updateLifeHabits(patientId!, { alcohol: false })}
                style={[styles.chip, !patient.lifeHabits.alcohol && styles.chipSelected]}
                textStyle={{ fontSize: 12, color: !patient.lifeHabits.alcohol ? MedicalColors.white : MedicalColors.text }}
              >Non</Chip>
            </View>

            <Text style={[styles.subLabel, { marginTop: 12 }]}>Activité physique</Text>
            <View style={styles.chipRow}>
              {(['sedentaire', 'moderee', 'active'] as const).map(level => (
                <Chip
                  key={level}
                  selected={patient.lifeHabits.physicalActivity === level}
                  onPress={() => store.updateLifeHabits(patientId!, { physicalActivity: level })}
                  style={[styles.chip, patient.lifeHabits.physicalActivity === level && styles.chipSelected]}
                  textStyle={{ fontSize: 12, color: patient.lifeHabits.physicalActivity === level ? MedicalColors.white : MedicalColors.text }}
                >
                  {level === 'sedentaire' ? 'Sédentaire' : level === 'moderee' ? 'Modérée' : 'Active'}
                </Chip>
              ))}
            </View>

            <TextInput
              label="Régime spécial"
              value={specialDiet}
              onChangeText={setSpecialDiet}
              placeholder="ex: sans gluten, végétarien..."
              mode="outlined"
              dense
              style={[styles.inputSmall, { marginTop: 12 }]}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
              onBlur={() => {
                if (patientId) store.updateLifeHabits(patientId, { specialDiet: specialDiet.trim() || undefined });
              }}
            />
          </>
        )}
      </View>
    </View>
  );

  const renderConsultations = () => (
    <View style={styles.tabContent}>
      {!isReadOnly && (
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
              <Text style={styles.consultDoctor}>Dr. {c.doctorName}</Text>
            </View>
            <Text style={styles.consultDiag}>{c.mainDiagnosis}</Text>
            <Text style={styles.consultReason}>{c.reason}</Text>
            {c.prescriptions?.length > 0 && (
              <View style={styles.prescBadge}>
                <Text style={styles.prescBadgeText}>{c.prescriptions?.length} médicament(s) prescrit(s)</Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  const renderExams = () => (
    <View style={styles.tabContent}>
      {!isReadOnly && (
        <Button
          mode="contained"
          onPress={() => router.push({ pathname: '/(tabs)/dossier/new-lab-result', params: { patientId: patient.id } })}
          buttonColor={MedicalColors.medical}
          icon={() => <Plus size={18} color={MedicalColors.white} />}
          style={styles.addBtn}
        >
          Nouveau résultat d'examen
        </Button>
      )}
      {patient.labResults?.length === 0 ? (
        <View style={styles.emptySection}>
          <FlaskConical size={32} color={MedicalColors.border} />
          <Text style={styles.emptySectionText}>Aucun résultat d'examen</Text>
        </View>
      ) : (
        patient.labResults?.map(r => (
          <View key={r.id} style={styles.examCard}>
            <Text style={styles.examType}>{r.examType}</Text>
            <Text style={styles.examDate}>{new Date(r.date).toLocaleDateString('fr-FR')} — {r.facility}</Text>
            <Text style={styles.examResult}>Résultat : {r.result} {r.unit || ''}</Text>
            {r.interpretation && <Text style={styles.examInterp}>{r.interpretation}</Text>}
          </View>
        ))
      )}
    </View>
  );

  const renderVaccines = () => (
    <View style={styles.tabContent}>
      {!isReadOnly && (
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
            <View style={[styles.vaccineStatus, v.status === 'fait' ? styles.statusDone : v.status === 'en_retard' ? styles.statusLate : styles.statusPending]} />
            <View style={styles.vaccineInfo}>
              <Text style={styles.vaccineName}>{v.name}</Text>
              <Text style={styles.vaccineDate}>{v.date ? new Date(v.date).toLocaleDateString('fr-FR') : 'Non programmé'}</Text>
            </View>
            <Text style={styles.vaccineStatusText}>
              {v.status === 'fait' ? '✅' : v.status === 'en_retard' ? '⚠️' : '⏳'}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const tabIcons = [User, Shield, History, Stethoscope, FlaskConical, Syringe];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
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

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {activeTab === 0 && renderIdentity()}
        {activeTab === 1 && renderCriticalInfo()}
        {activeTab === 2 && renderHistory()}
        {activeTab === 3 && renderConsultations()}
        {activeTab === 4 && renderExams()}
        {activeTab === 5 && renderVaccines()}
      </ScrollView>
    </KeyboardAvoidingView>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: MedicalColors.background },
  chipSelected: { backgroundColor: MedicalColors.medical },
  chipActive: { backgroundColor: MedicalColors.medical },
  chipActiveText: { color: MedicalColors.white, fontSize: 12 },
  chipSmall: { marginVertical: 4 },
  readValue: { fontSize: 14, color: MedicalColors.text },
  allergyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 6 },
  allergyDanger: { backgroundColor: '#FFEBEE' },
  allergyWarn: { backgroundColor: '#FFF3E0' },
  allergyMild: { backgroundColor: '#E8F5E9' },
  allergyText: { fontSize: 13, color: MedicalColors.text },
  addAllergyForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: MedicalColors.border },
  inputSmall: { marginBottom: 8, backgroundColor: MedicalColors.white },
  addBtn: { borderRadius: 8, marginBottom: 16 },
  addBtnSmall: { borderRadius: 8, marginTop: 10 },
  addBtnLabel: { fontSize: 12 },
  editRow: { marginBottom: 4 },
  rowInputs: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  addHistoryForm: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: MedicalColors.border },
  historyItem: { backgroundColor: MedicalColors.background, borderRadius: 8, padding: 10, marginBottom: 6 },
  historyItemTitle: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  historyItemSub: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  treatmentCard: { backgroundColor: MedicalColors.background, borderRadius: 8, padding: 10, marginBottom: 6 },
  treatmentName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  treatmentDetail: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  subLabel: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.textSecondary, marginTop: 10, marginBottom: 4 },
  listItem: { fontSize: 13, color: MedicalColors.text, paddingVertical: 2 },
  emptySection: { alignItems: 'center', paddingVertical: 40 },
  emptySectionText: { fontSize: 14, color: MedicalColors.textSecondary, marginTop: 8 },
  consultCard: { backgroundColor: MedicalColors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: MedicalColors.border },
  consultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  consultDate: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.medical },
  consultDoctor: { fontSize: 12, color: MedicalColors.textSecondary },
  consultDiag: { fontSize: 15, fontWeight: '600' as const, color: MedicalColors.text },
  consultReason: { fontSize: 13, color: MedicalColors.textSecondary, marginTop: 4 },
  prescBadge: { marginTop: 8, backgroundColor: MedicalColors.lifeLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  prescBadgeText: { fontSize: 11, color: MedicalColors.life, fontWeight: '600' as const },
  examCard: { backgroundColor: MedicalColors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: MedicalColors.border },
  examType: { fontSize: 15, fontWeight: '600' as const, color: MedicalColors.text },
  examDate: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  examResult: { fontSize: 13, color: MedicalColors.text, marginTop: 6 },
  examInterp: { fontSize: 12, color: MedicalColors.life, marginTop: 2, fontStyle: 'italic' },
  vaccineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MedicalColors.white, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: MedicalColors.border },
  vaccineStatus: { width: 8, height: 40, borderRadius: 4, marginRight: 12 },
  statusDone: { backgroundColor: MedicalColors.life },
  statusLate: { backgroundColor: MedicalColors.urgency },
  statusPending: { backgroundColor: MedicalColors.warning },
  vaccineInfo: { flex: 1 },
  vaccineName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  vaccineDate: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  vaccineStatusText: { fontSize: 18 },
});
