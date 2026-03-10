import { useCallback, useMemo } from "react";
import {
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import {
  Activity,
  Calendar,
  ChevronRight,
  ClipboardList,
  Droplet,
  FileText,
  FlaskConical,
  Heart,
  LogOut,
  Pill,
  Plus,
  Share2,
  Shield,
  Stethoscope,
  UserCircle,
  Users,
} from "lucide-react-native";

export default function DossierDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    medicalProfile,
    consultations,
    labResults,
    documents,
    sharedAccess,
  } = useMedicalStore();

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/auth/login");
  }, [logout, router]);

  const _handleShare = useCallback(async () => {
    try {
      const summary = `Dossier médical - ${user?.firstName ?? ""} ${user?.lastName ?? ""}\nGroupe sanguin: ${medicalProfile.bloodGroup ?? "Non renseigné"}\nAllergies: ${medicalProfile.allergies.length}\nTraitements: ${medicalProfile.medications.length}`;
      await Share.share({ message: summary, title: "Mon dossier médical" });
    } catch (e) {
      console.error("Share error:", e);
    }
  }, [user, medicalProfile]);

  const recentActivity = useMemo(() => {
    const items: Array<{ id: string; date: string; type: string; title: string; subtitle: string }> = [];

    consultations.slice(0, 3).forEach((c) => {
      items.push({
        id: `c-${c.id}`,
        date: c.date,
        type: "consultation",
        title: c.diagnosis,
        subtitle: `Dr. ${c.doctorName} - ${c.specialty}`,
      });
    });

    labResults.slice(0, 3).forEach((r) => {
      items.push({
        id: `l-${r.id}`,
        date: r.date,
        type: "analyse",
        title: r.testName,
        subtitle: r.result,
      });
    });

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [consultations, labResults]);

  const stats = useMemo(() => ({
    consultations: consultations.length,
    labResults: labResults.length,
    medications: medicalProfile.medications.length,
    documents: documents.length,
    sharedWith: sharedAccess.filter((a) => a.isActive).length,
  }), [consultations, labResults, medicalProfile.medications, documents, sharedAccess]);

  const formatDate = useCallback((dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch {
      return dateStr;
    }
  }, []);

  const getActivityIcon = useCallback((type: string) => {
    switch (type) {
      case "consultation":
        return <Stethoscope size={16} color={MedicalColors.medical} />;
      case "analyse":
        return <FlaskConical size={16} color="#E67E22" />;
      default:
        return <FileText size={16} color={MedicalColors.textSecondary} />;
    }
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <UserCircle size={28} color={MedicalColors.white} />
            </View>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.userName}>
                {user?.firstName ?? "Patient"} {user?.lastName ?? ""}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push("/(tabs)/dossier/share" as never)}
            >
              <Share2 size={20} color={MedicalColors.medical} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtnLogout} onPress={handleLogout}>
              <LogOut size={20} color={MedicalColors.urgency} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {medicalProfile.bloodGroup && (
            <View style={styles.bloodBadge}>
              <Droplet size={16} color={MedicalColors.urgency} />
              <Text style={styles.bloodText}>
                {medicalProfile.bloodGroup} | Rh {medicalProfile.rhFactor ?? "?"}
              </Text>
              {medicalProfile.allergies.filter((a) => a.severity === "severe").length > 0 && (
                <View style={styles.alertDot} />
              )}
            </View>
          )}

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: "#EBF5FB" }]}
              onPress={() => router.push("/(tabs)/dossier/add-record" as never)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: MedicalColors.medical }]}>
                <Plus size={20} color={MedicalColors.white} />
              </View>
              <Text style={styles.quickActionLabel}>Ajouter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: "#FEF9E7" }]}
              onPress={() => router.push("/(tabs)/dossier/consultations" as never)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#E67E22" }]}>
                <Stethoscope size={20} color={MedicalColors.white} />
              </View>
              <Text style={styles.quickActionLabel}>Consultations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: "#F4ECF7" }]}
              onPress={() => router.push("/(tabs)/dossier/lab-results" as never)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#8E44AD" }]}>
                <FlaskConical size={20} color={MedicalColors.white} />
              </View>
              <Text style={styles.quickActionLabel}>Analyses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: "#EAFAF1" }]}
              onPress={() => router.push("/(tabs)/dossier/share" as never)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#27AE60" }]}>
                <Users size={20} color={MedicalColors.white} />
              </View>
              <Text style={styles.quickActionLabel}>Partager</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.consultations}</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <Text style={styles.statNumber}>{stats.labResults}</Text>
              <Text style={styles.statLabel}>Analyses</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.medications}</Text>
              <Text style={styles.statLabel}>Traitements</Text>
            </View>
          </View>

          {medicalProfile.medications.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Pill size={18} color={MedicalColors.medical} />
                <Text style={styles.sectionTitle}>Traitements en cours</Text>
              </View>
              {medicalProfile.medications.slice(0, 3).map((med) => (
                <View key={med.id} style={styles.medCard}>
                  <View style={styles.medDot} />
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medDosage}>
                      {med.dosage} - {med.frequency.join(", ")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {medicalProfile.allergies.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Shield size={18} color={MedicalColors.urgency} />
                <Text style={styles.sectionTitle}>Allergies</Text>
              </View>
              <View style={styles.allergyRow}>
                {medicalProfile.allergies.map((a) => (
                  <View
                    key={a.id}
                    style={[
                      styles.allergyTag,
                      a.severity === "severe" && styles.allergyTagSevere,
                    ]}
                  >
                    <Text
                      style={[
                        styles.allergyTagText,
                        a.severity === "severe" && styles.allergyTagTextSevere,
                      ]}
                    >
                      {a.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Activity size={18} color={MedicalColors.medical} />
              <Text style={styles.sectionTitle}>Activité récente</Text>
            </View>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyState}>
                <ClipboardList size={40} color={MedicalColors.border} />
                <Text style={styles.emptyTitle}>Aucune activité</Text>
                <Text style={styles.emptySubtitle}>
                  Ajoutez votre première consultation ou analyse
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push("/(tabs)/dossier/add-record" as never)}
                >
                  <Plus size={16} color={MedicalColors.white} />
                  <Text style={styles.emptyBtnText}>Commencer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              recentActivity.map((item) => (
                <View key={item.id} style={styles.activityItem}>
                  <View style={styles.activityIconWrap}>
                    {getActivityIcon(item.type)}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.activitySubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Text style={styles.activityDate}>{formatDate(item.date)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/dossier/profile-edit" as never)}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#EBF5FB" }]}>
                <Heart size={18} color={MedicalColors.medical} />
              </View>
              <Text style={styles.menuText}>Infos médicales</Text>
              <ChevronRight size={18} color={MedicalColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/dossier/consultations" as never)}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#FEF9E7" }]}>
                <Calendar size={18} color="#E67E22" />
              </View>
              <Text style={styles.menuText}>Historique consultations</Text>
              <ChevronRight size={18} color={MedicalColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/dossier/lab-results" as never)}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#F4ECF7" }]}>
                <FlaskConical size={18} color="#8E44AD" />
              </View>
              <Text style={styles.menuText}>Résultats d'analyses</Text>
              <ChevronRight size={18} color={MedicalColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/dossier/share" as never)}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#EAFAF1" }]}>
                <Share2 size={18} color="#27AE60" />
              </View>
              <Text style={styles.menuText}>
                Partage praticiens
                {stats.sharedWith > 0 && (
                  <Text style={styles.menuBadge}> ({stats.sharedWith})</Text>
                )}
              </Text>
              <ChevronRight size={18} color={MedicalColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

import { Text } from "react-native";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A5EB8",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#0A5EB8",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.white,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerBtnLogout: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
    backgroundColor: MedicalColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  bloodBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: MedicalColors.urgencyLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  bloodText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.urgencyDark,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MedicalColors.urgency,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: MedicalColors.text,
    textAlign: "center" as const,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statCardMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: MedicalColors.border,
    borderRightColor: MedicalColors.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: MedicalColors.medical,
  },
  statLabel: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.background,
  },
  medDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MedicalColors.medical,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  medDosage: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  allergyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergyTag: {
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  allergyTagSevere: {
    backgroundColor: MedicalColors.urgency,
  },
  allergyTagText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#856404",
  },
  allergyTagTextSevere: {
    color: MedicalColors.white,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    textAlign: "center" as const,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: MedicalColors.medical,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyBtnText: {
    color: MedicalColors.white,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.background,
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: MedicalColors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  activitySubtitle: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  activityDate: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    fontWeight: "500" as const,
  },
  menuSection: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    overflow: "hidden" as const,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.background,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500" as const,
    color: MedicalColors.text,
  },
  menuBadge: {
    color: MedicalColors.medical,
    fontWeight: "600" as const,
  },
});
