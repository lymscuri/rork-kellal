import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Alert,
} from "react-native";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import {
  Syringe,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react-native";

const MATERNITY_ACCENT = "#E91E8C";
const MATERNITY_LIGHT = "#FDE4F2";

const CARD_BG = "#FFFFFF";

type TabType = "vaccines" | "consultations";

export default function VaccinationsScreen() {
  const {
    maternityData,
    markVaccineDone,
    markConsultationDone,
    getVaccinationCoverage,
    getVaccinationDelays,
    getConsultationAdherence,
  } = useMedicalStore();

  const [activeTab, setActiveTab] = useState<TabType>("vaccines");
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Naissance");

  const vaccineCoverage = useMemo(() => getVaccinationCoverage(), [getVaccinationCoverage]);
  const consultationAdherence = useMemo(() => getConsultationAdherence(), [getConsultationAdherence]);
  const delays = useMemo(() => getVaccinationDelays(), [getVaccinationDelays]);

  const vaccineGroups = useMemo(() => {
    const groups: Record<string, typeof maternityData.vaccines> = {};
    maternityData.vaccines.forEach((v) => {
      if (!groups[v.age]) groups[v.age] = [];
      groups[v.age].push(v);
    });
    return groups;
  }, [maternityData.vaccines]);

  const handleMarkVaccineDone = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        "Confirmer la vaccination",
        `Marquer "${name}" comme effectuée aujourd'hui ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Confirmer",
            onPress: () =>
              markVaccineDone(id, new Date().toISOString().split("T")[0]),
          },
        ]
      );
    },
    [markVaccineDone]
  );

  const handleMarkConsultationDone = useCallback(
    (id: string, title: string) => {
      Alert.alert(
        "Confirmer la consultation",
        `Marquer "${title}" comme effectuée aujourd'hui ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Confirmer",
            onPress: () =>
              markConsultationDone(id, new Date().toISOString().split("T")[0]),
          },
        ]
      );
    },
    [markConsultationDone]
  );

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case "fait":
      case "effectuee":
        return <CheckCircle2 size={18} color={MedicalColors.life} />;
      case "en_retard":
        return <AlertTriangle size={18} color="#D32F2F" />;
      default:
        return <Clock size={18} color={MedicalColors.textSecondary} />;
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "fait":
      case "effectuee":
        return MedicalColors.life;
      case "en_retard":
        return "#D32F2F";
      default:
        return MedicalColors.textSecondary;
    }
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    switch (status) {
      case "fait":
      case "effectuee":
        return "Effectué";
      case "en_retard":
        return "En retard";
      case "a_faire":
        return "À faire";
      case "a_venir":
        return "À venir";
      default:
        return status;
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.coverageRow}>
        <View style={[styles.coverageCard, { backgroundColor: "#E8F5E9" }]}>
          <Syringe size={18} color="#2E7D32" />
          <Text style={styles.coverageValue}>{vaccineCoverage}%</Text>
          <Text style={styles.coverageLabel}>Couverture vaccinale</Text>
          <View style={styles.coverageBar}>
            <View
              style={[
                styles.coverageFill,
                {
                  width: `${vaccineCoverage}%`,
                  backgroundColor: "#2E7D32",
                },
              ]}
            />
          </View>
        </View>
        <View style={[styles.coverageCard, { backgroundColor: "#E3F2FD" }]}>
          <Calendar size={18} color="#1565C0" />
          <Text style={styles.coverageValue}>{consultationAdherence}%</Text>
          <Text style={styles.coverageLabel}>Adhésion consultations</Text>
          <View style={styles.coverageBar}>
            <View
              style={[
                styles.coverageFill,
                {
                  width: `${consultationAdherence}%`,
                  backgroundColor: "#1565C0",
                },
              ]}
            />
          </View>
        </View>
      </View>

      {delays.length > 0 && (
        <View style={styles.delayCard}>
          <View style={styles.delayHeader}>
            <AlertTriangle size={18} color="#D32F2F" />
            <Text style={styles.delayTitle}>Retards détectés</Text>
          </View>
          {delays.map((d) => (
            <View key={d.vaccineId} style={styles.delayRow}>
              <View style={styles.delayInfo}>
                <Text style={styles.delayName}>{d.name}</Text>
                <Text style={styles.delayAge}>Prévu: {d.expectedAge}</Text>
              </View>
              <View style={styles.delayBadge}>
                <Text style={styles.delayDays}>+{d.delayDays}j</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "vaccines" && styles.tabActive]}
          onPress={() => setActiveTab("vaccines")}
        >
          <Syringe
            size={16}
            color={
              activeTab === "vaccines"
                ? MATERNITY_ACCENT
                : MedicalColors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "vaccines" && styles.tabTextActive,
            ]}
          >
            Vaccins PEV
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "consultations" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("consultations")}
        >
          <Calendar
            size={16}
            color={
              activeTab === "consultations"
                ? MATERNITY_ACCENT
                : MedicalColors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "consultations" && styles.tabTextActive,
            ]}
          >
            Consultations
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "vaccines" ? (
        <>
          {Object.entries(vaccineGroups).map(([age, vaccines]) => {
            const isExpanded = expandedGroup === age;
            const allDone = vaccines.every((v) => v.status === "fait");
            const hasDelay = vaccines.some((v) => v.status === "en_retard");

            return (
              <View key={age} style={styles.groupCard}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() =>
                    setExpandedGroup(isExpanded ? null : age)
                  }
                >
                  <View style={styles.groupHeaderLeft}>
                    <View
                      style={[
                        styles.groupDot,
                        {
                          backgroundColor: allDone
                            ? MedicalColors.life
                            : hasDelay
                            ? "#D32F2F"
                            : MedicalColors.textSecondary,
                        },
                      ]}
                    />
                    <View>
                      <Text style={styles.groupAge}>{age}</Text>
                      <Text style={styles.groupCount}>
                        {vaccines.filter((v) => v.status === "fait").length}/
                        {vaccines.length} effectués
                      </Text>
                    </View>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color={MedicalColors.textSecondary} />
                  ) : (
                    <ChevronDown
                      size={20}
                      color={MedicalColors.textSecondary}
                    />
                  )}
                </TouchableOpacity>

                {isExpanded &&
                  vaccines.map((vaccine) => (
                    <View key={vaccine.id} style={styles.vaccineItem}>
                      <View style={styles.vaccineLeft}>
                        {getStatusIcon(vaccine.status)}
                        <View style={styles.vaccineInfo}>
                          <Text style={styles.vaccineName}>
                            {vaccine.name}
                          </Text>
                          {vaccine.doneDate && (
                            <Text style={styles.vaccineDoneDate}>
                              Fait le {vaccine.doneDate}
                            </Text>
                          )}
                        </View>
                      </View>
                      {vaccine.status !== "fait" ? (
                        <TouchableOpacity
                          style={styles.markDoneButton}
                          onPress={() =>
                            handleMarkVaccineDone(vaccine.id, vaccine.name)
                          }
                        >
                          <Text style={styles.markDoneText}>Fait</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text
                          style={[
                            styles.statusLabel,
                            { color: getStatusColor(vaccine.status) },
                          ]}
                        >
                          {getStatusLabel(vaccine.status)}
                        </Text>
                      )}
                    </View>
                  ))}
              </View>
            );
          })}
        </>
      ) : (
        <>
          {maternityData.consultations.map((consultation) => (
            <View key={consultation.id} style={styles.consultationCard}>
              <View style={styles.consultationLeft}>
                {getStatusIcon(consultation.status)}
                <View style={styles.consultationInfo}>
                  <Text style={styles.consultationTitle}>
                    {consultation.title}
                  </Text>
                  <Text style={styles.consultationWeek}>
                    Semaine {consultation.week}
                  </Text>
                  {consultation.date && (
                    <Text style={styles.consultationDate}>
                      Effectuée le {consultation.date}
                    </Text>
                  )}
                </View>
              </View>
              {consultation.status === "a_venir" && (
                <TouchableOpacity
                  style={styles.markDoneButton}
                  onPress={() =>
                    handleMarkConsultationDone(
                      consultation.id,
                      consultation.title
                    )
                  }
                >
                  <Text style={styles.markDoneText}>Fait</Text>
                </TouchableOpacity>
              )}
              {consultation.status === "effectuee" && (
                <Text
                  style={[
                    styles.statusLabel,
                    { color: MedicalColors.life },
                  ]}
                >
                  Effectuée
                </Text>
              )}
              {consultation.status === "en_retard" && (
                <Text style={[styles.statusLabel, { color: "#D32F2F" }]}>
                  En retard
                </Text>
              )}
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
  coverageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  coverageCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  coverageValue: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: MedicalColors.text,
  },
  coverageLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
    textAlign: "center" as const,
  },
  coverageBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    marginTop: 6,
  },
  coverageFill: {
    height: 4,
    borderRadius: 2,
  },
  delayCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  delayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  delayTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#D32F2F",
  },
  delayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FFECEC",
  },
  delayInfo: {
    flex: 1,
  },
  delayName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  delayAge: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  delayBadge: {
    backgroundColor: "#FFCDD2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  delayDays: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#D32F2F",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: MATERNITY_LIGHT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  tabTextActive: {
    color: MATERNITY_ACCENT,
  },
  groupCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden" as const,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupAge: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  groupCount: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 1,
  },
  vaccineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  vaccineLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: MedicalColors.text,
  },
  vaccineDoneDate: {
    fontSize: 11,
    color: MedicalColors.life,
    marginTop: 2,
  },
  markDoneButton: {
    backgroundColor: MATERNITY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  markDoneText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MATERNITY_ACCENT,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  consultationCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  consultationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  consultationInfo: {
    flex: 1,
  },
  consultationTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  consultationWeek: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  consultationDate: {
    fontSize: 11,
    color: MedicalColors.life,
    marginTop: 2,
  },
});
