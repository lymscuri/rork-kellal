import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Send,
  Phone,
  AlertTriangle,
  Ban,
  X,
  ChevronRight,
  RotateCcw,
  ClipboardCopy,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MedicalColors } from '@/constants/colors';
import { UI_LANG, type UiLang } from '@/constants/i18n';
import { generateText } from '@/services/ai';
import { firstaidAPI } from '@/store/api';
import { useFirstAidStore } from '@/store/firstaidStore';
import { detectLang } from '@/store/firstaid/lang';
import { STRINGS, withNumber } from '@/store/firstaid/strings';
import { isUnvalidated, formatSource } from '@/store/firstaid/logic';
import {
  ASSISTANT_FREE_ANSWERS,
  buildFreeAnswerPrompt,
  stripMarkdown,
} from '@/store/firstaid/freeAnswer';
import {
  reduceGuided,
  initialGuided,
  buildClassifyContext,
  CLARIFY_MAX_TURNS,
  type GuidedBubble,
  type GuidedEvent,
  type GuidedState,
  type GuidedCtx,
  type IntentOutcome,
} from '@/store/firstaid/guided';
import { FirstAidCountdown } from '@/components/FirstAidCountdown';
import type { Protocol, ProtocolSummary, SourceRef, VariantKey } from '@/types/firstaid';

type ChatBubble =
  | { kind: 'user'; text: string }
  | { kind: 'welcome' }
  | { kind: 'free'; text: string }
  | GuidedBubble;

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  ts: string;
  bubble: ChatBubble;
}

let msgSeq = 0;
function makeMsg(role: 'user' | 'assistant', bubble: ChatBubble): ChatMsg {
  msgSeq += 1;
  return { id: `m${Date.now()}_${msgSeq}`, role, ts: new Date().toISOString(), bubble };
}

export default function EmergencyChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<ChatMsg>>(null);

  const { fetchProtocol, fetchProtocols, fetchMeta, getCachedList, getCachedMeta } =
    useFirstAidStore();

  const [messages, setMessages] = useState<ChatMsg[]>([makeMsg('assistant', { kind: 'welcome' })]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [convLang, setConvLang] = useState<UiLang>(UI_LANG);
  const [emergencyNumber, setEmergencyNumber] = useState<string>(
    () => getCachedMeta(UI_LANG)?.emergency_number ?? '',
  );
  const [summaries, setSummaries] = useState<ProtocolSummary[]>(() => getCachedList(UI_LANG) ?? []);

  const [guided, setGuided] = useState<GuidedState>(initialGuided());
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [showDoNot, setShowDoNot] = useState(false);

  // Refs pour les flux asynchrones (évite les closures périmées).
  const guidedRef = useRef(guided);
  const protocolRef = useRef(protocol);
  const convLangRef = useRef(convLang);
  guidedRef.current = guided;
  protocolRef.current = protocol;
  convLangRef.current = convLang;

  // Historique des messages utilisateur de la conversation (pour le contexte de
  // classification sur les 3 derniers). Vide = nouvelle conversation.
  const userHistoryRef = useRef<string[]>([]);

  // Référence au champ (pour blur()) et miroir SYNCHRONE de sa valeur : lu à
  // l'envoi pour ne pas dépendre de l'état React (mot en composition perdu).
  const inputRef = useRef<TextInput>(null);
  const inputValueRef = useRef('');

  // Miroir des messages (pour l'export, sans re-créer le callback à chaque bulle).
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Journal des appels backend pour l'export de test (route, code, champs clés).
  const debugLogRef = useRef<string[]>([]);
  const logCall = useCallback((route: string, http: number | string, fields: Record<string, unknown>) => {
    const parts = Object.entries(fields)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
    debugLogRef.current.push(`[${route} → ${http}] ${parts.join(' ')}`.trim());
  }, []);

  const L = STRINGS[convLang];

  // Outils de test visibles tant que l'API n'est pas la PRODUCTION FINALE.
  // Aujourd'hui tout est staging (y compris l'hôte Railway « -production »,
  // qui est un environnement de test) : les outils sont donc toujours visibles.
  // Le jour où un hôte de production final existe, l'ajouter à PROD_HOSTS.
  const PROD_HOSTS: string[] = [];
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  const showTestTools = !PROD_HOSTS.some((h) => apiUrl.includes(h));

  // Charge méta + liste (numéro d'urgence, boutons de repli), cache d'abord.
  useEffect(() => {
    void (async () => {
      const m = await fetchMeta(UI_LANG);
      if (m?.emergency_number) setEmergencyNumber(m.emergency_number);
      const list = await fetchProtocols(UI_LANG);
      if (list) setSummaries(list);
    })();
  }, [fetchMeta, fetchProtocols]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const appendBubbles = useCallback((bubbles: ChatBubble[]) => {
    if (bubbles.length === 0) return;
    setMessages((prev) => [...prev, ...bubbles.map((b) => makeMsg('assistant', b))]);
  }, []);

  const ctx = useCallback(
    (): GuidedCtx => ({
      lang: convLangRef.current,
      emergencyNumber,
      protocols: summaries.map((s) => ({ id: s.id, title: s.title })),
    }),
    [emergencyNumber, summaries],
  );

  // Dispatch central : applique la machine à états et affiche les bulles/effets.
  const dispatch = useCallback(
    (event: GuidedEvent) => {
      const proto =
        event.type === 'classified' || event.type === 'switchLoaded'
          ? event.protocol
          : protocolRef.current;
      const res = reduceGuided(ctx(), guidedRef.current, event, proto);
      guidedRef.current = res.state;
      setGuided(res.state);
      if (event.type === 'classified' || event.type === 'switchLoaded') {
        protocolRef.current = event.protocol;
        setProtocol(event.protocol);
      }
      appendBubbles(res.bubbles);
      if (res.effect?.type === 'loadProtocol') void loadAndSwitch(res.effect.id);
      scrollToEnd();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, appendBubbles, scrollToEnd],
  );

  // switch_to : charge le protocole cible puis relance la machine dessus.
  const loadAndSwitch = useCallback(
    async (id: string) => {
      const p = await fetchProtocol(id, convLangRef.current);
      if (p) dispatch({ type: 'switchLoaded', protocol: p });
      else dispatch({ type: 'unavailable' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchProtocol],
  );

  // Filet de sécurité Groq (désactivé par défaut).
  const runFreeAnswer = useCallback(
    async (userText: string, lang: UiLang) => {
      try {
        const raw = await generateText({
          messages: [
            { role: 'assistant', content: buildFreeAnswerPrompt(lang) },
            { role: 'user', content: userText },
          ],
        });
        const clean = stripMarkdown(raw || '');
        if (clean) appendBubbles([{ kind: 'free', text: clean }]);
      } catch (e) {
        console.warn('[chat] free answer indisponible:', e);
      }
    },
    [appendBubbles],
  );

  // Flux de classification (phase idle / no_protocol / precision).
  // On classifie le CONTEXTE : concaténation des 3 derniers messages utilisateur
  // (2a). Sur scenario null, on enchaîne sur /clarify/ (dialogue mené par le modèle).
  const classifyFlow = useCallback(
    async (text: string, lang: UiLang) => {
      const context = buildClassifyContext(userHistoryRef.current);
      const toClassify = context || text;
      try {
        const res = await firstaidAPI.classify(toClassify, lang);
        logCall('classify', res.status, { scenario: res.data?.data?.scenario, confidence: res.data?.data?.confidence });
        if (res.status === 503) {
          dispatch({ type: 'unavailable' });
          return;
        }
        const data = res.data?.data;
        if (data?.emergency_number) setEmergencyNumber(data.emergency_number);
        if (data?.scenario && data.protocol?.id) {
          const full = await fetchProtocol(data.protocol.id, lang);
          if (full) {
            dispatch({ type: 'classified', protocol: full });
            return;
          }
          dispatch({ type: 'unavailable' });
          return;
        }
        // scenario null → on demande au modèle UNE question de clarification.
        const turn = guidedRef.current.clarifyTurn + 1;
        if (turn > CLARIFY_MAX_TURNS) {
          dispatch({ type: 'clarified', question: null }); // quota atteint → repli
          return;
        }
        const cres = await firstaidAPI.clarify(toClassify, lang, turn);
        logCall('clarify', cres.status, { turn, question: cres.data?.data?.question, source: cres.data?.data?.source });
        if (cres.status === 503) {
          dispatch({ type: 'unavailable' });
          return;
        }
        const question = cres.data?.data?.question ?? null;
        dispatch({ type: 'clarified', question });
        if (ASSISTANT_FREE_ANSWERS) void runFreeAnswer(text, lang);
      } catch (e) {
        console.warn('[chat] classify/clarify indisponible/hors ligne:', e);
        dispatch({ type: 'unavailable' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchProtocol, runFreeAnswer],
  );

  // Options de la question en cours (clé → libellé) pour /intent/ en phase question.
  const questionOptions = useCallback((): Record<string, string> | null => {
    const p = protocolRef.current;
    const phase = guidedRef.current.phase;
    if (!p || phase.kind !== 'question') return null;
    const q = p.decision_tree.questions[phase.qid];
    if (!q) return null;
    return Object.fromEntries(Object.entries(q.answers).map(([k, a]) => [k, a.label]));
  }, []);

  // Texte libre tapé pendant un protocole (phase question/block) → /intent/.
  // Le serveur choisit UNE intention parmi des options fixes ; on la rejoue dans
  // la machine à états. En 503/hors ligne → repli local (intentUnavailable).
  const intentFlow = useCallback(
    async (text: string, lang: UiLang) => {
      const p = protocolRef.current;
      const phaseKind = guidedRef.current.phase.kind;
      if (!p || (phaseKind !== 'question' && phaseKind !== 'block')) return;
      const phase: 'question' | 'block' = phaseKind === 'question' ? 'question' : 'block';
      const qOpts = phase === 'question' ? questionOptions() : null;
      try {
        const res = await firstaidAPI.intent(text, lang, p.id, phase, qOpts);
        logCall('intent', res.status, { phase, intent: res.data?.data?.intent, confidence: res.data?.data?.confidence });
        if (res.status === 503) {
          dispatch({ type: 'intentUnavailable' });
          return;
        }
        const d = res.data?.data;
        const target = d?.target;
        let outcome: IntentOutcome;
        if (d?.intent === 'off_topic') outcome = { kind: 'off_topic' };
        else if (!target) outcome = { kind: 'unclear' };
        else if (target.kind === 'answer') outcome = { kind: 'answer', key: String(target.key) };
        else if (target.kind === 'switch') outcome = { kind: 'switch', id: String(target.id) };
        else if (target.kind === 'red_flag') {
          outcome = { kind: 'red_flag', label: String(target.label), switchTo: target.switch_to };
        } else outcome = { kind: 'unclear' };
        dispatch({ type: 'intent', outcome });
      } catch (e) {
        console.warn('[chat] intent indisponible/hors ligne:', e);
        dispatch({ type: 'intentUnavailable' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questionOptions],
  );

  const onSend = useCallback(
    // `raw` = texte capturé à la source (nativeEvent.text du clavier, ou la
    // valeur du champ au tap). On NE lit PAS l'état React `inputText` : sur
    // Android un mot encore en composition clavier n'y est pas encore reflété,
    // ce qui tronquait le message (« je suis blessé » -> « je suis »).
    async (raw?: string) => {
      // Priorité : valeur explicite -> miroir ref (synchro) -> état (dernier recours).
      const source = raw ?? inputValueRef.current ?? inputText;
      const text = source.trim();
      if (!text || isSending) return;
      // On ne vide le champ qu'APRÈS avoir capturé le texte.
      inputValueRef.current = '';
      setInputText('');
      inputRef.current?.blur();
      // La bulle affiche exactement le texte envoyé.
      setMessages((prev) => [...prev, makeMsg('user', { kind: 'user', text })]);
      // Historique pour le contexte de classification (3 derniers messages).
      userHistoryRef.current = [...userHistoryRef.current, text];

      // La langue du dernier message utilisateur fixe toute la suite.
      const detected = detectLang(text);
      const lang = detected ?? convLangRef.current ?? UI_LANG;
      convLangRef.current = lang;
      setConvLang(lang);

      setIsSending(true);
      try {
        const phase = guidedRef.current.phase.kind;
        if (phase === 'question' || phase === 'block') {
          // Texte libre pendant un protocole → /intent/ (answer/red_flag/switch/…).
          await intentFlow(text, lang);
        } else {
          // idle / precision / no_protocol / end / variant : classification (+ clarify).
          await classifyFlow(text, lang);
        }
      } finally {
        setIsSending(false);
        scrollToEnd();
      }
    },
    [inputText, isSending, intentFlow, classifyFlow, scrollToEnd],
  );

  const call = useCallback((number: string) => {
    if (number) void Linking.openURL(`tel:${number}`);
  }, []);

  // Outil de test : nouvelle conversation (vide bulles, contexte, machine, turn).
  const newConversation = useCallback(() => {
    userHistoryRef.current = [];
    debugLogRef.current = [];
    const fresh = initialGuided();
    guidedRef.current = fresh;
    setGuided(fresh);
    protocolRef.current = null;
    setProtocol(null);
    setMessages([makeMsg('assistant', { kind: 'welcome' })]);
    inputValueRef.current = '';
    setInputText('');
  }, []);

  // Outil de test (staging) : copie un export texte de la conversation + log des
  // appels backend dans le presse-papiers.
  const copyTranscript = useCallback(() => {
    const lines = messagesRef.current.map((m) => {
      const b = m.bubble;
      const who = m.role === 'user' ? 'USER' : 'ASSISTANT';
      let detail = '';
      if (b.kind === 'user' || b.kind === 'free' || b.kind === 'modelText') detail = b.text;
      else if (b.kind === 'say') detail = withNumber(L[b.textKey], emergencyNumber);
      else if (b.kind === 'redFlag') detail = `${L.redFlags}: ${b.label}`;
      else if (b.kind === 'prompt') detail = (b.textKey ? L[b.textKey] : b.text ?? '') + ' [' + b.options.map((o) => o.key).join(',') + ']';
      else if (b.kind === 'step') detail = `${b.blockTitle} — ${b.text}`;
      else if (b.kind === 'callButton' || b.kind === 'emergency') detail = `☎ ${b.number}`;
      else if (b.kind === 'protocols') detail = b.items.map((i) => i.id).join(', ');
      else if (b.kind === 'welcome') detail = L.intro;
      return `${who} <${b.kind}> ${detail}`.trim();
    });
    const out = [
      '=== Conversation Kendeya (export de test) ===',
      `API: ${process.env.EXPO_PUBLIC_API_URL ?? '(défaut)'}`,
      '',
      ...lines,
      '',
      '=== Appels backend ===',
      ...debugLogRef.current,
    ].join('\n');
    void Clipboard.setStringAsync(out).then(() => {
      Alert.alert(L.copied);
    });
  }, [emergencyNumber, L]);

  const onOption = useCallback(
    (bubble: Extract<GuidedBubble, { kind: 'prompt' }>, key: string) => {
      if (isSending) return;
      if (bubble.choiceKind === 'variant') dispatch({ type: 'chooseVariant', variant: key as VariantKey });
      else dispatch({ type: 'answer', key });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSending],
  );

  const startFromProtocol = useCallback(
    async (id: string) => {
      if (isSending) return;
      setIsSending(true);
      try {
        const p = await fetchProtocol(id, convLangRef.current);
        if (p) dispatch({ type: 'classified', protocol: p });
        else dispatch({ type: 'unavailable' });
      } finally {
        setIsSending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchProtocol, isSending],
  );

  // Mode guidé actif avec un protocole chargé (pour FAB/bannière).
  const guidedActive =
    protocol != null &&
    (guided.phase.kind === 'variant' ||
      guided.phase.kind === 'question' ||
      guided.phase.kind === 'block' ||
      guided.phase.kind === 'end');

  // Placeholder du champ selon la phase (§3).
  const phasePlaceholder = (() => {
    switch (guided.phase.kind) {
      case 'precision': return L.placeholders.precision;
      case 'question':
      case 'variant': return L.placeholders.question;
      case 'block': return L.placeholders.block;
      case 'end': return L.placeholders.end;
      default: return L.placeholders.idle; // idle / no_protocol
    }
  })();

  const renderBubble = useCallback(
    (msg: ChatMsg) => {
      const b = msg.bubble;
      if (b.kind === 'user') {
        return (
          <View style={[styles.row, styles.rowUser]}>
            <View style={[styles.bubble, styles.userBubble]}>
              <Text style={styles.userText}>{b.text}</Text>
            </View>
          </View>
        );
      }
      if (b.kind === 'welcome') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.assistantText}>{L.intro}</Text>
            </View>
          </View>
        );
      }
      if (b.kind === 'free') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.assistantText}>{b.text}</Text>
            </View>
          </View>
        );
      }
      // Question de clarification du modèle (validée backend) — affichée telle quelle.
      if (b.kind === 'modelText') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.assistantText}>{b.text}</Text>
            </View>
          </View>
        );
      }
      // Signe d'alerte reconnu dans un texte libre : « Signe d'alerte : <label> ».
      if (b.kind === 'redFlag') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.redFlagBubble]}>
              <View style={styles.redFlagHeader}>
                <AlertTriangle color={MedicalColors.urgencyDark} size={16} />
                <Text style={styles.redFlagLabel}>{L.redFlags}</Text>
              </View>
              <Text style={styles.redFlagText}>{b.label}</Text>
            </View>
          </View>
        );
      }
      if (b.kind === 'emergency') {
        return (
          <TouchableOpacity style={styles.emergencyBubble} onPress={() => call(b.number)} activeOpacity={0.85}>
            <Phone color={MedicalColors.white} size={26} />
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyLabel}>{withNumber(L.callEmergency, b.number).replace(` · ${b.number}`, '')}</Text>
              <Text style={styles.emergencyNumber}>{b.number}</Text>
            </View>
          </TouchableOpacity>
        );
      }
      if (b.kind === 'callButton') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <TouchableOpacity style={styles.callBtn} onPress={() => call(b.number)} activeOpacity={0.85}>
              <Phone color={MedicalColors.white} size={18} />
              <Text style={styles.callBtnText}>{withNumber(L.callEmergency, b.number)}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (b.kind === 'say') {
        const text = withNumber(L[b.textKey], emergencyNumber);
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.assistantText}>{text}</Text>
            </View>
          </View>
        );
      }
      if (b.kind === 'prompt') {
        const title = b.textKey ? L[b.textKey] : b.text ?? '';
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.assistantBubble, styles.promptBubble]}>
              <Text style={styles.promptText}>{title}</Text>
              {b.options.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.optionBtn}
                  onPress={() => onOption(b, opt.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      }
      if (b.kind === 'step') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.assistantBubble, styles.stepBubble]}>
              <Text style={styles.stepBlockTitle}>{b.blockTitle}</Text>
              <Text style={styles.stepCounter}>{L.stepLabel(b.stepNumber, b.stepTotal)}</Text>
              <Text style={styles.stepText}>{b.text}</Text>
              {b.timerSeconds ? (
                <FirstAidCountdown key={`${b.blockId}-${b.stepIndex}`} seconds={b.timerSeconds} />
              ) : null}
              {b.source ? <Text style={styles.source}>{b.source}</Text> : null}
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => !isSending && dispatch({ type: 'next' })}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>{b.isLast ? L.finish : L.next}</Text>
                <ChevronRight color={MedicalColors.white} size={18} />
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      if (b.kind === 'protocols') {
        return (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={[styles.bubble, styles.assistantBubble, styles.promptBubble]}>
              <Text style={styles.promptText}>{L.chooseSituation}</Text>
              {b.items.map((it) => (
                <TouchableOpacity
                  key={it.id}
                  style={styles.optionBtn}
                  onPress={() => startFromProtocol(it.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{it.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      }
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [L, emergencyNumber, isSending, call, onOption, startFromProtocol],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={MedicalColors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{L.headerTitle}</Text>
          <Text style={styles.headerSubtitle}>{L.headerSubtitle}</Text>
        </View>
        <View style={styles.headerActions}>
          {showTestTools ? (
            <TouchableOpacity
              onPress={copyTranscript}
              onLongPress={copyTranscript}
              style={styles.headerBtn}
              accessibilityLabel={L.copyTranscript}
            >
              <ClipboardCopy size={20} color={MedicalColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={newConversation}
            style={styles.headerBtn}
            accessibilityLabel={L.newConversation}
          >
            <RotateCcw size={20} color={MedicalColors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {guidedActive && protocol && isUnvalidated(protocol.status) ? (
        <View style={styles.testBanner}>
          <Text style={styles.testBannerText}>{L.testBanner}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => renderBubble(item)}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
        />

        {isSending ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={MedicalColors.urgency} size="small" />
          </View>
        ) : null}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={phasePlaceholder}
            placeholderTextColor={MedicalColors.textSecondary}
            value={inputText}
            onChangeText={(t) => {
              inputValueRef.current = t;
              setInputText(t);
            }}
            multiline
            maxLength={500}
            editable={!isSending}
            // On lit le texte de l'ÉVÉNEMENT (committé, mot de composition inclus).
            onSubmitEditing={(e) => onSend(e.nativeEvent.text)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
            // blur() commite un éventuel mot en composition ; onSend lit le miroir.
            onPress={() => {
              inputRef.current?.blur();
              onSend();
            }}
            disabled={!inputText.trim() || isSending}
          >
            <Send size={20} color={inputText.trim() && !isSending ? MedicalColors.white : MedicalColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* « Signes d'alerte » toujours visible pendant le mode guidé */}
      {guidedActive && protocol && protocol.red_flags.length > 0 ? (
        <TouchableOpacity style={styles.fab} onPress={() => setShowRedFlags(true)} activeOpacity={0.85}>
          <AlertTriangle color={MedicalColors.white} size={18} />
          <Text style={styles.fabText}>{L.redFlags}</Text>
        </TouchableOpacity>
      ) : null}

      <GuidedListModal
        visible={showRedFlags}
        title={L.redFlags}
        onClose={() => setShowRedFlags(false)}
        items={(protocol?.red_flags ?? []).map((rf) => ({
          text: rf.text,
          source: rf.source,
          onPress: rf.switch_to
            ? () => {
                setShowRedFlags(false);
                void loadAndSwitch(rf.switch_to as string);
              }
            : undefined,
        }))}
      />
      <GuidedListModal
        visible={showDoNot}
        title={L.doNot}
        onClose={() => setShowDoNot(false)}
        items={(protocol?.do_not ?? []).map((d) => ({ text: d.text, source: d.source }))}
      />

      {/* Accès « À ne pas faire » pendant le mode guidé */}
      {guidedActive && protocol && protocol.do_not.length > 0 ? (
        <TouchableOpacity style={styles.doNotFab} onPress={() => setShowDoNot(true)} activeOpacity={0.85}>
          <Ban color={MedicalColors.white} size={16} />
          <Text style={styles.fabText}>{L.doNot}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function GuidedListModal({
  visible,
  title,
  items,
  onClose,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  items: { text: string; source: SourceRef; onPress?: () => void }[];
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X color={MedicalColors.white} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {items.map((it, i) => {
              const Row = it.onPress ? TouchableOpacity : View;
              return (
                <Row key={i} style={styles.modalItem} {...(it.onPress ? { onPress: it.onPress, activeOpacity: 0.8 } : {})}>
                  <Text style={styles.modalItemText}>{it.text}</Text>
                  {formatSource(it.source) ? <Text style={styles.source}>{formatSource(it.source)}</Text> : null}
                  {it.onPress ? (
                    <View style={styles.modalItemLink}>
                      <ChevronRight color={MedicalColors.urgency} size={16} />
                    </View>
                  ) : null}
                </Row>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: MedicalColors.white,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtn: { padding: 4 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: MedicalColors.text },
  headerSubtitle: { fontSize: 12, color: MedicalColors.textSecondary },
  testBanner: {
    backgroundColor: MedicalColors.warningLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.warning,
  },
  testBannerText: { color: MedicalColors.dark, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  row: { maxWidth: '88%' },
  rowUser: { alignSelf: 'flex-end' },
  rowAssistant: { alignSelf: 'flex-start' },
  bubble: { padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: MedicalColors.urgency, borderBottomRightRadius: 4 },
  userText: { color: MedicalColors.white, fontSize: 15, lineHeight: 20 },
  assistantBubble: {
    backgroundColor: MedicalColors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  assistantText: { color: MedicalColors.text, fontSize: 15, lineHeight: 21 },
  redFlagBubble: {
    backgroundColor: MedicalColors.urgencyLight,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: MedicalColors.urgency,
  },
  redFlagHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  redFlagLabel: { color: MedicalColors.urgencyDark, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  redFlagText: { color: MedicalColors.urgencyDark, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  emergencyBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: MedicalColors.urgency,
    borderRadius: 16,
    padding: 16,
  },
  emergencyLabel: { color: MedicalColors.white, fontSize: 14, fontWeight: '600' },
  emergencyNumber: { color: MedicalColors.white, fontSize: 32, fontWeight: '800', letterSpacing: 1 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MedicalColors.urgency,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  callBtnText: { color: MedicalColors.white, fontSize: 15, fontWeight: '700' },
  promptBubble: { gap: 10 },
  promptText: { color: MedicalColors.text, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  optionBtn: {
    backgroundColor: MedicalColors.medicalLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: MedicalColors.medical,
  },
  optionText: { color: MedicalColors.medicalDark, fontSize: 16, fontWeight: '700' },
  stepBubble: { gap: 8 },
  stepBlockTitle: { color: MedicalColors.urgencyDark, fontSize: 15, fontWeight: '700' },
  stepCounter: { color: MedicalColors.textSecondary, fontSize: 13, fontWeight: '600' },
  stepText: { color: MedicalColors.text, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  source: { color: MedicalColors.textSecondary, fontSize: 11, marginTop: 2 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: MedicalColors.urgency,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  nextBtnText: { color: MedicalColors.white, fontSize: 16, fontWeight: '800' },
  loadingRow: { alignItems: 'center', paddingVertical: 6 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: MedicalColors.white,
    borderTopColor: MedicalColors.border,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MedicalColors.border,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#000',
    textAlignVertical: 'top',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MedicalColors.urgency,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendBtnDisabled: { backgroundColor: MedicalColors.border },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MedicalColors.urgencyDark,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 28,
    elevation: 6,
  },
  doNotFab: {
    position: 'absolute',
    left: 16,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: MedicalColors.dark,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    elevation: 6,
  },
  fabText: { color: MedicalColors.white, fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: MedicalColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: MedicalColors.urgency,
  },
  modalTitle: { color: MedicalColors.white, fontSize: 18, fontWeight: '800' },
  modalBody: { padding: 16, gap: 12 },
  modalItem: {
    backgroundColor: MedicalColors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  modalItemText: { color: MedicalColors.text, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  modalItemLink: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
});
