import { useLocalSearchParams, useNavigation } from 'expo-router';
import { AlertTriangle, Phone, ChevronRight, X, Ban, RotateCcw } from 'lucide-react-native';
import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MedicalColors } from '@/constants/colors';
import { UI_LANG } from '@/constants/i18n';
import { useFirstAidStore } from '@/store/firstaidStore';
import {
  variantKeys,
  resolveBlockSteps,
  resolveAnswer,
  resolveBlockEnd,
  formatSource,
  isUnvalidated,
  type AnswerTarget,
} from '@/store/firstaid/logic';
import type { Protocol, VariantKey, ActionStep } from '@/types/firstaid';

const LANG = UI_LANG;

type Nav =
  | { view: 'variant' }
  | { view: 'question'; qid: string }
  | { view: 'block'; blockId: string; stepIndex: number }
  | { view: 'end' };

export default function ProtocolScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { getCachedProtocol, fetchProtocol } = useFirstAidStore();

  const [protocol, setProtocol] = useState<Protocol | null>(() =>
    params.id ? getCachedProtocol(params.id, LANG) : null,
  );
  const [variant, setVariant] = useState<VariantKey | null>(null);
  const [nav, setNav] = useState<Nav>({ view: 'variant' });
  const [loading, setLoading] = useState(!protocol);
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [showDoNot, setShowDoNot] = useState(false);

  // Initialise la navigation d'un protocole : variante si dispo, sinon entrée de l'arbre.
  const startProtocol = useCallback((p: Protocol) => {
    const ks = variantKeys(p);
    if (ks.length > 0) {
      setVariant(null);
      setNav({ view: 'variant' });
    } else {
      setVariant(null);
      setNav({ view: 'question', qid: p.decision_tree.entry });
    }
  }, []);

  // Charge (ou bascule vers) un protocole : cache immédiat puis rafraîchissement.
  const loadProtocol = useCallback(
    async (id: string, fromSwitch: boolean) => {
      const cached = getCachedProtocol(id, LANG);
      if (cached) {
        setProtocol(cached);
        startProtocol(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      const fresh = await fetchProtocol(id, LANG);
      if (fresh) {
        setProtocol(fresh);
        if (!cached || fromSwitch) startProtocol(fresh);
      }
      setLoading(false);
    },
    [getCachedProtocol, fetchProtocol, startProtocol],
  );

  useEffect(() => {
    if (params.id) void loadProtocol(params.id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Titre d'en-tête = titre du protocole (vient de l'API).
  useLayoutEffect(() => {
    if (protocol) navigation.setOptions({ title: protocol.title });
  }, [navigation, protocol]);

  const switchTo = useCallback(
    (targetId: string) => {
      setShowRedFlags(false);
      void loadProtocol(targetId, true);
    },
    [loadProtocol],
  );

  const applyTarget = useCallback(
    (t: AnswerTarget) => {
      if (t.kind === 'switch') return switchTo(t.to);
      if (t.kind === 'block') return setNav({ view: 'block', blockId: t.id, stepIndex: 0 });
      if (t.kind === 'question') return setNav({ view: 'question', qid: t.id });
      return setNav({ view: 'end' });
    },
    [switchTo],
  );

  if (loading && !protocol) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={MedicalColors.urgency} />
      </View>
    );
  }
  if (!protocol) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Protocole indisponible hors ligne.</Text>
      </View>
    );
  }

  const emergencyNumber = protocol.emergency_number ?? '';
  const call = () => {
    if (emergencyNumber) void Linking.openURL(`tel:${emergencyNumber}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Bouton d'appel fixe en haut */}
      {emergencyNumber ? (
        <TouchableOpacity style={styles.callButton} onPress={call} activeOpacity={0.85}>
          <Phone color={MedicalColors.white} size={24} />
          <Text style={styles.callText}>Appeler les secours · {emergencyNumber}</Text>
        </TouchableOpacity>
      ) : null}

      {isUnvalidated(protocol.status) ? (
        <View style={styles.testBanner}>
          <Text style={styles.testBannerText}>Données de test, non validées médicalement</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {nav.view === 'variant' ? (
          <VariantChooser
            protocol={protocol}
            onChoose={(v) => {
              setVariant(v);
              setNav({ view: 'question', qid: protocol.decision_tree.entry });
            }}
          />
        ) : null}

        {nav.view === 'question' ? (
          <QuestionView
            protocol={protocol}
            qid={nav.qid}
            onAnswer={(answerKey) => applyTarget(resolveAnswer(protocol, nav.qid, answerKey))}
          />
        ) : null}

        {nav.view === 'block' ? (
          <BlockView
            protocol={protocol}
            variant={variant}
            blockId={nav.blockId}
            stepIndex={nav.stepIndex}
            onNextStep={() => setNav({ view: 'block', blockId: nav.blockId, stepIndex: nav.stepIndex + 1 })}
            onBlockEnd={() => applyTarget(resolveBlockEnd(protocol.action_blocks[nav.blockId]))}
          />
        ) : null}

        {nav.view === 'end' ? (
          <View style={styles.endCard}>
            <Text style={styles.endText}>Fin du protocole.</Text>
            <TouchableOpacity
              style={styles.restartBtn}
              onPress={() => startProtocol(protocol)}
              activeOpacity={0.8}
            >
              <RotateCcw color={MedicalColors.medical} size={18} />
              <Text style={styles.restartText}>Recommencer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* « À ne pas faire » accessible depuis le protocole */}
        {protocol.do_not.length > 0 ? (
          <TouchableOpacity style={styles.doNotLink} onPress={() => setShowDoNot(true)} activeOpacity={0.8}>
            <Ban color={MedicalColors.urgency} size={18} />
            <Text style={styles.doNotLinkText}>À ne pas faire</Text>
            <ChevronRight color={MedicalColors.textSecondary} size={18} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Bouton flottant « Signes d'alerte » toujours visible */}
      {protocol.red_flags.length > 0 ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowRedFlags(true)}
          activeOpacity={0.85}
        >
          <AlertTriangle color={MedicalColors.white} size={20} />
          <Text style={styles.fabText}>Signes d&apos;alerte</Text>
        </TouchableOpacity>
      ) : null}

      {/* Modale red flags */}
      <ListModal
        visible={showRedFlags}
        title="Signes d'alerte"
        onClose={() => setShowRedFlags(false)}
        accent={MedicalColors.urgency}
        items={protocol.red_flags.map((rf) => ({
          text: rf.text,
          source: formatSource(rf.source),
          onPress: rf.switch_to ? () => switchTo(rf.switch_to as string) : undefined,
        }))}
      />
      {/* Modale à ne pas faire */}
      <ListModal
        visible={showDoNot}
        title="À ne pas faire"
        onClose={() => setShowDoNot(false)}
        accent={MedicalColors.urgency}
        items={protocol.do_not.map((d) => ({ text: d.text, source: formatSource(d.source) }))}
      />
    </SafeAreaView>
  );
}

// ---- Choix de variante ----
function VariantChooser({
  protocol,
  onChoose,
}: {
  protocol: Protocol;
  onChoose: (v: VariantKey) => void;
}) {
  const ks = variantKeys(protocol);
  return (
    <View style={styles.block}>
      <Text style={styles.prompt}>{protocol.description}</Text>
      <Text style={styles.subPrompt}>Choisissez la situation :</Text>
      {ks.map((k) => (
        <TouchableOpacity key={k} style={styles.answerBtn} onPress={() => onChoose(k)} activeOpacity={0.8}>
          <Text style={styles.answerText}>{protocol.variants[k]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ---- Une question à la fois ----
function QuestionView({
  protocol,
  qid,
  onAnswer,
}: {
  protocol: Protocol;
  qid: string;
  onAnswer: (answerKey: string) => void;
}) {
  const q = protocol.decision_tree.questions[qid];
  if (!q) return <Text style={styles.empty}>Question introuvable.</Text>;
  return (
    <View style={styles.block}>
      <Text style={styles.prompt}>{q.text}</Text>
      {Object.entries(q.answers).map(([key, a]) => (
        <TouchableOpacity key={key} style={styles.answerBtn} onPress={() => onAnswer(key)} activeOpacity={0.8}>
          <Text style={styles.answerText}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ---- Bloc d'actions : étapes une par une ----
function BlockView({
  protocol,
  variant,
  blockId,
  stepIndex,
  onNextStep,
  onBlockEnd,
}: {
  protocol: Protocol;
  variant: VariantKey | null;
  blockId: string;
  stepIndex: number;
  onNextStep: () => void;
  onBlockEnd: () => void;
}) {
  const block = protocol.action_blocks[blockId];
  const steps = block ? resolveBlockSteps(block, variant) : [];
  const step: ActionStep | undefined = steps[stepIndex];

  if (!block || !step) {
    return <Text style={styles.empty}>Étape introuvable.</Text>;
  }

  const isLast = stepIndex >= steps.length - 1;
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{block.title}</Text>
      <Text style={styles.stepCounter}>
        Étape {step.number} / {steps.length}
      </Text>
      <Text style={styles.stepText}>{step.text}</Text>

      {step.timer_seconds ? (
        <Countdown key={`${blockId}-${stepIndex}`} seconds={step.timer_seconds} />
      ) : null}

      {/* Traçabilité (source) en petit, reste visible */}
      {formatSource(step.source) ? (
        <Text style={styles.source}>{formatSource(step.source)}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={isLast ? onBlockEnd : onNextStep}
        activeOpacity={0.85}
      >
        <Text style={styles.nextBtnText}>{isLast ? 'Terminer' : 'Étape suivante'}</Text>
        <ChevronRight color={MedicalColors.white} size={20} />
      </TouchableOpacity>
    </View>
  );
}

// ---- Compte à rebours visible + vibration à la fin ----
function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    firedRef.current = false;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          if (!firedRef.current) {
            firedRef.current = true;
            Vibration.vibrate(800);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return (
    <View style={styles.timerWrap}>
      <Text style={styles.timerText}>
        {mm}:{ss}
      </Text>
    </View>
  );
}

// ---- Modale générique (red flags / à ne pas faire) ----
function ListModal({
  visible,
  title,
  items,
  accent,
  onClose,
}: {
  visible: boolean;
  title: string;
  accent: string;
  onClose: () => void;
  items: { text: string; source: string; onPress?: () => void }[];
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={[styles.modalHeader, { backgroundColor: accent }]}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X color={MedicalColors.white} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {items.map((it, i) => {
              const Row = it.onPress ? TouchableOpacity : View;
              return (
                <Row
                  key={i}
                  style={styles.modalItem}
                  {...(it.onPress ? { onPress: it.onPress, activeOpacity: 0.8 } : {})}
                >
                  <Text style={styles.modalItemText}>{it.text}</Text>
                  {it.source ? <Text style={styles.source}>{it.source}</Text> : null}
                  {it.onPress ? (
                    <View style={styles.modalItemLink}>
                      <Text style={styles.modalItemLinkText}>Voir le protocole</Text>
                      <ChevronRight color={accent} size={16} />
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
  safe: { flex: 1, backgroundColor: MedicalColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: MedicalColors.background },
  empty: { color: MedicalColors.textSecondary, textAlign: 'center', padding: 24 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: MedicalColors.urgency,
    paddingVertical: 14,
  },
  callText: { color: MedicalColors.white, fontSize: 18, fontWeight: '800' },
  testBanner: {
    backgroundColor: MedicalColors.warningLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.warning,
  },
  testBannerText: { color: MedicalColors.dark, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  content: { padding: 16, paddingBottom: 120, gap: 12 },
  block: {
    backgroundColor: MedicalColors.card,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  prompt: { fontSize: 22, fontWeight: '700', color: MedicalColors.text, lineHeight: 30 },
  subPrompt: { fontSize: 15, color: MedicalColors.textSecondary, fontWeight: '600' },
  answerBtn: {
    backgroundColor: MedicalColors.medicalLight,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: MedicalColors.medical,
  },
  answerText: { fontSize: 18, fontWeight: '700', color: MedicalColors.medicalDark },
  blockTitle: { fontSize: 18, fontWeight: '700', color: MedicalColors.urgencyDark },
  stepCounter: { fontSize: 14, fontWeight: '600', color: MedicalColors.textSecondary },
  stepText: { fontSize: 24, fontWeight: '700', color: MedicalColors.text, lineHeight: 34 },
  source: { fontSize: 11, color: MedicalColors.textSecondary, marginTop: 4 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: MedicalColors.urgency,
    borderRadius: 14,
    paddingVertical: 18,
    marginTop: 4,
  },
  nextBtnText: { color: MedicalColors.white, fontSize: 18, fontWeight: '800' },
  timerWrap: {
    alignSelf: 'center',
    backgroundColor: MedicalColors.dark,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  timerText: { color: MedicalColors.white, fontSize: 40, fontWeight: '800', letterSpacing: 2 },
  endCard: {
    backgroundColor: MedicalColors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  endText: { fontSize: 18, fontWeight: '700', color: MedicalColors.text },
  restartBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restartText: { color: MedicalColors.medical, fontSize: 16, fontWeight: '700' },
  doNotLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: MedicalColors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: MedicalColors.urgencyLight,
  },
  doNotLinkText: { flex: 1, fontSize: 16, fontWeight: '700', color: MedicalColors.urgencyDark },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MedicalColors.urgencyDark,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: MedicalColors.white, fontSize: 15, fontWeight: '800' },
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
  modalItemText: { fontSize: 16, color: MedicalColors.text, lineHeight: 22, fontWeight: '600' },
  modalItemLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  modalItemLinkText: { color: MedicalColors.urgency, fontWeight: '700', fontSize: 14 },
});
