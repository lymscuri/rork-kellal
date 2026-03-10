import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import { useRouter } from "expo-router";
import {
  Calendar,
  Check,
  FlaskConical,
  Plus,
  Stethoscope,
  X,
} from "lucide-react-native";
import type { MedicalConsultation, LabResult } from "@/types/medical";

type RecordType = "consultation" | "analyse";
type ConsultationType = MedicalConsultation["type"];
type LabCategory = LabResult["category"];

export default function AddRecordScreen() {
  const router = useRouter();
  const { addConsultation, addLabResult } = useMedicalStore();
  const [recordType, setRecordType] = useState<RecordType>("consultation");

  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [hospital, setHospital] = useState("");
  const [consultType, setConsultType] = useState<ConsultationType>("consultation");
  const [prescriptions, setPrescriptions] = useState<string[]>([]);
  const [newPrescription, setNewPrescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [testName, setTestName] = useState("");
  const [labCategory, setLabCategory] = useState<LabCategory>("sang");
  const [result, setResult] = useState("");
  const [normalRange, setNormalRange] = useState("");
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [labName, setLabName] = useState("");

  const handleAddPrescription = useCallback(() => {
    if (!newPrescription.trim()) return;
    setPrescriptions((prev) => [...prev, newPrescription.trim()]);
    setNewPrescription("");
  }, [newPrescription]);

  const removePrescription = useCallback((index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    if (recordType === "consultation") {
      if (!doctorName.trim() || !diagnosis.trim()) {
        Alert.alert("Champs requis", "Veuillez remplir le médecin et le diagnostic.");
        return;
      }
      addConsultation({
        date,
        doctorName: doctorName.trim(),
        specialty: specialty.trim() || "Généraliste",
        diagnosis: diagnosis.trim(),
        notes: notes.trim() || undefined,
        prescriptions: prescriptions.length > 0 ? prescriptions : undefined,
        hospital: hospital.trim() || undefined,
        type: consultType,
      });
    } else {
      if (!testName.trim() || !result.trim()) {
        Alert.alert("Champs requis", "Veuillez remplir le nom du test et le résultat.");
        return;
      }
      addLabResult({
        date,
        testName: testName.trim(),
        category: labCategory,
        result: result.trim(),
        normalRange: normalRange.trim() || undefined,
        isAbnormal,
        labName: labName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }
    router.back();
  }, [
    recordType, date, doctorName, specialty, diagnosis, notes, prescriptions,
    hospital, consultType, testName, labCategory, result, normalRange,
    isAbnormal, labName, addConsultation, addLabResult, router,
  ]);

  const consultTypes: { key: ConsultationType; label: string }[] = [
    { key: "consultation", label: "Général" },
    { key: "suivi", label: "Suivi" },
    { key: "specialiste", label: "Spécialiste" },
    { key: "urgence", label: "Urgence" },
  ];

  const labCategories: { key: LabCategory; label: string }[] = [
    { key: "sang", label: "Sang" },
    { key: "urine", label: "Urine" },
    { key: "imagerie", label: "Imagerie" },
    { key: "autre", label: "Autre" },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.typeSwitch}>
          <TouchableOpacity
            style={[styles.typeBtn, recordType === "consultation" && styles.typeBtnActive]}
            onPress={() => setRecordType("consultation")}
          >
            <Stethoscope
              size={18}
              color={recordType === "consultation" ? MedicalColors.white : MedicalColors.medical}
            />
            <Text
              style={[
                styles.typeBtnText,
                recordType === "consultation" && styles.typeBtnTextActive,
              ]}
            >
              Consultation
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, recordType === "analyse" && styles.typeBtnActive]}
            onPress={() => setRecordType("analyse")}
          >
            <FlaskConical
              size={18}
              color={recordType === "analyse" ? MedicalColors.white : "#8E44AD"}
            />
            <Text
              style={[
                styles.typeBtnText,
                recordType === "analyse" && styles.typeBtnTextActive,
              ]}
            >
              Analyse
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.dateRow}>
            <Calendar size={18} color={MedicalColors.textSecondary} />
            <TextInput
              style={styles.dateInput}
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={MedicalColors.textSecondary}
            />
          </View>
        </View>

        {recordType === "consultation" ? (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Type de consultation</Text>
              <View style={styles.chipRow}>
                {consultTypes.map((ct) => (
                  <TouchableOpacity
                    key={ct.key}
                    style={[
                      styles.chip,
                      consultType === ct.key && styles.chipActive,
                    ]}
                    onPress={() => setConsultType(ct.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        consultType === ct.key && styles.chipTextActive,
                      ]}
                    >
                      {ct.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nom du médecin *</Text>
              <TextInput
                style={styles.input}
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder="Dr. Dupont"
                placeholderTextColor={MedicalColors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Spécialité</Text>
              <TextInput
                style={styles.input}
                value={specialty}
                onChangeText={setSpecialty}
                placeholder="Généraliste, Cardiologue..."
                placeholderTextColor={MedicalColors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Diagnostic / Motif *</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={diagnosis}
                onChangeText={setDiagnosis}
                placeholder="Description du diagnostic"
                placeholderTextColor={MedicalColors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Établissement</Text>
              <TextInput
                style={styles.input}
                value={hospital}
                onChangeText={setHospital}
                placeholder="Nom de l'hôpital ou clinique"
                placeholderTextColor={MedicalColors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Prescriptions</Text>
              <View style={styles.prescRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={newPrescription}
                  onChangeText={setNewPrescription}
                  placeholder="Médicament ou examen"
                  placeholderTextColor={MedicalColors.textSecondary}
                  onSubmitEditing={handleAddPrescription}
                />
                <TouchableOpacity
                  style={styles.prescAdd}
                  onPress={handleAddPrescription}
                >
                  <Plus size={20} color={MedicalColors.white} />
                </TouchableOpacity>
              </View>
              {prescriptions.map((p, i) => (
                <View key={i} style={styles.prescItem}>
                  <Text style={styles.prescText}>• {p}</Text>
                  <TouchableOpacity onPress={() => removePrescription(i)}>
                    <X size={16} color={MedicalColors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Catégorie</Text>
              <View style={styles.chipRow}>
                {labCategories.map((lc) => (
                  <TouchableOpacity
                    key={lc.key}
                    style={[
                      styles.chip,
                      labCategory === lc.key && styles.chipActive,
                    ]}
                    onPress={() => setLabCategory(lc.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        labCategory === lc.key && styles.chipTextActive,
                      ]}
                    >
                      {lc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nom du test *</Text>
              <TextInput
                style={styles.input}
                value={testName}
                onChangeText={setTestName}
                placeholder="Hémogramme, Glycémie..."
                placeholderTextColor={MedicalColors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Résultat *</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={result}
                onChangeText={setResult}
                placeholder="Résultat de l'analyse"
                placeholderTextColor={MedicalColors.textSecondary}
                multiline
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Valeurs normales</Text>
              <TextInput
                style={styles.input}
                value={normalRange}
                onChangeText={setNormalRange}
                placeholder="Ex: 4.5 - 11.0 x10³/µL"
                placeholderTextColor={MedicalColors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={styles.abnormalToggle}
              onPress={() => setIsAbnormal(!isAbnormal)}
            >
              <View
                style={[
                  styles.checkbox,
                  isAbnormal && styles.checkboxActive,
                ]}
              >
                {isAbnormal && <Check size={14} color={MedicalColors.white} />}
              </View>
              <Text style={styles.abnormalText}>Résultat anormal</Text>
            </TouchableOpacity>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Laboratoire</Text>
              <TextInput
                style={styles.input}
                value={labName}
                onChangeText={setLabName}
                placeholder="Nom du laboratoire"
                placeholderTextColor={MedicalColors.textSecondary}
              />
            </View>
          </>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Notes complémentaires</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Remarques, observations..."
            placeholderTextColor={MedicalColors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Check size={20} color={MedicalColors.white} />
          <Text style={styles.saveBtnText}>Enregistrer</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  content: {
    padding: 16,
  },
  typeSwitch: {
    flexDirection: "row",
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  typeBtnActive: {
    backgroundColor: MedicalColors.medical,
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  typeBtnTextActive: {
    color: MedicalColors.white,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: MedicalColors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: MedicalColors.text,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MedicalColors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: MedicalColors.text,
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: MedicalColors.white,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  chipActive: {
    backgroundColor: MedicalColors.medical,
    borderColor: MedicalColors.medical,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: MedicalColors.text,
  },
  chipTextActive: {
    color: MedicalColors.white,
  },
  prescRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  prescAdd: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: MedicalColors.medical,
    justifyContent: "center",
    alignItems: "center",
  },
  prescItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: MedicalColors.white,
    borderRadius: 8,
    marginTop: 4,
  },
  prescText: {
    fontSize: 14,
    color: MedicalColors.text,
    flex: 1,
  },
  abnormalToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: MedicalColors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: MedicalColors.urgency,
    borderColor: MedicalColors.urgency,
  },
  abnormalText: {
    fontSize: 14,
    color: MedicalColors.text,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: MedicalColors.medical,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  saveBtnText: {
    color: MedicalColors.white,
    fontSize: 16,
    fontWeight: "700" as const,
  },
});
