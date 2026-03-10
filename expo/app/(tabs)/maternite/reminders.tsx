import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Alert,
} from "react-native";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import type { SmsReminder } from "@/types/medical";
import {
  Phone,
  MessageSquare,
  Globe,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
} from "lucide-react-native";

const MATERNITY_ACCENT = "#E91E8C";
const MATERNITY_LIGHT = "#FDE4F2";
const CARD_BG = "#FFFFFF";

type ReminderType = SmsReminder["type"];
type Language = SmsReminder["language"];
type Method = SmsReminder["method"];

const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: "francais", label: "Français", flag: "FR" },
  { id: "lingala", label: "Lingala", flag: "LN" },
  { id: "swahili", label: "Swahili", flag: "SW" },
  { id: "tshiluba", label: "Tshiluba", flag: "TS" },
  { id: "kikongo", label: "Kikongo", flag: "KK" },
];

const REMINDER_TYPES: { id: ReminderType; label: string }[] = [
  { id: "vaccination", label: "Vaccination" },
  { id: "consultation", label: "Consultation" },
  { id: "checkup", label: "Contrôle" },
  { id: "custom", label: "Personnalisé" },
];

const REMINDER_TEMPLATES: Record<Language, Record<ReminderType, string>> = {
  francais: {
    vaccination: "Rappel: La vaccination de votre enfant est prévue. Veuillez vous rendre au centre de santé.",
    consultation: "Rappel: Votre consultation prénatale est prévue. N'oubliez pas votre carnet de santé.",
    checkup: "Rappel: Le contrôle de croissance de votre enfant est prévu cette semaine.",
    custom: "",
  },
  lingala: {
    vaccination: "Bokanisi: Mangwele ya mwana na yo ezali na mokolo. Kende na lopitalo.",
    consultation: "Bokanisi: Konsultasyon ya zemi na yo ezali na mokolo. Kobosana te kaye na yo.",
    checkup: "Bokanisi: Kontrol ya bokoli ya mwana na yo ezali pona poso oyo.",
    custom: "",
  },
  swahili: {
    vaccination: "Ukumbusho: Chanjo ya mtoto wako imeandaliwa. Tafadhali fika kituo cha afya.",
    consultation: "Ukumbusho: Mashauriano yako ya uzazi yamepangwa. Usisahau kadi yako ya afya.",
    checkup: "Ukumbusho: Uchunguzi wa ukuaji wa mtoto wako umepangwa wiki hii.",
    custom: "",
  },
  tshiluba: {
    vaccination: "Diyibukija: Mpokola wa muana webe udi mulongolole. Endaku ku lupitalu.",
    consultation: "Diyibukija: Konsultasyon yebe ya bujitu udi mulongolole. Kuibidila kaye kebe to.",
    checkup: "Diyibukija: Kontrol ya bukoli bwa muana webe udi mulongolole lumingu elu.",
    custom: "",
  },
  kikongo: {
    vaccination: "Kizolele: Kimpokola ya mwana yaku yi longamene. Kwenda ku lopitalo.",
    consultation: "Kizolele: Konsultasyon ya zitu yaku yi longamene. Kubilama kaye yaku ko.",
    checkup: "Kizolele: Kontrol ya kukola kwa mwana yaku yi longamene lumingu yayi.",
    custom: "",
  },
};

export default function RemindersScreen() {
  const { maternityData, addReminder, removeReminder, updateReminderStatus } =
    useMedicalStore();

  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<Language>("francais");
  const [method, setMethod] = useState<Method>("sms");
  const [type, setType] = useState<ReminderType>("vaccination");
  const [message, setMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      const template = REMINDER_TEMPLATES[lang][type];
      if (template) setMessage(template);
    },
    [type]
  );

  const handleTypeChange = useCallback(
    (t: ReminderType) => {
      setType(t);
      const template = REMINDER_TEMPLATES[language][t];
      if (template) setMessage(template);
    },
    [language]
  );

  const handleAddReminder = useCallback(() => {
    if (!phone) {
      Alert.alert("Erreur", "Veuillez entrer un numéro de téléphone");
      return;
    }
    if (!message) {
      Alert.alert("Erreur", "Veuillez entrer un message");
      return;
    }
    addReminder({
      type,
      targetPhone: phone,
      language,
      method,
      message,
      scheduledDate: scheduledDate || new Date().toISOString().split("T")[0],
      status: "pending",
    });
    setShowForm(false);
    setPhone("");
    setMessage("");
    setScheduledDate("");
    Alert.alert("Succès", "Rappel programmé avec succès");
  }, [phone, message, type, language, method, scheduledDate, addReminder]);

  const handleSendNow = useCallback(
    (id: string) => {
      Alert.alert(
        "Envoyer maintenant",
        "Envoyer ce rappel maintenant ?",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Envoyer",
            onPress: () => {
              updateReminderStatus(id, "sent");
              Alert.alert("Envoyé", "Le rappel a été envoyé avec succès");
            },
          },
        ]
      );
    },
    [updateReminderStatus]
  );

  const handleDeleteReminder = useCallback(
    (id: string) => {
      Alert.alert("Supprimer", "Supprimer ce rappel ?", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => removeReminder(id),
        },
      ]);
    },
    [removeReminder]
  );

  const getStatusIcon = useCallback((status: SmsReminder["status"]) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 size={16} color={MedicalColors.life} />;
      case "failed":
        return <AlertCircle size={16} color="#D32F2F" />;
      default:
        return <Clock size={16} color={MedicalColors.textSecondary} />;
    }
  }, []);

  const getMethodIcon = useCallback((m: Method) => {
    switch (m) {
      case "sms":
        return <MessageSquare size={14} color={MedicalColors.textSecondary} />;
      case "voice":
        return <Volume2 size={14} color={MedicalColors.textSecondary} />;
      default:
        return <Phone size={14} color={MedicalColors.textSecondary} />;
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.infoCard}>
        <Globe size={20} color={MATERNITY_ACCENT} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>
            Rappels SMS & Voix multilingues
          </Text>
          <Text style={styles.infoText}>
            Envoyez des rappels de vaccination et consultations en langues
            locales pour améliorer le suivi maternel et infantile.
          </Text>
        </View>
      </View>

      {!showForm ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Plus size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouveau rappel</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Programmer un rappel</Text>

          <Text style={styles.fieldLabel}>Type de rappel</Text>
          <View style={styles.chipRow}>
            {REMINDER_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.chip,
                  type === t.id && styles.chipActive,
                ]}
                onPress={() => handleTypeChange(t.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    type === t.id && styles.chipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Langue</Text>
          <View style={styles.chipRow}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[
                  styles.chip,
                  language === l.id && styles.chipActive,
                ]}
                onPress={() => handleLanguageChange(l.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    language === l.id && styles.chipTextActive,
                  ]}
                >
                  {l.flag} {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Méthode d'envoi</Text>
          <View style={styles.methodRow}>
            {(
              [
                { id: "sms" as Method, label: "SMS", icon: MessageSquare },
                { id: "voice" as Method, label: "Appel vocal", icon: Volume2 },
                { id: "both" as Method, label: "Les deux", icon: Phone },
              ] as const
            ).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.methodCard,
                  method === m.id && styles.methodCardActive,
                ]}
                onPress={() => setMethod(m.id)}
              >
                <m.icon
                  size={20}
                  color={
                    method === m.id
                      ? MATERNITY_ACCENT
                      : MedicalColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.methodLabel,
                    method === m.id && styles.methodLabelActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="+243 XXX XXX XXX"
            placeholderTextColor={MedicalColors.textSecondary}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Date programmée (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.textInput}
            value={scheduledDate}
            onChangeText={setScheduledDate}
            placeholder="2026-03-15"
            placeholderTextColor={MedicalColors.textSecondary}
          />

          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Contenu du message..."
            placeholderTextColor={MedicalColors.textSecondary}
            multiline
            numberOfLines={4}
          />

          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowForm(false)}
            >
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddReminder}
            >
              <Send size={16} color="#FFF" />
              <Text style={styles.submitBtnText}>Programmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {maternityData.reminders.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            Rappels programmés ({maternityData.reminders.length})
          </Text>
          {maternityData.reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderMeta}>
                  {getStatusIcon(reminder.status)}
                  <Text style={styles.reminderType}>
                    {REMINDER_TYPES.find((t) => t.id === reminder.type)?.label}
                  </Text>
                  {getMethodIcon(reminder.method)}
                </View>
                <View style={styles.reminderActions}>
                  {reminder.status === "pending" && (
                    <TouchableOpacity
                      style={styles.sendNowBtn}
                      onPress={() => handleSendNow(reminder.id)}
                    >
                      <Send size={14} color={MATERNITY_ACCENT} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteReminder(reminder.id)}
                  >
                    <Trash2 size={16} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.reminderMessage} numberOfLines={2}>
                {reminder.message}
              </Text>
              <View style={styles.reminderFooter}>
                <Text style={styles.reminderPhone}>
                  {reminder.targetPhone}
                </Text>
                <Text style={styles.reminderLang}>
                  {LANGUAGES.find((l) => l.id === reminder.language)?.label}
                </Text>
                <Text style={styles.reminderDate}>
                  {reminder.scheduledDate}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FC",
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: MATERNITY_LIGHT,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: MATERNITY_ACCENT,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  chipActive: {
    backgroundColor: MATERNITY_LIGHT,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: MedicalColors.textSecondary,
  },
  chipTextActive: {
    color: MATERNITY_ACCENT,
    fontWeight: "700" as const,
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
  },
  methodCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    gap: 4,
  },
  methodCardActive: {
    backgroundColor: MATERNITY_LIGHT,
    borderWidth: 1.5,
    borderColor: MATERNITY_ACCENT,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: MedicalColors.textSecondary,
  },
  methodLabelActive: {
    color: MATERNITY_ACCENT,
    fontWeight: "700" as const,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: MedicalColors.text,
    backgroundColor: "#FAFAFA",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: MATERNITY_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 12,
  },
  reminderCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reminderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reminderType: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sendNowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MATERNITY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderMessage: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  reminderFooter: {
    flexDirection: "row",
    gap: 12,
  },
  reminderPhone: {
    fontSize: 12,
    color: MedicalColors.text,
    fontWeight: "500" as const,
  },
  reminderLang: {
    fontSize: 12,
    color: MATERNITY_ACCENT,
    fontWeight: "600" as const,
  },
  reminderDate: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
  },
});
