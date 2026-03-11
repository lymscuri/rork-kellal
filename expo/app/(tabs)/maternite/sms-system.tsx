import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { MessageSquare, Send, Phone, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import type { SmsReminder } from '@/types/medical';

const LANGUAGES = [
  { key: 'francais' as const, label: 'Français' },
  { key: 'pular' as const, label: 'Pular' },
  { key: 'malinke' as const, label: 'Malinké' },
  { key: 'soussou' as const, label: 'Soussou' },
];

export default function SmsSystemScreen() {
  const { maternityPatients, smsReminders, addSmsReminder } = useMedicalStore();

  const [targetPhone, setTargetPhone] = useState('');
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState<SmsReminder['language']>('francais');
  const [method, setMethod] = useState<SmsReminder['method']>('sms');
  const [isGroup, setIsGroup] = useState(false);

  const handleSend = useCallback(() => {
    if (!targetPhone.trim() && !isGroup) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un message');
      return;
    }

    if (isGroup) {
      let count = 0;
      maternityPatients.forEach(p => {
        const phone = p.pregnancy.firstName;
        addSmsReminder({
          type: 'custom',
          targetPhone: phone,
          language,
          method,
          message: message.trim(),
          scheduledDate: new Date().toISOString(),
          status: 'sent',
          patientName: p.pregnancy.firstName,
        });
        count++;
      });
      Alert.alert('Envoyé', `Rappel envoyé à ${count} patiente(s)`);
    } else {
      addSmsReminder({
        type: 'custom',
        targetPhone: targetPhone.trim(),
        language,
        method,
        message: message.trim(),
        scheduledDate: new Date().toISOString(),
        status: 'sent',
        patientName: undefined,
      });
      Alert.alert('Envoyé', 'Message envoyé avec succès');
    }

    setTargetPhone('');
    setMessage('');
  }, [targetPhone, message, language, method, isGroup, maternityPatients, addSmsReminder]);

  const getStatusIcon = (status: string) => {
    if (status === 'sent') return <CheckCircle size={16} color={MedicalColors.life} />;
    if (status === 'failed') return <XCircle size={16} color={MedicalColors.urgency} />;
    return <Clock size={16} color={MedicalColors.warning} />;
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MessageSquare size={18} color={MedicalColors.maternity} />
          <Text style={styles.sectionTitle}>Envoyer un rappel</Text>
        </View>

        <View style={styles.toggleRow}>
          <Button
            mode={!isGroup ? 'contained' : 'outlined'}
            onPress={() => setIsGroup(false)}
            compact
            buttonColor={!isGroup ? MedicalColors.maternity : undefined}
            textColor={!isGroup ? MedicalColors.white : MedicalColors.text}
            style={styles.toggleBtn}
          >
            Individuel
          </Button>
          <Button
            mode={isGroup ? 'contained' : 'outlined'}
            onPress={() => setIsGroup(true)}
            compact
            buttonColor={isGroup ? MedicalColors.maternity : undefined}
            textColor={isGroup ? MedicalColors.white : MedicalColors.text}
            style={styles.toggleBtn}
          >
            Groupé ({maternityPatients.length})
          </Button>
        </View>

        {!isGroup && (
          <TextInput
            label="Numéro de téléphone"
            value={targetPhone}
            onChangeText={setTargetPhone}
            mode="outlined"
            dense
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon={() => <Phone size={18} color={MedicalColors.textSecondary} />} />}
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.maternity}
          />
        )}

        <Text style={styles.fieldLabel}>Langue</Text>
        <View style={styles.chipRow}>
          {LANGUAGES.map(l => (
            <Chip
              key={l.key}
              selected={language === l.key}
              onPress={() => setLanguage(l.key)}
              style={[styles.chip, language === l.key && styles.chipSelected]}
              textStyle={{ fontSize: 12, color: language === l.key ? MedicalColors.white : MedicalColors.text }}
            >
              {l.label}
            </Chip>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Type de rappel</Text>
        <View style={styles.chipRow}>
          <Chip
            selected={method === 'sms'}
            onPress={() => setMethod('sms')}
            style={[styles.chip, method === 'sms' && styles.chipSelected]}
            textStyle={{ fontSize: 12, color: method === 'sms' ? MedicalColors.white : MedicalColors.text }}
            icon={() => <MessageSquare size={14} color={method === 'sms' ? MedicalColors.white : MedicalColors.text} />}
          >
            SMS texte
          </Chip>
          <Chip
            selected={method === 'voice'}
            onPress={() => setMethod('voice')}
            style={[styles.chip, method === 'voice' && styles.chipSelected]}
            textStyle={{ fontSize: 12, color: method === 'voice' ? MedicalColors.white : MedicalColors.text }}
            icon={() => <Phone size={14} color={method === 'voice' ? MedicalColors.white : MedicalColors.text} />}
          >
            Appel vocal
          </Chip>
        </View>

        <TextInput
          label="Message"
          value={message}
          onChangeText={setMessage}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineColor={MedicalColors.border}
          activeOutlineColor={MedicalColors.maternity}
        />

        <Button
          mode="contained"
          onPress={handleSend}
          buttonColor={MedicalColors.maternity}
          icon={() => <Send size={16} color={MedicalColors.white} />}
          style={styles.sendBtn}
          contentStyle={styles.sendBtnContent}
        >
          {isGroup ? 'Envoyer au groupe' : 'Envoyer'}
        </Button>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique des messages</Text>
        {smsReminders.length === 0 ? (
          <View style={styles.emptyHistory}>
            <MessageSquare size={32} color={MedicalColors.border} />
            <Text style={styles.emptyHistoryText}>Aucun message envoyé</Text>
          </View>
        ) : (
          smsReminders.slice(0, 20).map(r => (
            <View key={r.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                {getStatusIcon(r.status)}
                <Text style={styles.historyDate}>{new Date(r.scheduledDate).toLocaleDateString('fr-FR')}</Text>
                <Text style={styles.historyMethod}>{r.method === 'sms' ? 'SMS' : 'Vocal'} • {r.language}</Text>
              </View>
              <Text style={styles.historyPhone}>{r.patientName || r.targetPhone}</Text>
              <Text style={styles.historyMessage} numberOfLines={2}>{r.message}</Text>
              <Text style={[styles.historyStatus, r.status === 'sent' ? styles.statusSent : r.status === 'failed' ? styles.statusFailed : styles.statusPending]}>
                {r.status === 'sent' ? '✅ Envoyé' : r.status === 'failed' ? '❌ Échec' : '⏳ En attente'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: MedicalColors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.text, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleBtn: { flex: 1, borderColor: MedicalColors.maternity },
  input: { marginBottom: 12, backgroundColor: MedicalColors.white },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: { backgroundColor: MedicalColors.background },
  chipSelected: { backgroundColor: MedicalColors.maternity },
  sendBtn: { borderRadius: 10 },
  sendBtnContent: { paddingVertical: 8 },
  emptyHistory: { alignItems: 'center', paddingVertical: 30 },
  emptyHistoryText: { fontSize: 14, color: MedicalColors.textSecondary, marginTop: 8 },
  historyCard: { backgroundColor: MedicalColors.background, borderRadius: 10, padding: 12, marginBottom: 8 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  historyDate: { fontSize: 12, fontWeight: '600' as const, color: MedicalColors.text },
  historyMethod: { fontSize: 11, color: MedicalColors.textSecondary },
  historyPhone: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text },
  historyMessage: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 4 },
  historyStatus: { fontSize: 11, fontWeight: '600' as const, marginTop: 4 },
  statusSent: { color: MedicalColors.life },
  statusFailed: { color: MedicalColors.urgency },
  statusPending: { color: MedicalColors.warning },
});
