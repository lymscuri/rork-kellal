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
  AlertTriangle,
  Beaker,
  Calendar,
  Droplets,
  FlaskConical,
  ImageIcon,
  Trash2,
} from "lucide-react-native";
import type { LabResult } from "@/types/medical";

type FilterCategory = "all" | LabResult["category"];

export default function LabResultsScreen() {
  const router = useRouter();
  const { labResults, removeLabResult } = useMedicalStore();
  const [filter, setFilter] = useState<FilterCategory>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return labResults;
    return labResults.filter((r) => r.category === filter);
  }, [labResults, filter]);

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

  const getCategoryIcon = useCallback((cat: LabResult["category"]) => {
    switch (cat) {
      case "sang":
        return <Droplets size={16} color="#C0392B" />;
      case "urine":
        return <Beaker size={16} color="#E67E22" />;
      case "imagerie":
        return <ImageIcon size={16} color="#8E44AD" />;
      default:
        return <FlaskConical size={16} color={MedicalColors.medical} />;
    }
  }, []);

  const getCategoryLabel = useCallback((cat: LabResult["category"]) => {
    switch (cat) {
      case "sang":
        return "Sanguin";
      case "urine":
        return "Urinaire";
      case "imagerie":
        return "Imagerie";
      default:
        return "Autre";
    }
  }, []);

  const filters: { key: FilterCategory; label: string }[] = [
    { key: "all", label: "Tout" },
    { key: "sang", label: "Sang" },
    { key: "urine", label: "Urine" },
    { key: "imagerie", label: "Imagerie" },
    { key: "autre", label: "Autre" },
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
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <FlaskConical size={48} color={MedicalColors.border} />
            <Text style={styles.emptyTitle}>Aucune analyse</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez vos résultats d'analyses pour un suivi complet
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push("/(tabs)/dossier/add-record" as never)}
            >
              <Text style={styles.addBtnText}>Ajouter une analyse</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((lab) => (
            <View key={lab.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.catBadge}>
                  {getCategoryIcon(lab.category)}
                  <Text style={styles.catText}>
                    {getCategoryLabel(lab.category)}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  {lab.isAbnormal && (
                    <View style={styles.abnormalBadge}>
                      <AlertTriangle size={14} color={MedicalColors.urgency} />
                      <Text style={styles.abnormalText}>Anormal</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => removeLabResult(lab.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={18} color={MedicalColors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.testName}>{lab.testName}</Text>

              <View style={styles.resultBox}>
                <Text style={[styles.resultValue, lab.isAbnormal && styles.resultAbnormal]}>
                  {lab.result}
                </Text>
                {lab.normalRange && (
                  <Text style={styles.normalRange}>
                    Normes: {lab.normalRange}
                  </Text>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.metaItem}>
                  <Calendar size={14} color={MedicalColors.textSecondary} />
                  <Text style={styles.metaText}>{formatDate(lab.date)}</Text>
                </View>
                {lab.labName && (
                  <Text style={styles.labName}>{lab.labName}</Text>
                )}
              </View>

              {lab.notes && (
                <Text style={styles.notes}>{lab.notes}</Text>
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
    backgroundColor: "#8E44AD",
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
    backgroundColor: "#8E44AD",
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
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: MedicalColors.background,
  },
  catText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  abnormalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: MedicalColors.urgencyLight,
  },
  abnormalText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: MedicalColors.urgency,
  },
  testName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 10,
  },
  resultBox: {
    backgroundColor: MedicalColors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  resultValue: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  resultAbnormal: {
    color: MedicalColors.urgency,
  },
  normalRange: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  labName: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    fontStyle: "italic" as const,
  },
  notes: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    fontStyle: "italic" as const,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: MedicalColors.background,
  },
});
