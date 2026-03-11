import { generateText } from '@rork-ai/toolkit-sdk';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Surface, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MedicalColors } from '@/constants/colors';
import { Send, Phone, ChevronLeft } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function EmergencyChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isSending, setIsSending] = useState(false);

  const getSystemContext = useCallback(() => {
    let context = "Tu es un assistant médical de premiers secours pour l'application SanteConnect. ";
    context += "Tu dois donner des conseils de premiers secours clairs et précis en français. ";
    context += "Tu dois toujours recommander de contacter les secours médicaux pour les situations graves. ";
    context += "Réponds de manière concise et structurée. Ne donne pas de diagnostic médical définitif. ";
    context += "Sois empathique et rassurant tout en restant professionnel.";
    return context;
  }, []);

  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: "Bonjour ! Je suis votre assistant de premiers secours. Décrivez-moi la situation d'urgence et je vous guiderai étape par étape. N'oubliez pas d'appeler le 15 en cas de gravité.",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isSending) return;

    Keyboard.dismiss();

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');
    setIsSending(true);

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
          { role: 'user', content: currentInput },
        ],
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response || "Je n'ai pas pu traiter votre demande. En cas d'urgence, appelez immédiatement le 15.",
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Je rencontre des difficultés techniques. En cas d'urgence, appelez immédiatement le 15. Les secours pourront vous aider.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, messages, getSystemContext]);

  const handleCallEmergency = useCallback(async () => {
    const url = 'tel:15';
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageContainer, item.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
      <Surface style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
          {item.content}
        </Text>
      </Surface>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <Surface style={[styles.contextHeader, { paddingTop: insets.top + 8 }]}>
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
      </Surface>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
        />

        {isSending && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={MedicalColors.urgency} size="small" />
            <Text style={styles.loadingText}>{"L'assistant réfléchit..."}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.emergencyCallButton} onPress={handleCallEmergency}>
          <Phone size={20} color={MedicalColors.white} />
          <Text style={styles.emergencyCallText}>Appeler le 15</Text>
        </TouchableOpacity>

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder="Décrivez la situation d'urgence..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            mode="outlined"
            outlineColor={MedicalColors.border}
            activeOutlineColor={MedicalColors.urgency}
            disabled={isSending}
            onFocus={scrollToEnd}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]} 
            onPress={handleSendMessage}
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
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MedicalColors.urgency,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emergencyCallText: {
    color: MedicalColors.white,
    fontWeight: 'bold' as const,
    fontSize: 16,
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
    backgroundColor: MedicalColors.background,
    maxHeight: 100,
    fontSize: 15,
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
});
