import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import {
  Baby,
  TrendingUp,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react-native";

const MATERNITY_ACCENT = "#E91E8C";
const MATERNITY_LIGHT = "#FDE4F2";
const CARD_BG = "#FFFFFF";

export default function ChildDetailsScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { maternityData, addGrowthRecord, markVaccineDone } =
    useMedicalStore();

  const child = useMemo(
    () => maternityData.children.find((c) => c.id === childId),
    [maternityData.children, childId]
  );

  const growthRecords = useMemo(
    () =>
      maternityData.growthRecords
        .filter((r) => r.childId === childId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [maternityData.growthRecords, childId]
  );

  const [showGrowthForm, setShowGrowthForm] = useState(false);
  const [growthWeight, setGrowthWeight] = useState("");
  const [growthHeight, setGrowthHeight] = useState("");
  const [growthHead, setGrowthHead] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");

  const childAge = useMemo(() => {
    if (!child?.birthDate) return null;
    const birth = new Date(child.birthDate);
    const today = new Date();
    const months =
      (today.getFullYear() - birth.getFullYear()) * 12 +
      (today.getMonth() - birth.getMonth());
    if (months < 1) {
      const days = Math.floor(
        (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
      );
      return `${days} jours`;
    }
    if (months < 24) return `${months} mois`;
    return `${Math.floor(months / 12)} ans`;
  }, [child?.birthDate]);

  const handleAddGrowthRecord = useCallback(() => {
    if (!growthWeight && !growthHeight) {
      Alert.alert("Erreur", "Veuillez entrer au moins le poids ou la taille");
      return;
    }
    if (!childId) return;
    addGrowthRecord({
      childId,
      date: new Date().toISOString().split("T")[0],
      weight: growthWeight ? parseFloat(growthWeight) : undefined,
      height: growthHeight ? parseFloat(growthHeight) : undefined,
      headCircumference: growthHead ? parseFloat(growthHead) : undefined,
      notes: growthNotes || undefined,
    });
    setShowGrowthForm(false);
    setGrowthWeight("");
    setGrowthHeight("");
    setGrowthHead("");
    setGrowthNotes("");
    Alert.alert("Enregistré", "Les mesures ont été ajoutées avec succès");
  }, [growthWeight, growthHeight, growthHead, growthNotes, childId, addGrowthRecord]);

  const handleMarkVaccineDone = useCallback(
    (id: string, name: string) => {
      Alert.alert("Confirmer", `Marquer "${name}" comme effectué ?`, [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () =>
            markVaccineDone(id, new Date().toISOString().split("T")[0]),
        },
      ]);
    },
    [markVaccineDone]
  );

  if (!child) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Enfant non trouvé</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: child.firstName }} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Baby size={36} color={MATERNITY_ACCENT} />
          </View>
          <Text style={styles.childName}>{child.firstName}</Text>
          {child.birthDate && (
            <Text style={styles.childBirth}>Né(e) le {child.birthDate}</Text>
          )}
          {childAge && (
            <View style={styles.ageBadge}>
              <Text style={styles.ageText}>{childAge}</Text>
            </View>
          )}
          {child.birthWeight && (
            <Text style={styles.birthWeight}>
              Poids naissance: {child.birthWeight} kg
            </Text>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suivi de croissance</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowGrowthForm(!showGrowthForm)}
          >
            <Plus size={18} color={MATERNITY_ACCENT} />
            <Text style={styles.addBtnText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {showGrowthForm && (
          <View style={styles.formCard}>
            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Poids (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={growthWeight}
                  onChangeText={setGrowthWeight}
                  placeholder="3.5"
                  placeholderTextColor={MedicalColors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Taille (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={growthHeight}
                  onChangeText={setGrowthHeight}
                  placeholder="50"
                  placeholderTextColor={MedicalColors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Tour de tête (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={growthHead}
                  onChangeText={setGrowthHead}
                  placeholder="35"
                  placeholderTextColor={MedicalColors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={growthNotes}
              onChangeText={setGrowthNotes}
              placeholder="Observations..."
              placeholderTextColor={MedicalColors.textSecondary}
              multiline
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowGrowthForm(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddGrowthRecord}
              >
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {growthRecords.length > 0 ? (
          growthRecords.map((record) => (
            <View key={record.id} style={styles.growthRow}>
              <View style={styles.growthDateCol}>
                <Calendar size={14} color={MedicalColors.textSecondary} />
                <Text style={styles.growthDate}>{record.date}</Text>
              </View>
              <View style={styles.growthMeasures}>
                {record.weight != null && (
                  <View style={styles.measureBadge}>
                    <Text style={styles.measureValue}>{record.weight} kg</Text>
                  </View>
                )}
                {record.height != null && (
                  <View style={styles.measureBadge}>
                    <Text style={styles.measureValue}>{record.height} cm</Text>
                  </View>
                )}
                {record.headCircumference != null && (
                  <View style={styles.measureBadge}>
                    <Text style={styles.measureValue}>
                      PC {record.headCircumference} cm
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyGrowth}>
            <TrendingUp size={24} color={MedicalColors.textSecondary} />
            <Text style={styles.emptyGrowthText}>
              Aucune mesure enregistrée
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Calendrier vaccinal
        </Text>
        {maternityData.vaccines.map((vaccine) => (
          <View key={vaccine.id} style={styles.vaccineRow}>
            {vaccine.status === "fait" ? (
              <CheckCircle2 size={18} color={MedicalColors.life} />
            ) : vaccine.status === "en_retard" ? (
              <AlertTriangle size={18} color="#D32F2F" />
            ) : (
              <View style={styles.vaccineDot} />
            )}
            <View style={styles.vaccineInfo}>
              <Text style={styles.vaccineName}>{vaccine.name}</Text>
              <Text style={styles.vaccineAge}>{vaccine.age}</Text>
              {vaccine.doneDate && (
                <Text style={styles.vaccineDone}>
                  Fait le {vaccine.doneDate}
                </Text>
              )}
            </View>
            {vaccine.status !== "fait" && (
              <TouchableOpacity
                style={styles.markBtn}
                onPress={() => handleMarkVaccineDone(vaccine.id, vaccine.name)}
              >
                <Text style={styles.markBtnText}>Fait</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </>
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8FC",
  },
  emptyText: {
    fontSize: 16,
    color: MedicalColors.textSecondary,
  },
  profileCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: MATERNITY_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: MATERNITY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  childName: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: MedicalColors.text,
  },
  childBirth: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  ageBadge: {
    backgroundColor: MATERNITY_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 8,
  },
  ageText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: MATERNITY_ACCENT,
  },
  birthWeight: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: MATERNITY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MATERNITY_ACCENT,
  },
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: MedicalColors.text,
    backgroundColor: "#FAFAFA",
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top" as const,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: MATERNITY_ACCENT,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  growthRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  growthDateCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  growthDate: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
  },
  growthMeasures: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
  },
  measureBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  measureValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#2E7D32",
  },
  emptyGrowth: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyGrowthText: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
  },
  vaccineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    gap: 10,
  },
  vaccineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: MedicalColors.textSecondary,
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  vaccineAge: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 1,
  },
  vaccineDone: {
    fontSize: 11,
    color: MedicalColors.life,
    marginTop: 1,
  },
  markBtn: {
    backgroundColor: MATERNITY_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  markBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MATERNITY_ACCENT,
  },
});
