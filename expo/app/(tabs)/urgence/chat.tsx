import { generateText } from '@/services/ai';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MedicalColors } from '@/constants/colors';
import { Send, ChevronLeft, Heart, Droplet, Thermometer, Baby, AlertCircle, Bug, MessageSquare, Phone } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  options?: string[]; // Options de réponse rapide
}

const QUICK_START_OPTIONS = [
  { label: 'Arrêt Cardiaque', icon: Heart, color: '#DC3545', bgColor: '#FFEBEE' },
  { label: 'Hémorragie', icon: Droplet, color: '#E53935', bgColor: '#FFCDD2' },
  { label: 'Fièvre Élevée', icon: Thermometer, color: '#FF6B6B', bgColor: '#FFEBEE' },
  { label: 'Urgence Obstétricale', icon: Baby, color: '#9B59B6', bgColor: '#F3E5F5' },
  { label: 'Perte de Conscience', icon: AlertCircle, color: '#FF5722', bgColor: '#FBE9E7' },
  { label: 'Morsure/Envenimation', icon: Bug, color: '#795548', bgColor: '#EFEBE9' },
  { label: 'Autre (chat libre)', icon: MessageSquare, color: '#607D8B', bgColor: '#ECEFF1' },
];

export default function EmergencyChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isSending, setIsSending] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(true);

  const getSystemContext = useCallback(() => {
    let context = "Tu es un assistant de premiers secours expert pour la Guinée. ";
    context += "Quand l'utilisateur choisit une situation d'urgence, guide-le avec des questions structurées.\n\n";
    context += "Pour chaque réponse, termine TOUJOURS ton message par une ligne spéciale :\n";
    context += "[OPTIONS: option1 | option2 | option3 | option4]\n\n";
    context += "Ces options seront affichées comme boutons cliquables.\n";
    context += "Si c'est le diagnostic final, termine par :\n";
    context += "[OPTIONS: Nouvelle urgence | Appeler SAMU 442]\n\n";
    context += "Contexte : Guinée, paludisme fréquent, ressources limitées, serpents venimeux locaux.\n";
    context += "Si urgence critique → mentionner SAMU 442.\n";
    context += "Réponds de manière concise et structurée. Sois empathique et rassurant.";
    return context;
  }, []);

  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: "Bonjour ! Je suis votre assistant de premiers secours. Choisissez votre situation d'urgence ou décrivez-la librement.",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const parseOptionsFromContent = (content: string): { cleanContent: string; options: string[] } => {
    const optionsMatch = content.match(/\[OPTIONS:\s*([^\]]+)\]/i);

    if (optionsMatch) {
      const optionsString = optionsMatch[1];
      const options = optionsString.split('|').map(opt => opt.trim()).filter(Boolean);
      const cleanContent = content.replace(/\[OPTIONS:\s*[^\]]+\]/i, '').trim();

      return { cleanContent, options };
    }

    return { cleanContent: content, options: [] };
  };

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);
    setShowQuickStart(false);

    try {
      const systemContext = getSystemContext();
      const conversationHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await generateText({
        messages: [
          { role: 'assistant', content: systemContext },
          ...conversationHistory,
          { role: 'user', content: messageText },
        ],
      });

      // Parser les options dans la réponse
      const { cleanContent, options } = parseOptionsFromContent(response || '');

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanContent || "Je n'ai pas pu traiter votre demande. Rendez-vous aux urgences les plus proches si nécessaire.",
        timestamp: new Date().toISOString(),
        options: options.length > 0 ? options : undefined,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Je rencontre des difficultés techniques. Rendez-vous aux urgences les plus proches si nécessaire.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, messages, getSystemContext]);

  const handleQuickOption = useCallback((option: string) => {
    // Vérifier si c'est le bouton SAMU
    if (option.toLowerCase().includes('samu') || option.includes('442')) {
      Alert.alert(
        'Appeler SAMU 442',
        'Voulez-vous appeler le SAMU (442) maintenant ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Appeler',
            onPress: async () => {
              const url = 'tel:442';
              const canOpen = await Linking.canOpenURL(url);
              if (canOpen) {
                await Linking.openURL(url);
              } else {
                Alert.alert('Erreur', "Impossible d'effectuer l'appel");
              }
            },
          },
        ]
      );
      return;
    }

    // Vérifier si c'est "Nouvelle urgence"
    if (option.toLowerCase().includes('nouvelle')) {
      setMessages([{
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: "Bonjour ! Je suis votre assistant de premiers secours. Choisissez votre situation d'urgence ou décrivez-la librement.",
        timestamp: new Date().toISOString(),
      }]);
      setShowQuickStart(true);
      return;
    }

    // Envoyer l'option comme message
    handleSendMessage(option);
  }, [handleSendMessage]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageContainer, item.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
      <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
          {item.content}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </Text>

      {/* Boutons de réponse rapide */}
      {item.role === 'assistant' && item.options && item.options.length > 0 && (
        <View style={styles.quickOptionsContainer}>
          {item.options.map((option, index) => {
            const isSamuButton = option.toLowerCase().includes('samu') || option.includes('442');
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quickOptionButton,
                  isSamuButton && styles.samuButton,
                ]}
                onPress={() => handleQuickOption(option)}
                activeOpacity={0.7}
              >
                {isSamuButton && <Phone size={14} color={MedicalColors.white} />}
                <Text style={[
                  styles.quickOptionText,
                  isSamuButton && styles.samuButtonText,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  ), [handleQuickOption]);

  return (
    <View style={styles.container}>
      <View style={[styles.contextHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={MedicalColors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Assistant Urgence</Text>
            <Text style={styles.headerSubtitle}>IA de premiers secours</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListFooterComponent={
            showQuickStart && messages.length === 1 ? (
              <View style={styles.quickStartContainer}>
                <Text style={styles.quickStartTitle}>Choisissez votre situation :</Text>
                <View style={styles.quickStartGrid}>
                  {QUICK_START_OPTIONS.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.quickStartButton, { backgroundColor: option.bgColor }]}
                      onPress={() => handleSendMessage(option.label)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.quickStartIcon, { backgroundColor: option.color }]}>
                        <option.icon size={20} color={MedicalColors.white} />
                      </View>
                      <Text style={[styles.quickStartLabel, { color: option.color }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {isSending && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={MedicalColors.urgency} size="small" />
            <Text style={styles.loadingText}>{"L'assistant réfléchit..."}</Text>
          </View>
        )}

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder="Décrivez la situation d'urgence..."
            placeholderTextColor={MedicalColors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isSending}
            onFocus={scrollToEnd}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending}
          >
            <Send size={20} color={inputText.trim() && !isSending ? MedicalColors.white : MedicalColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  contextHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: MedicalColors.white,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: MedicalColors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
  },
  placeholder: {
    width: 32,
  },
  messagesList: {
    padding: 16,
    gap: 12,
  },
  messageContainer: {
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  userBubble: {
    backgroundColor: MedicalColors.urgency,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: MedicalColors.white,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: MedicalColors.white,
  },
  assistantText: {
    color: MedicalColors.text,
  },
  timestamp: {
    fontSize: 10,
    color: MedicalColors.textSecondary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  quickOptionsContainer: {
    marginTop: 8,
    gap: 6,
  },
  quickOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: MedicalColors.medicalLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  quickOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: MedicalColors.medical,
  },
  samuButton: {
    backgroundColor: '#DC3545',
  },
  samuButtonText: {
    color: MedicalColors.white,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
    backgroundColor: MedicalColors.white,
    borderTopColor: MedicalColors.border,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    backgroundColor: MedicalColors.white,
    maxHeight: 100,
    minHeight: 44,
    fontSize: 15,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    borderWidth: 1,
    borderColor: MedicalColors.border,
    color: '#000000',
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MedicalColors.urgency,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: MedicalColors.border,
  },
  quickStartContainer: {
    marginTop: 16,
  },
  quickStartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: MedicalColors.text,
    marginBottom: 12,
  },
  quickStartGrid: {
    gap: 10,
  },
  quickStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  quickStartIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStartLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
