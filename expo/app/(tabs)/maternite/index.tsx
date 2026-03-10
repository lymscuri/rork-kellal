import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
  TextInput as RNTextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import {
  Heart,
  Baby,
  Bell,
  MessageCircle,
  BarChart3,
  Syringe,
  Calendar,
  ChevronRight,
  Plus,
  AlertTriangle,
  CheckCircle2,

  Activity,
  Users,
} from "lucide-react-native";

const MATERNITY_ACCENT = "#E91E8C";
const MATERNITY_LIGHT = "#FDE4F2";
const MATERNITY_DARK = "#B0156D";
const MATERNITY_BG = "#FFF8FC";
const CARD_BG = "#FFFFFF";
const WARM_ORANGE = "#FF8A50";
const TEAL = "#00BFA5";

export default function MaternityDashboard() {
  const router = useRouter();
  const {
    maternityData,
    setPregnancy,
    getVaccinationCoverage,
    getConsultationAdherence,
    getVaccinationDelays,
  } = useMedicalStore();

  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [showNewPregnancy, setShowNewPregnancy] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const pregnancy = maternityData.pregnancy;
  const progress = useMemo(
    () => (pregnancy ? Math.min(pregnancy.currentWeek / 40, 1) : 0),
    [pregnancy]
  );
  const vaccineCoverage = useMemo(() => getVaccinationCoverage(), [getVaccinationCoverage]);
  const consultationAdherence = useMemo(() => getConsultationAdherence(), [getConsultationAdherence]);
  const delays = useMemo(() => getVaccinationDelays(), [getVaccinationDelays]);
  const unreadMessages = useMemo(
    () => maternityData.messages.filter((m) => !m.isRead).length,
    [maternityData.messages]
  );
  const pendingReminders = useMemo(
    () => maternityData.reminders.filter((r) => r.status === "pending").length,
    [maternityData.reminders]
  );

  const handleSetPregnancy = useCallback(() => {
    if (!lastPeriodDate) {
      Alert.alert("Erreur", "Veuillez entrer la date de votre dernier cycle (AAAA-MM-JJ)");
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(lastPeriodDate)) {
      Alert.alert("Format invalide", "Utilisez le format AAAA-MM-JJ");
      return;
    }
    const date = new Date(lastPeriodDate);
    if (isNaN(date.getTime())) {
      Alert.alert("Date invalide", "Veuillez entrer une date valide");
      return;
    }
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + 280);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

    setPregnancy({
      id: Date.now().toString(),
      lastPeriodDate,
      dueDate: dueDate.toISOString().split("T")[0],
      currentWeek: Math.min(currentWeek, 42),
      isActive: true,
    });
    setLastPeriodDate("");
    setShowNewPregnancy(false);
  }, [lastPeriodDate, setPregnancy]);

  const getTrimester = useCallback((week: number) => {
    if (week <= 12) return { label: "1er trimestre", color: TEAL };
    if (week <= 27) return { label: "2ème trimestre", color: WARM_ORANGE };
    return { label: "3ème trimestre", color: MATERNITY_ACCENT };
  }, []);

  const nextConsultation = useMemo(() => {
    return maternityData.consultations.find((c) => c.status === "a_venir");
  }, [maternityData.consultations]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <Animated.View
          style={[
            styles.headerContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerGreeting}>Santé Maternelle</Text>
              <Text style={styles.headerSubtitle}>
                Suivi grossesse & enfants
              </Text>
            </View>
            <TouchableOpacity
              style={styles.messageBadgeContainer}
              onPress={() => router.push("/(tabs)/maternite/communication" as any)}
            >
              <MessageCircle size={24} color={MATERNITY_DARK} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadMessages}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {pregnancy ? (
            <Animated.View
              style={[
                styles.pregnancyCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.pregnancyCardHeader}>
                <View style={styles.pregnancyWeekContainer}>
                  <Text style={styles.pregnancyWeekLabel}>Semaine</Text>
                  <Text style={styles.pregnancyWeekNumber}>
                    {pregnancy.currentWeek}
                  </Text>
                  <Text style={styles.pregnancyWeekOf}>/40</Text>
                </View>
                <View style={styles.pregnancyMeta}>
                  <View
                    style={[
                      styles.trimesterBadge,
                      {
                        backgroundColor:
                          getTrimester(pregnancy.currentWeek).color + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trimesterText,
                        { color: getTrimester(pregnancy.currentWeek).color },
                      ]}
                    >
                      {getTrimester(pregnancy.currentWeek).label}
                    </Text>
                  </View>
                  <Text style={styles.dueDateText}>
                    Terme: {pregnancy.dueDate}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
                <View
                  style={[
                    styles.progressDot,
                    { left: `${Math.min(progress * 100, 97)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelText}>0</Text>
                <Text style={styles.progressLabelText}>12</Text>
                <Text style={styles.progressLabelText}>27</Text>
                <Text style={styles.progressLabelText}>40</Text>
              </View>
              {nextConsultation && (
                <TouchableOpacity
                  style={styles.nextConsultationBanner}
                  onPress={() =>
                    router.push("/(tabs)/maternite/vaccinations" as any)
                  }
                >
                  <Calendar size={16} color={MATERNITY_DARK} />
                  <Text style={styles.nextConsultationText}>
                    Prochain RDV: {nextConsultation.title} (S
                    {nextConsultation.week})
                  </Text>
                  <ChevronRight size={16} color={MATERNITY_DARK} />
                </TouchableOpacity>
              )}
            </Animated.View>
          ) : (
            <View style={styles.noPregnancyCard}>
              {showNewPregnancy ? (
                <View style={styles.newPregnancyForm}>
                  <Heart
                    size={32}
                    color={MATERNITY_ACCENT}
                    style={{ alignSelf: "center" as const, marginBottom: 12 }}
                  />
                  <Text style={styles.formTitle}>Nouveau suivi grossesse</Text>
                  <Text style={styles.formSubtitle}>
                    Entrez la date de votre dernier cycle menstruel
                  </Text>
                  <RNTextInput
                    style={styles.dateInput}
                    value={lastPeriodDate}
                    onChangeText={setLastPeriodDate}
                    placeholder="AAAA-MM-JJ"
                    placeholderTextColor={MedicalColors.textSecondary}
                    keyboardType="default"
                  />
                  <View style={styles.formButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setShowNewPregnancy(false)}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.confirmButton,
                        !lastPeriodDate && styles.confirmButtonDisabled,
                      ]}
                      onPress={handleSetPregnancy}
                      disabled={!lastPeriodDate}
                    >
                      <Text style={styles.confirmButtonText}>Commencer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addPregnancyButton}
                  onPress={() => setShowNewPregnancy(true)}
                >
                  <View style={styles.addPregnancyIcon}>
                    <Plus size={28} color={MATERNITY_ACCENT} />
                  </View>
                  <Text style={styles.addPregnancyTitle}>
                    Démarrer un suivi de grossesse
                  </Text>
                  <Text style={styles.addPregnancySubtitle}>
                    Suivi hebdomadaire, consultations et rappels
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {delays.length > 0 && (
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <AlertTriangle size={20} color="#D32F2F" />
                <Text style={styles.alertTitle}>
                  {delays.length} vaccination(s) en retard
                </Text>
              </View>
              {delays.slice(0, 3).map((d) => (
                <View key={d.vaccineId} style={styles.alertItem}>
                  <Text style={styles.alertItemName}>{d.name}</Text>
                  <Text style={styles.alertItemDelay}>
                    +{d.delayDays} jours
                  </Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.alertAction}
                onPress={() =>
                  router.push("/(tabs)/maternite/vaccinations")
                }
              >
                <Text style={styles.alertActionText}>
                  Voir le calendrier vaccinal
                </Text>
                <ChevronRight size={14} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
              <Syringe size={20} color="#2E7D32" />
              <Text style={styles.statValue}>{vaccineCoverage}%</Text>
              <Text style={styles.statLabel}>Vaccinations</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
              <Activity size={20} color="#1565C0" />
              <Text style={styles.statValue}>{consultationAdherence}%</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
              <Users size={20} color="#E65100" />
              <Text style={styles.statValue}>
                {maternityData.children.length}
              </Text>
              <Text style={styles.statLabel}>Enfants</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon={<Syringe size={22} color="#2E7D32" />}
              label="Vaccinations"
              sublabel="Calendrier PEV"
              bgColor="#E8F5E9"
              onPress={() =>
                router.push("/(tabs)/maternite/vaccinations" as any)
              }
            />
            <QuickAction
              icon={<Bell size={22} color={WARM_ORANGE} />}
              label="Rappels"
              sublabel={
                pendingReminders > 0
                  ? `${pendingReminders} en attente`
                  : "SMS & Voix"
              }
              bgColor="#FFF3E0"
              onPress={() =>
                router.push("/(tabs)/maternite/reminders" as any)
              }
            />
            <QuickAction
              icon={<BarChart3 size={22} color="#1565C0" />}
              label="Rapports"
              sublabel="Analyses"
              bgColor="#E3F2FD"
              onPress={() =>
                router.push("/(tabs)/maternite/reports" as any)
              }
            />
            <QuickAction
              icon={<MessageCircle size={22} color={MATERNITY_ACCENT} />}
              label="Messages"
              sublabel={
                unreadMessages > 0
                  ? `${unreadMessages} non lu(s)`
                  : "Soignants"
              }
              bgColor={MATERNITY_LIGHT}
              onPress={() =>
                router.push("/(tabs)/maternite/communication")
              }
            />
          </View>

          {maternityData.children.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Mes enfants</Text>
              {maternityData.children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={styles.childRow}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/maternite/child-details" as any,
                      params: { childId: child.id },
                    })
                  }
                >
                  <View style={styles.childAvatar}>
                    <Baby size={22} color={MATERNITY_ACCENT} />
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.firstName}</Text>
                    {child.birthDate && (
                      <Text style={styles.childDate}>
                        Né(e) le {child.birthDate}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={18} color={MedicalColors.textSecondary} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {maternityData.consultations.filter((c) => c.status === "effectuee")
            .length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Dernières consultations</Text>
              {maternityData.consultations
                .filter((c) => c.status === "effectuee")
                .slice(0, 3)
                .map((c) => (
                  <View key={c.id} style={styles.consultationRow}>
                    <CheckCircle2 size={18} color={MedicalColors.life} />
                    <View style={styles.consultationInfo}>
                      <Text style={styles.consultationTitle}>{c.title}</Text>
                      <Text style={styles.consultationDate}>
                        {c.date ? `Effectuée le ${c.date}` : `Semaine ${c.week}`}
                      </Text>
                    </View>
                  </View>
                ))}
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  sublabel,
  bgColor,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  bgColor: string;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <TouchableOpacity
        style={[styles.quickAction, { backgroundColor: bgColor }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        {icon}
        <Text style={styles.quickActionLabel}>{label}</Text>
        <Text style={styles.quickActionSublabel}>{sublabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function Text(props: any) {
  const RNText = require("react-native").Text;
  return <RNText {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MATERNITY_BG,
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerGreeting: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: MATERNITY_DARK,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  messageBadgeContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MATERNITY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#D32F2F",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pregnancyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: MATERNITY_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: MATERNITY_LIGHT,
  },
  pregnancyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  pregnancyWeekContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  pregnancyWeekLabel: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginRight: 6,
  },
  pregnancyWeekNumber: {
    fontSize: 48,
    fontWeight: "800" as const,
    color: MATERNITY_ACCENT,
    lineHeight: 52,
  },
  pregnancyWeekOf: {
    fontSize: 20,
    color: MedicalColors.textSecondary,
    fontWeight: "600" as const,
  },
  pregnancyMeta: {
    alignItems: "flex-end",
    gap: 6,
  },
  trimesterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trimesterText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  dueDateText: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#F0E6EF",
    borderRadius: 4,
    overflow: "visible" as const,
    position: "relative" as const,
  },
  progressFill: {
    height: 8,
    backgroundColor: MATERNITY_ACCENT,
    borderRadius: 4,
  },
  progressDot: {
    position: "absolute" as const,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: MATERNITY_ACCENT,
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: MATERNITY_ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressLabelText: {
    fontSize: 10,
    color: MedicalColors.textSecondary,
  },
  nextConsultationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MATERNITY_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
    gap: 8,
  },
  nextConsultationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    color: MATERNITY_DARK,
  },
  noPregnancyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MATERNITY_LIGHT,
    borderStyle: "dashed" as const,
  },
  addPregnancyButton: {
    alignItems: "center",
    gap: 8,
  },
  addPregnancyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MATERNITY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  addPregnancyTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  addPregnancySubtitle: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
  },
  newPregnancyForm: {
    gap: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    textAlign: "center" as const,
  },
  formSubtitle: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: MATERNITY_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: MedicalColors.text,
    backgroundColor: MATERNITY_BG,
    textAlign: "center" as const,
  },
  formButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: MATERNITY_ACCENT,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  alertCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#D32F2F",
  },
  alertItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FFECEC",
  },
  alertItemName: {
    fontSize: 13,
    color: MedicalColors.text,
  },
  alertItemDelay: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#D32F2F",
  },
  alertAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 4,
  },
  alertActionText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#D32F2F",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: MedicalColors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  quickAction: {
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    gap: 6,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginTop: 4,
  },
  quickActionSublabel: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MATERNITY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  childInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  childDate: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  consultationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    marginBottom: 6,
  },
  consultationInfo: {
    flex: 1,
  },
  consultationTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  consultationDate: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
});
