import { useCallback, useMemo } from "react";
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
  BarChart3,
  Syringe,
  Calendar,
  TrendingUp,
  FileText,
  AlertTriangle,
  Baby,
} from "lucide-react-native";

const MATERNITY_ACCENT = "#E91E8C";
const MATERNITY_LIGHT = "#FDE4F2";
const CARD_BG = "#FFFFFF";

export default function ReportsScreen() {
  const {
    maternityData,
    getVaccinationCoverage,
    getConsultationAdherence,
    getVaccinationDelays,
    addReport,
  } = useMedicalStore();

  const vaccineCoverage = useMemo(() => getVaccinationCoverage(), [getVaccinationCoverage]);
  const consultationAdherence = useMemo(() => getConsultationAdherence(), [getConsultationAdherence]);
  const delays = useMemo(() => getVaccinationDelays(), [getVaccinationDelays]);

  const vaccinesDone = useMemo(
    () => maternityData.vaccines.filter((v) => v.status === "fait").length,
    [maternityData.vaccines]
  );
  const vaccinesTotal = maternityData.vaccines.length;
  const consultationsDone = useMemo(
    () =>
      maternityData.consultations.filter((c) => c.status === "effectuee")
        .length,
    [maternityData.consultations]
  );
  const consultationsTotal = maternityData.consultations.length;
  const childrenCount = maternityData.children.length;

  const handleGenerateReport = useCallback(
    (
      type:
        | "vaccination_coverage"
        | "consultation_adherence"
        | "delay_analysis"
        | "growth_tracking"
    ) => {
      const titles: Record<string, string> = {
        vaccination_coverage: "Couverture vaccinale",
        consultation_adherence: "Adhésion aux consultations",
        delay_analysis: "Analyse des retards",
        growth_tracking: "Suivi de croissance",
      };

      addReport({
        type,
        title: titles[type] || type,
        generatedDate: new Date().toISOString().split("T")[0],
        period: "Mars 2026",
        data: {
          vaccineCoverage,
          consultationAdherence,
          delaysCount: delays.length,
          childrenCount,
        },
      });
      Alert.alert("Rapport généré", `Le rapport "${titles[type]}" a été créé.`);
    },
    [vaccineCoverage, consultationAdherence, delays, childrenCount, addReport]
  );

  const getProgressColor = useCallback((value: number) => {
    if (value >= 80) return MedicalColors.life;
    if (value >= 50) return "#FF9800";
    return "#D32F2F";
  }, []);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.sectionTitle}>Tableau de bord</Text>

      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <View style={styles.dashboardIconRow}>
            <View
              style={[
                styles.iconBg,
                { backgroundColor: "#E8F5E9" },
              ]}
            >
              <Syringe size={18} color="#2E7D32" />
            </View>
          </View>
          <Text style={styles.dashboardValue}>{vaccineCoverage}%</Text>
          <Text style={styles.dashboardLabel}>Couverture vaccinale</Text>
          <View style={styles.miniProgressBar}>
            <View
              style={[
                styles.miniProgressFill,
                {
                  width: `${vaccineCoverage}%`,
                  backgroundColor: getProgressColor(vaccineCoverage),
                },
              ]}
            />
          </View>
          <Text style={styles.dashboardSub}>
            {vaccinesDone}/{vaccinesTotal} vaccins
          </Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={styles.dashboardIconRow}>
            <View
              style={[
                styles.iconBg,
                { backgroundColor: "#E3F2FD" },
              ]}
            >
              <Calendar size={18} color="#1565C0" />
            </View>
          </View>
          <Text style={styles.dashboardValue}>{consultationAdherence}%</Text>
          <Text style={styles.dashboardLabel}>Consultations suivies</Text>
          <View style={styles.miniProgressBar}>
            <View
              style={[
                styles.miniProgressFill,
                {
                  width: `${consultationAdherence}%`,
                  backgroundColor: getProgressColor(consultationAdherence),
                },
              ]}
            />
          </View>
          <Text style={styles.dashboardSub}>
            {consultationsDone}/{consultationsTotal} RDV
          </Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={styles.dashboardIconRow}>
            <View
              style={[
                styles.iconBg,
                { backgroundColor: "#FFF3E0" },
              ]}
            >
              <AlertTriangle size={18} color="#E65100" />
            </View>
          </View>
          <Text style={styles.dashboardValue}>{delays.length}</Text>
          <Text style={styles.dashboardLabel}>Retards détectés</Text>
          <View style={styles.miniProgressBar}>
            <View
              style={[
                styles.miniProgressFill,
                {
                  width: delays.length > 0 ? "100%" : "0%",
                  backgroundColor:
                    delays.length > 0 ? "#D32F2F" : MedicalColors.life,
                },
              ]}
            />
          </View>
          <Text style={styles.dashboardSub}>
            {delays.length > 0 ? "Action requise" : "Tout à jour"}
          </Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={styles.dashboardIconRow}>
            <View
              style={[
                styles.iconBg,
                { backgroundColor: MATERNITY_LIGHT },
              ]}
            >
              <Baby size={18} color={MATERNITY_ACCENT} />
            </View>
          </View>
          <Text style={styles.dashboardValue}>{childrenCount}</Text>
          <Text style={styles.dashboardLabel}>Enfants suivis</Text>
          <View style={styles.miniProgressBar}>
            <View
              style={[
                styles.miniProgressFill,
                {
                  width: childrenCount > 0 ? "100%" : "0%",
                  backgroundColor: MATERNITY_ACCENT,
                },
              ]}
            />
          </View>
          <Text style={styles.dashboardSub}>
            {maternityData.reminders.filter((r) => r.status === "pending").length}{" "}
            rappels en attente
          </Text>
        </View>
      </View>

      {delays.length > 0 && (
        <View style={styles.delaySection}>
          <Text style={styles.sectionTitle}>Analyse des retards</Text>
          {delays.map((d) => (
            <View key={d.vaccineId} style={styles.delayRow}>
              <View style={styles.delayDot} />
              <View style={styles.delayInfo}>
                <Text style={styles.delayName}>{d.name}</Text>
                <Text style={styles.delayExpected}>
                  Attendu: {d.expectedAge}
                </Text>
              </View>
              <View style={styles.delayBadge}>
                <Text style={styles.delayDays}>+{d.delayDays}j</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Générer un rapport</Text>
      <View style={styles.reportActionsGrid}>
        <TouchableOpacity
          style={styles.reportAction}
          onPress={() => handleGenerateReport("vaccination_coverage")}
        >
          <View style={[styles.reportIcon, { backgroundColor: "#E8F5E9" }]}>
            <Syringe size={20} color="#2E7D32" />
          </View>
          <Text style={styles.reportActionTitle}>Couverture vaccinale</Text>
          <Text style={styles.reportActionSub}>
            Taux de vaccination par âge
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reportAction}
          onPress={() => handleGenerateReport("consultation_adherence")}
        >
          <View style={[styles.reportIcon, { backgroundColor: "#E3F2FD" }]}>
            <Calendar size={20} color="#1565C0" />
          </View>
          <Text style={styles.reportActionTitle}>Adhésion consultations</Text>
          <Text style={styles.reportActionSub}>
            Suivi des rendez-vous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reportAction}
          onPress={() => handleGenerateReport("delay_analysis")}
        >
          <View style={[styles.reportIcon, { backgroundColor: "#FFF3E0" }]}>
            <TrendingUp size={20} color="#E65100" />
          </View>
          <Text style={styles.reportActionTitle}>Analyse retards</Text>
          <Text style={styles.reportActionSub}>
            Vaccinations en retard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reportAction}
          onPress={() => handleGenerateReport("growth_tracking")}
        >
          <View
            style={[styles.reportIcon, { backgroundColor: MATERNITY_LIGHT }]}
          >
            <BarChart3 size={20} color={MATERNITY_ACCENT} />
          </View>
          <Text style={styles.reportActionTitle}>Suivi croissance</Text>
          <Text style={styles.reportActionSub}>
            Poids et taille enfants
          </Text>
        </TouchableOpacity>
      </View>

      {maternityData.reports.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Rapports générés</Text>
          {maternityData.reports.map((report) => (
            <View key={report.id} style={styles.generatedReport}>
              <FileText size={18} color={MedicalColors.textSecondary} />
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportDate}>
                  {report.generatedDate} - {report.period}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 14,
    marginTop: 4,
  },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  dashboardCard: {
    width: "48%" as any,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    flex: undefined,
    flexBasis: "48%",
  },
  dashboardIconRow: {
    marginBottom: 8,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardValue: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: MedicalColors.text,
  },
  dashboardLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: "#E8E8E8",
    borderRadius: 2,
    marginTop: 10,
  },
  miniProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  dashboardSub: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  delaySection: {
    marginBottom: 24,
  },
  delayRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  delayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D32F2F",
  },
  delayInfo: {
    flex: 1,
  },
  delayName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  delayExpected: {
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
  reportActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  reportAction: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    flexBasis: "48%",
    gap: 8,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reportActionTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  reportActionSub: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
  },
  generatedReport: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  reportDate: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
});
