import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import { useRouter } from "expo-router";
import {
  Calendar,
  Stethoscope,
  Trash2,
  Heart,
  UserCheck,
  Zap,
} from "lucide-react-native";
import type { MedicalConsultation } from "@/types/medical";

type FilterType = "all" | "consultation" | "urgence" | "suivi" | "specialiste";

export default function ConsultationsScreen() {
  const router = useRouter();
  const { consultations, removeConsultation } = useMedicalStore();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredConsultations = useMemo(() => {
    if (filter === "all") return consultations;
    return consultations.filter((c) => c.type === filter);
  }, [consultations, filter]);

  const formatDate = useCallback((dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }, []);

  const getTypeIcon = useCallback((type: MedicalConsultation["type"]) => {
    switch (type) {
      case "urgence":
        return <Zap size={16} color={MedicalColors.urgency} />;
      case "suivi":
        return <Heart size={16} color="#27AE60" />;
      case "specialiste":
        return <UserCheck size={16} color="#8E44AD" />;
      default:
        return <Stethoscope size={16} color={MedicalColors.medical} />;
    }
  }, []);

  const getTypeColor = useCallback((type: MedicalConsultation["type"]) => {
    switch (type) {
      case "urgence":
        return MedicalColors.urgencyLight;
      case "suivi":
        return "#EAFAF1";
      case "specialiste":
        return "#F4ECF7";
      default:
        return "#EBF5FB";
    }
  }, []);

  const getTypeLabel = useCallback((type: MedicalConsultation["type"]) => {
    switch (type) {
      case "urgence":
        return "Urgence";
      case "suivi":
        return "Suivi";
      case "specialiste":
        return "Spécialiste";
      default:
        return "Consultation";
    }
  }, []);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Tout" },
    { key: "consultation", label: "Général" },
    { key: "suivi", label: "Suivi" },
    { key: "specialiste", label: "Spécialiste" },
    { key: "urgence", label: "Urgence" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredConsultations.length === 0 ? (
          <View style={styles.empty}>
            <Stethoscope size={48} color={MedicalColors.border} />
            <Text style={styles.emptyTitle}>Aucune consultation</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez vos consultations pour construire votre historique médical
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push("/(tabs)/dossier/add-record" as never)}
            >
              <Text style={styles.addBtnText}>Ajouter une consultation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredConsultations.map((consultation) => (
            <View key={consultation.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: getTypeColor(consultation.type) },
                  ]}
                >
                  {getTypeIcon(consultation.type)}
                  <Text style={styles.typeBadgeText}>
                    {getTypeLabel(consultation.type)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeConsultation(consultation.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={18} color={MedicalColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.diagnosis}>{consultation.diagnosis}</Text>

              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Stethoscope size={14} color={MedicalColors.textSecondary} />
                  <Text style={styles.metaText}>
                    Dr. {consultation.doctorName}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Calendar size={14} color={MedicalColors.textSecondary} />
                  <Text style={styles.metaText}>
                    {formatDate(consultation.date)}
                  </Text>
                </View>
              </View>

              {consultation.notes && (
                <Text style={styles.notes} numberOfLines={2}>
                  {consultation.notes}
                </Text>
              )}

              {consultation.prescriptions && consultation.prescriptions.length > 0 && (
                <View style={styles.prescriptions}>
                  <Text style={styles.prescLabel}>Prescriptions:</Text>
                  {consultation.prescriptions.map((p, i) => (
                    <Text key={i} style={styles.prescItem}>
                      • {p}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  filterBar: {
    backgroundColor: MedicalColors.white,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.border,
    maxHeight: 56,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: MedicalColors.background,
  },
  filterChipActive: {
    backgroundColor: MedicalColors.medical,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  filterTextActive: {
    color: MedicalColors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    textAlign: "center" as const,
    paddingHorizontal: 32,
  },
  addBtn: {
    backgroundColor: MedicalColors.medical,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 12,
  },
  addBtnText: {
    color: MedicalColors.white,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  card: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  diagnosis: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
  },
  notes: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    fontStyle: "italic" as const,
    marginTop: 4,
  },
  prescriptions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: MedicalColors.background,
  },
  prescLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.text,
    marginBottom: 4,
  },
  prescItem: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    paddingLeft: 4,
    marginTop: 2,
  },
});
