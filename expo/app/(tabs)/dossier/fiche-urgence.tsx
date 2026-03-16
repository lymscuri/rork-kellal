import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Phone, ArrowLeft, Calendar } from 'lucide-react-native';
import { MedicalColors } from '@/constants/colors';

type MedicalData = {
  id: string;
  name: string;
  phone: string;
  dossier: {
    bloodType: string;
    drugAllergies: Array<{ name: string; severity?: string }>;
    chronicDiseases: string[];
    permanentTreatments: string[];
  };
  maternity: {
    isPregnant: boolean;
    currentWeek: number;
    dueDate: string;
  } | null;
};

export default function FicheUrgenceScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const dataParam = params.data as string;

  const medicalData = useMemo<MedicalData | null>(() => {
    if (!dataParam) return null;

    try {
      // Décoder le base64
      const jsonString = decodeURIComponent(escape(atob(dataParam)));
      const parsed = JSON.parse(jsonString);
      console.log('[FicheUrgence] Données décodées:', parsed);
      return parsed;
    } catch (error) {
      console.error('[FicheUrgence] Erreur de décodage des données:', error);
      return null;
    }
  }, [dataParam]);

  const handleCall = async () => {
    if (!medicalData?.phone) {
      Alert.alert('Erreur', 'Aucun numéro de téléphone disponible');
      return;
    }

    const url = `tel:${medicalData.phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Erreur', "Impossible d'effectuer l'appel");
    }
  };

  if (!medicalData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Données invalides ou manquantes</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header rouge vif */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={MedicalColors.white} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerEmergency}>🚨 FICHE D'URGENCE MÉDICALE</Text>
            <Text style={styles.headerName}>{medicalData.name}</Text>
            {medicalData.phone && (
              <View style={styles.phoneRow}>
                <Text style={styles.phoneLabel}>Tél : {medicalData.phone}</Text>
                <TouchableOpacity onPress={handleCall} style={styles.callButton}>
                  <Phone size={18} color={MedicalColors.white} />
                  <Text style={styles.callButtonText}>Appeler</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Carte ALLERGIES - Rouge */}
        <View style={styles.section}>
          <View style={[styles.card, styles.allergiesCard]}>
            <Text style={styles.cardTitle}>⚠️ ALLERGIES MÉDICAMENTEUSES</Text>
            {medicalData.dossier.drugAllergies.length > 0 ? (
              <View style={styles.cardContent}>
                {medicalData.dossier.drugAllergies.map((allergy, index) => (
                  <View key={index} style={styles.allergyItem}>
                    <Text style={styles.allergyText}>• {allergy.name}</Text>
                    {allergy.severity && (
                      <Text style={styles.allergySeverity}>({allergy.severity})</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noDataText}>AUCUNE ALLERGIE CONNUE</Text>
            )}
          </View>
        </View>

        {/* Carte GROUPE SANGUIN - Bleue */}
        <View style={styles.section}>
          <View style={[styles.card, styles.bloodCard]}>
            <Text style={styles.cardTitle}>🩸 GROUPE SANGUIN</Text>
            <Text style={styles.bloodTypeText}>
              {medicalData.dossier.bloodType || 'NON RENSEIGNÉ'}
            </Text>
          </View>
        </View>

        {/* Carte MALADIES CHRONIQUES - Orange */}
        {medicalData.dossier.chronicDiseases.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.card, styles.diseaseCard]}>
              <Text style={styles.cardTitle}>🏥 MALADIES CHRONIQUES</Text>
              <View style={styles.cardContent}>
                {medicalData.dossier.chronicDiseases.map((disease, index) => (
                  <Text key={index} style={styles.listItem}>• {disease}</Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Carte TRAITEMENTS EN COURS - Verte */}
        {medicalData.dossier.permanentTreatments.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.card, styles.treatmentCard]}>
              <Text style={styles.cardTitle}>💊 TRAITEMENTS EN COURS</Text>
              <View style={styles.cardContent}>
                {medicalData.dossier.permanentTreatments.map((treatment, index) => (
                  <Text key={index} style={styles.listItem}>• {treatment}</Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Carte GROSSESSE - Violette */}
        {medicalData.maternity?.isPregnant && (
          <View style={styles.section}>
            <View style={[styles.card, styles.maternityCard]}>
              <Text style={styles.cardTitle}>🤰 GROSSESSE EN COURS</Text>
              <View style={styles.cardContent}>
                <View style={styles.maternityRow}>
                  <Calendar size={20} color="#9C27B0" />
                  <Text style={styles.maternityText}>
                    Semaine {medicalData.maternity.currentWeek} / 40
                  </Text>
                </View>
                {medicalData.maternity.dueDate && (
                  <Text style={styles.maternityDate}>
                    Date prévue d'accouchement :{' '}
                    {new Date(medicalData.maternity.dueDate).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerApp}>Généré par Kendeya Santé</Text>
          <Text style={styles.footerDate}>{currentDate}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: MedicalColors.urgency,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: MedicalColors.medical,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: MedicalColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerEmergency: {
    fontSize: 20,
    fontWeight: '800',
    color: MedicalColors.white,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  headerName: {
    fontSize: 26,
    fontWeight: '700',
    color: MedicalColors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  phoneLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: MedicalColors.white,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: MedicalColors.white,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    gap: 8,
  },
  // Carte Allergies - Rouge
  allergiesCard: {
    backgroundColor: '#FFEBEE',
    borderColor: '#D32F2F',
  },
  allergyItem: {
    marginBottom: 8,
  },
  allergyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B71C1C',
    lineHeight: 26,
  },
  allergySeverity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#388E3C',
    textAlign: 'center',
  },
  // Carte Groupe Sanguin - Bleue
  bloodCard: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    alignItems: 'center',
  },
  bloodTypeText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0D47A1',
    letterSpacing: 2,
  },
  // Carte Maladies - Orange
  diseaseCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#F57C00',
  },
  // Carte Traitements - Verte
  treatmentCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#388E3C',
  },
  listItem: {
    fontSize: 17,
    fontWeight: '600',
    color: MedicalColors.text,
    lineHeight: 24,
  },
  // Carte Maternité - Violette
  maternityCard: {
    backgroundColor: '#F3E5F5',
    borderColor: '#7B1FA2',
  },
  maternityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  maternityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6A1B9A',
  },
  maternityDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7B1FA2',
    marginTop: 4,
  },
  // Footer
  footer: {
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerApp: {
    fontSize: 16,
    fontWeight: '600',
    color: MedicalColors.textSecondary,
    marginBottom: 4,
  },
  footerDate: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
  },
});
