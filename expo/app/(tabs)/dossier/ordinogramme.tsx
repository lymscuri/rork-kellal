import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, Baby, Stethoscope, Syringe, Check, RefreshCw } from 'lucide-react-native';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import {
  ordinogrammeService,
  type OrdinogrammeModule,
  type OrdinogrammeQuestion,
  type OrdinogrammeResult,
  type OrdinogrammeResponse,
} from '@/services/ordinogramme';

type Step = 'module-selection' | 'questionnaire' | 'result';

const MODULES = [
  {
    id: 'triage' as OrdinogrammeModule,
    title: 'Triage Urgences',
    icon: AlertCircle,
    color: '#DC3545',
    bgColor: '#FFEBEE',
    description: 'Évaluation rapide de la gravité',
  },
  {
    id: 'maternity' as OrdinogrammeModule,
    title: 'Complications Maternité',
    icon: Baby,
    color: '#9B59B6',
    bgColor: '#F3E5F5',
    description: 'Urgences obstétricales',
  },
  {
    id: 'general' as OrdinogrammeModule,
    title: 'Diagnostic Général',
    icon: Stethoscope,
    color: '#0D6EFD',
    bgColor: '#E3F2FD',
    description: 'Pathologies courantes',
  },
  {
    id: 'vaccination' as OrdinogrammeModule,
    title: 'Calendrier Vaccinal',
    icon: Syringe,
    color: '#28A745',
    bgColor: '#E8F5E9',
    description: 'Programme PEV Guinée',
  },
];

export default function OrdinogrammeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { patients, addConsultation } = useMedicalStore();

  const [step, setStep] = useState<Step>('module-selection');
  const [selectedModule, setSelectedModule] = useState<OrdinogrammeModule | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<OrdinogrammeQuestion | null>(null);
  const [result, setResult] = useState<OrdinogrammeResult | null>(null);
  const [questionHistory, setQuestionHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Email input modal (Android only)
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  // Sécurité : seuls les médecins peuvent accéder
  if (user?.role !== 'medecin') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={MedicalColors.urgency} />
          <Text style={styles.errorText}>Accès réservé aux médecins</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleModuleSelect = async (module: OrdinogrammeModule) => {
    setSelectedModule(module);
    setIsLoading(true);
    setError(null);

    try {
      const firstQuestion = await ordinogrammeService.startSession(module);
      setCurrentQuestion(firstQuestion);
      setStep('questionnaire');
    } catch (err: any) {
      console.error('[Ordinogramme] Erreur démarrage session:', err);
      setError(err.message || 'Erreur lors du démarrage');
      Alert.alert('Erreur', 'Impossible de démarrer la session. Vérifiez votre connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = async (answer: string) => {
    if (!currentQuestion) return;

    // Ajouter à l'historique
    setQuestionHistory((prev) => [
      ...prev,
      { question: currentQuestion.question, answer },
    ]);

    setIsLoading(true);
    setError(null);

    try {
      const response = await ordinogrammeService.sendAnswer(answer);

      if (response.type === 'question') {
        setCurrentQuestion(response);
      } else if (response.type === 'result') {
        setResult(response);
        setStep('result');

        // Alerte si urgence critique
        if (response.urgency === 'critique') {
          Alert.alert(
            '🚨 URGENCE CRITIQUE',
            'Prise en charge immédiate requise !',
            [{ text: 'OK', style: 'default' }]
          );
        }
      }
    } catch (err: any) {
      console.error('[Ordinogramme] Erreur envoi réponse:', err);
      setError(err.message || 'Erreur lors de la communication avec l\'IA');
      Alert.alert('Erreur', 'Impossible d\'obtenir la réponse. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    ordinogrammeService.reset();
    setStep('module-selection');
    setSelectedModule(null);
    setCurrentQuestion(null);
    setResult(null);
    setQuestionHistory([]);
    setError(null);
  };

  const handleRequestPatientEmail = () => {
    if (Platform.OS === 'ios') {
      // Sur iOS, utiliser Alert.prompt
      Alert.prompt(
        'Email du patient',
        'Entrez l\'email du patient pour sauvegarder la consultation dans son dossier',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Sauvegarder',
            onPress: (email?: string) => {
              if (email) {
                handleFindPatientByEmail(email.trim());
              }
            },
          },
        ],
        'plain-text',
        '',
        'email-address'
      );
    } else {
      // Sur Android, utiliser un Modal simple
      setEmailInput('');
      setShowEmailModal(true);
    }
  };

  const handleFindPatientByEmail = (email: string) => {
    const patient = patients.find(
      (p) => p.linkedEmail?.toLowerCase() === email.toLowerCase()
    );

    if (patient) {
      handleSaveToPatient(patient.id);
    } else {
      Alert.alert('Erreur', 'Aucun patient trouvé avec cet email.');
    }
  };

  const handleSaveToPatient = async (patientId: string) => {
    if (!result || !selectedModule || !user) return;

    setIsSaving(true);
    try {
      const currentModuleData = MODULES.find((m) => m.id === selectedModule);

      // Format consultation notes
      const consultationNotes = `
=== ORDINOGRAMME IA - ${currentModuleData?.title.toUpperCase()} ===

PARCOURS DIAGNOSTIQUE :
${questionHistory.map((h, i) => `${i + 1}. ${h.question}\n   → ${h.answer}`).join('\n\n')}

DIAGNOSTIC : ${result.diagnosis}

PROTOCOLE DE SOINS :
${result.protocol.map((step, i) => `${i + 1}. ${step}`).join('\n')}

MÉDICAMENTS SUGGÉRÉS :
${result.medications.length > 0 ? result.medications.map(med => `• ${med}`).join('\n') : 'Aucun'}

NIVEAU D'URGENCE : ${result.urgency.toUpperCase()}

RÉFÉRENCE : ${result.referral ? '⚠️ Référence à un spécialiste recommandée' : 'Non'}
      `.trim();

      await addConsultation(patientId, {
        doctorId: user.id,
        doctorName: `${user.lastName} ${user.firstName}`,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        reason: `Ordinogramme IA - ${currentModuleData?.title}`,
        vitalSigns: {},
        clinicalExams: [],
        mainDiagnosis: result.diagnosis,
        differentialDiagnosis: questionHistory.map(h => `${h.question}: ${h.answer}`).join(' | '),
        treatment: result.protocol.join('\n'),
        prescriptions: [],
        requestedExams: [],
        nextAppointment: undefined,
        observations: consultationNotes,
      });

      setShowEmailModal(false);
      Alert.alert(
        'Consultation enregistrée',
        'Les résultats de l\'ordinogramme ont été sauvegardés dans le dossier du patient.',
        [
          {
            text: 'Nouvelle consultation',
            onPress: handleReset,
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    } catch (err: any) {
      console.error('[Ordinogramme] Erreur sauvegarde:', err);
      Alert.alert('Erreur', 'Impossible de sauvegarder la consultation. Réessayez.');
    } finally {
      setIsSaving(false);
    }
  };

  const getProgressPercent = () => {
    const totalSteps = 7; // Maximum de questions
    return Math.min((questionHistory.length / totalSteps) * 100, 100);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critique':
        return '#DC3545';
      case 'élevée':
        return '#FF6B6B';
      case 'modérée':
        return '#FFA500';
      case 'faible':
        return '#28A745';
      default:
        return MedicalColors.textSecondary;
    }
  };

  const currentModuleData = MODULES.find((m) => m.id === selectedModule);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={MedicalColors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ordinogramme IA</Text>
        {step !== 'module-selection' && (
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <RefreshCw size={20} color={MedicalColors.white} />
          </TouchableOpacity>
        )}
        {step === 'module-selection' && <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ÉTAPE 1 : Sélection du module */}
        {step === 'module-selection' && (
          <View style={styles.moduleSelection}>
            <Text style={styles.sectionTitle}>Choisissez un module</Text>
            <Text style={styles.sectionSubtitle}>
              L'IA vous guidera avec des questions adaptées au contexte guinéen
            </Text>

            <View style={styles.modulesGrid}>
              {MODULES.map((module) => (
                <TouchableOpacity
                  key={module.id}
                  style={[styles.moduleCard, { backgroundColor: module.bgColor }]}
                  onPress={() => handleModuleSelect(module.id)}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <View style={[styles.moduleIconBg, { backgroundColor: module.color }]}>
                    <module.icon size={32} color={MedicalColors.white} />
                  </View>
                  <Text style={[styles.moduleTitle, { color: module.color }]}>
                    {module.title}
                  </Text>
                  <Text style={styles.moduleDescription}>{module.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={MedicalColors.medical} />
                <Text style={styles.loadingText}>Initialisation de l'IA...</Text>
              </View>
            )}
          </View>
        )}

        {/* ÉTAPE 2 : Questionnaire */}
        {step === 'questionnaire' && currentQuestion && currentModuleData && (
          <View style={styles.questionnaireContainer}>
            {/* Barre de progression */}
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${getProgressPercent()}%` }]} />
              </View>
              <Text style={styles.progressText}>
                Question {questionHistory.length + 1} • {Math.round(getProgressPercent())}%
              </Text>
            </View>

            {/* Module actuel */}
            <View style={[styles.moduleHeader, { backgroundColor: currentModuleData.bgColor }]}>
              <currentModuleData.icon size={24} color={currentModuleData.color} />
              <Text style={[styles.moduleHeaderText, { color: currentModuleData.color }]}>
                {currentModuleData.title}
              </Text>
            </View>

            {/* Question actuelle */}
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
            </View>

            {/* Options de réponse */}
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionButton}
                  onPress={() => handleAnswerSelect(option)}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={MedicalColors.medical} />
                <Text style={styles.loadingText}>Analyse en cours...</Text>
              </View>
            )}

            {/* Historique des réponses */}
            {questionHistory.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Réponses précédentes</Text>
                {questionHistory.map((item, index) => (
                  <View key={index} style={styles.historyItem}>
                    <Check size={16} color={MedicalColors.life} />
                    <View style={styles.historyContent}>
                      <Text style={styles.historyQuestion}>{item.question}</Text>
                      <Text style={styles.historyAnswer}>{item.answer}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ÉTAPE 3 : Résultat */}
        {step === 'result' && result && currentModuleData && (
          <View style={styles.resultContainer}>
            {/* Urgence */}
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(result.urgency) }]}>
              <AlertCircle size={20} color={MedicalColors.white} />
              <Text style={styles.urgencyText}>
                Urgence : {result.urgency.toUpperCase()}
              </Text>
            </View>

            {/* Diagnostic */}
            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>📋 Diagnostic probable</Text>
              <Text style={styles.resultCardContent}>{result.diagnosis}</Text>
            </View>

            {/* Protocole de soins */}
            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>🏥 Protocole de soins</Text>
              {result.protocol.map((step, index) => (
                <View key={index} style={styles.protocolItem}>
                  <Text style={styles.protocolNumber}>{index + 1}.</Text>
                  <Text style={styles.protocolText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Médicaments */}
            {result.medications.length > 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultCardTitle}>💊 Médicaments suggérés</Text>
                {result.medications.map((med, index) => (
                  <Text key={index} style={styles.medicationItem}>
                    • {med}
                  </Text>
                ))}
              </View>
            )}

            {/* Référence */}
            {result.referral && (
              <View style={[styles.resultCard, styles.referralCard]}>
                <AlertCircle size={24} color={MedicalColors.urgency} />
                <Text style={styles.referralText}>
                  ⚠️ Référence à un spécialiste recommandée
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleReset}
              >
                <RefreshCw size={20} color={MedicalColors.white} />
                <Text style={styles.primaryButtonText}>Nouvelle consultation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleRequestPatientEmail}
              >
                <Text style={styles.secondaryButtonText}>Sauvegarder dans le dossier patient</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal de saisie d'email (Android uniquement) */}
      {Platform.OS === 'android' && (
        <Modal
          visible={showEmailModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowEmailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.emailModalContainer}>
              <Text style={styles.emailModalTitle}>Email du patient</Text>
              <Text style={styles.emailModalMessage}>
                Entrez l'email du patient pour sauvegarder la consultation dans son dossier
              </Text>

              <TextInput
                style={styles.emailInput}
                placeholder="email@exemple.com"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />

              <View style={styles.emailModalButtons}>
                <TouchableOpacity
                  style={[styles.emailModalButton, styles.cancelButton]}
                  onPress={() => setShowEmailModal(false)}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.emailModalButton, styles.saveButton]}
                  onPress={() => {
                    if (emailInput.trim()) {
                      handleFindPatientByEmail(emailInput.trim());
                    }
                  }}
                  disabled={isSaving || !emailInput.trim()}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={MedicalColors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Sauvegarder</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MedicalColors.medical,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: MedicalColors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: MedicalColors.white,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: MedicalColors.medical,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: MedicalColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  moduleSelection: {},
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: MedicalColors.white,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
    lineHeight: 20,
  },
  modulesGrid: {
    gap: 16,
  },
  moduleCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  moduleIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
  },
  questionnaireContainer: {},
  progressSection: {
    marginBottom: 20,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: MedicalColors.life,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  moduleHeaderText: {
    fontSize: 16,
    fontWeight: '700',
  },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: MedicalColors.white,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: MedicalColors.medical,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: MedicalColors.white,
  },
  historySection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  historyItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(76,175,80,0.1)',
    padding: 12,
    borderRadius: 8,
  },
  historyContent: {
    flex: 1,
  },
  historyQuestion: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  historyAnswer: {
    fontSize: 14,
    fontWeight: '600',
    color: MedicalColors.white,
  },
  resultContainer: {},
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  urgencyText: {
    fontSize: 16,
    fontWeight: '800',
    color: MedicalColors.white,
    letterSpacing: 1,
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: MedicalColors.white,
    marginBottom: 12,
  },
  resultCardContent: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  protocolItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  protocolNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: MedicalColors.medical,
  },
  protocolText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  medicationItem: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
    lineHeight: 22,
  },
  referralCard: {
    backgroundColor: 'rgba(220,53,69,0.1)',
    borderColor: MedicalColors.urgency,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: MedicalColors.white,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 16,
  },
  primaryButton: {
    backgroundColor: MedicalColors.life,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: MedicalColors.white,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: MedicalColors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emailModalContainer: {
    backgroundColor: '#0A0E1A',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emailModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: MedicalColors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  emailModalMessage: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: MedicalColors.white,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emailModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emailModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: MedicalColors.white,
  },
  saveButton: {
    backgroundColor: MedicalColors.medical,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: MedicalColors.white,
  },
});
