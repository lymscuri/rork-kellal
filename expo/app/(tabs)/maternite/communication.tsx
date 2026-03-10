import { useCallback, useRef, useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import type { CaregiverMessage } from "@/types/medical";
import {
  Send,
  User,
  Stethoscope,
  Heart,
  Shield,
} from "lucide-react-native";

const MATERNITY_ACCENT = "#E91E8C";
const MATERNITY_LIGHT = "#FDE4F2";
const MATERNITY_DARK = "#B0156D";
const CARD_BG = "#FFFFFF";

export default function CommunicationScreen() {
  const { maternityData, addCaregiverMessage, markMessageRead } =
    useMedicalStore();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    maternityData.messages
      .filter((m) => !m.isRead && m.senderRole !== "parent")
      .forEach((m) => markMessageRead(m.id));
  }, [maternityData.messages, markMessageRead]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [maternityData.messages.length]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim()) return;
    addCaregiverMessage({
      senderId: "current_user",
      senderName: "Moi",
      senderRole: "parent",
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
    });
    setNewMessage("");

    setTimeout(() => {
      addCaregiverMessage({
        senderId: "agent_auto",
        senderName: "Agent de Santé",
        senderRole: "agent_sante",
        content: getAutoResponse(newMessage.trim()),
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }, 1500);
  }, [newMessage, addCaregiverMessage]);

  const getRoleIcon = useCallback((role: CaregiverMessage["senderRole"]) => {
    switch (role) {
      case "medecin":
        return <Stethoscope size={14} color="#1565C0" />;
      case "sage_femme":
        return <Heart size={14} color={MATERNITY_ACCENT} />;
      case "agent_sante":
        return <Shield size={14} color="#2E7D32" />;
      default:
        return <User size={14} color={MedicalColors.textSecondary} />;
    }
  }, []);

  const getRoleBgColor = useCallback(
    (role: CaregiverMessage["senderRole"]) => {
      switch (role) {
        case "medecin":
          return "#E3F2FD";
        case "sage_femme":
          return MATERNITY_LIGHT;
        case "agent_sante":
          return "#E8F5E9";
        default:
          return "#F5F5F5";
      }
    },
    []
  );

  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatDate = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  }, []);

  const groupedMessages = useCallback(() => {
    const groups: { date: string; messages: CaregiverMessage[] }[] = [];
    let currentDate = "";
    maternityData.messages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.timestamp, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  }, [maternityData.messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.headerInfo}>
        <View style={styles.headerInfoIcon}>
          <Shield size={16} color="#2E7D32" />
        </View>
        <Text style={styles.headerInfoText}>
          Communiquez avec vos soignants pour le suivi maternel et infantile
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {groupedMessages().map((group, groupIndex) => (
          <View key={groupIndex}>
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>{formatDate(group.date)}</Text>
            </View>
            {group.messages.map((msg) => {
              const isMe = msg.senderRole === "parent";
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubbleContainer,
                    isMe
                      ? styles.messageBubbleContainerRight
                      : styles.messageBubbleContainerLeft,
                  ]}
                >
                  {!isMe && (
                    <View
                      style={[
                        styles.avatarSmall,
                        { backgroundColor: getRoleBgColor(msg.senderRole) },
                      ]}
                    >
                      {getRoleIcon(msg.senderRole)}
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isMe
                        ? styles.messageBubbleRight
                        : styles.messageBubbleLeft,
                    ]}
                  >
                    {!isMe && (
                      <Text style={styles.senderName}>{msg.senderName}</Text>
                    )}
                    <Text
                      style={[
                        styles.messageText,
                        isMe && styles.messageTextRight,
                      ]}
                    >
                      {msg.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        isMe && styles.messageTimeRight,
                      ]}
                    >
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Votre message..."
          placeholderTextColor={MedicalColors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <Send size={20} color={newMessage.trim() ? "#FFF" : "#CCC"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function getAutoResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("vaccin")) {
    return "Pour les vaccinations, veuillez consulter le calendrier PEV dans l'onglet Vaccinations. N'hésitez pas à prendre rendez-vous si un vaccin est en retard.";
  }
  if (lower.includes("consultation") || lower.includes("rdv")) {
    return "Votre prochaine consultation est visible dans le calendrier. Si vous avez besoin de reporter, contactez directement le centre de santé.";
  }
  if (lower.includes("douleur") || lower.includes("mal")) {
    return "En cas de douleurs persistantes, nous vous recommandons de consulter rapidement. Si c'est urgent, rendez-vous à l'onglet Urgence.";
  }
  if (lower.includes("merci")) {
    return "De rien! N'hésitez pas si vous avez d'autres questions. Votre santé et celle de votre enfant sont notre priorité.";
  }
  return "Merci pour votre message. Un agent de santé vous répondra dans les plus brefs délais. En cas d'urgence, utilisez l'onglet Urgence.";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FC",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  headerInfoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#C8E6C9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#2E7D32",
    lineHeight: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    backgroundColor: "#F0E6EF",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden" as const,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },
  messageBubbleContainerLeft: {
    justifyContent: "flex-start",
    paddingRight: 50,
  },
  messageBubbleContainerRight: {
    justifyContent: "flex-end",
    paddingLeft: 50,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleLeft: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: MATERNITY_ACCENT,
    borderTopRightRadius: 4,
    alignSelf: "flex-end",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: MATERNITY_DARK,
    marginBottom: 3,
  },
  messageText: {
    fontSize: 14,
    color: MedicalColors.text,
    lineHeight: 20,
  },
  messageTextRight: {
    color: "#FFF",
  },
  messageTime: {
    fontSize: 10,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  messageTimeRight: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "right" as const,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: "#F0E6EF",
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: MedicalColors.text,
    maxHeight: 100,
    backgroundColor: "#FAFAFA",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MATERNITY_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
});
