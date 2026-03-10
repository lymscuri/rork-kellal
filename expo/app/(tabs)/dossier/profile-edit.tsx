import { useCallback, useState } from "react";
import {
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
import { useAuthStore } from "@/store/authStore";
import {
  Droplet,
  Heart,
  Phone,
  Pill,
  Plus,
  Shield,
  Trash2,
  User,
} from "lucide-react-native";
import type { BloodGroup } from "@/types/medical";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfileEditScreen() {
  const { user } = useAuthStore();
  const {
    medicalProfile,
    setBloodGroup,
    setRhFactor,
    addAllergy,
    removeAllergy,
    addChronicDisease,
    removeChronicDisease,
    addMedication,
    removeMedication,
    addEmergencyContact,
    removeEmergencyContact,
  } = useMedicalStore();

  const [newAllergy, setNewAllergy] = useState("");
  const [newDisease, setNewDisease] = useState("");
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedFreq, setNewMedFreq] = useState<string[]>([]);
  const [newContactName, setNewContactName] = useState("");
  const [newContactRel, setNewContactRel] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  const handleAddAllergy = useCallback(() => {
    if (!newAllergy.trim()) return;
    addAllergy({ name: newAllergy.trim(), type: "autre", severity: "moderee" });
    setNewAllergy("");
  }, [newAllergy, addAllergy]);

  const handleAddDisease = useCallback(() => {
    if (!newDisease.trim()) return;
    addChronicDisease({ name: newDisease.trim() });
    setNewDisease("");
  }, [newDisease, addChronicDisease]);

  const handleAddMedication = useCallback(() => {
    if (!newMedName.trim()) return;
    addMedication({
      name: newMedName.trim(),
      dosage: newMedDosage.trim() || "Non spécifié",
      frequency: newMedFreq as ("matin" | "midi" | "soir" | "nuit")[],
    });
    setNewMedName("");
    setNewMedDosage("");
    setNewMedFreq([]);
  }, [newMedName, newMedDosage, newMedFreq, addMedication]);

  const handleAddContact = useCallback(() => {
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    addEmergencyContact({
      fullName: newContactName.trim(),
      relationship: newContactRel.trim() || "Non spécifié",
      phoneNumber: newContactPhone.trim(),
    });
    setNewContactName("");
    setNewContactRel("");
    setNewContactPhone("");
  }, [newContactName, newContactRel, newContactPhone, addEmergencyContact]);

  const toggleFreq = useCallback((f: string) => {
    setNewMedFreq((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }, []);

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
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <User size={28} color={MedicalColors.white} />
          </View>
          <Text style={styles.profileName}>
            {user?.firstName ?? "Patient"} {user?.lastName ?? ""}
          </Text>
          <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Droplet size={18} color={MedicalColors.urgency} />
            <Text style={styles.cardTitle}>Groupe sanguin</Text>
          </View>
          <View style={styles.bloodGrid}>
            {BLOOD_GROUPS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.bloodBtn,
                  medicalProfile.bloodGroup === g && styles.bloodBtnActive,
                ]}
                onPress={() => setBloodGroup(g)}
              >
                <Text
                  style={[
                    styles.bloodBtnText,
                    medicalProfile.bloodGroup === g && styles.bloodBtnTextActive,
                  ]}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.subLabel}>Facteur Rhésus</Text>
          <View style={styles.rhRow}>
            <TouchableOpacity
              style={[styles.rhBtn, medicalProfile.rhFactor === "Positif" && styles.rhBtnActive]}
              onPress={() => setRhFactor("Positif")}
            >
              <Text
                style={[
                  styles.rhBtnText,
                  medicalProfile.rhFactor === "Positif" && styles.rhBtnTextActive,
                ]}
              >
                Positif (+)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rhBtn, medicalProfile.rhFactor === "Négatif" && styles.rhBtnActive]}
              onPress={() => setRhFactor("Négatif")}
            >
              <Text
                style={[
                  styles.rhBtnText,
                  medicalProfile.rhFactor === "Négatif" && styles.rhBtnTextActive,
                ]}
              >
                Négatif (-)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={18} color="#E67E22" />
            <Text style={styles.cardTitle}>Allergies</Text>
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newAllergy}
              onChangeText={setNewAllergy}
              placeholder="Nouvelle allergie"
              placeholderTextColor={MedicalColors.textSecondary}
              onSubmitEditing={handleAddAllergy}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddAllergy}>
              <Plus size={18} color={MedicalColors.white} />
            </TouchableOpacity>
          </View>
          {medicalProfile.allergies.map((a) => (
            <View key={a.id} style={styles.listItem}>
              <View
                style={[
                  styles.severityDot,
                  a.severity === "severe" && { backgroundColor: MedicalColors.urgency },
                ]}
              />
              <Text style={styles.listItemText}>{a.name}</Text>
              <TouchableOpacity onPress={() => removeAllergy(a.id)}>
                <Trash2 size={16} color={MedicalColors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {medicalProfile.allergies.length === 0 && (
            <Text style={styles.emptyText}>Aucune allergie</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Heart size={18} color={MedicalColors.urgency} />
            <Text style={styles.cardTitle}>Maladies chroniques</Text>
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newDisease}
              onChangeText={setNewDisease}
              placeholder="Nouvelle maladie"
              placeholderTextColor={MedicalColors.textSecondary}
              onSubmitEditing={handleAddDisease}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddDisease}>
              <Plus size={18} color={MedicalColors.white} />
            </TouchableOpacity>
          </View>
          {medicalProfile.chronicDiseases.map((d) => (
            <View key={d.id} style={styles.listItem}>
              <View style={styles.severityDot} />
              <Text style={styles.listItemText}>{d.name}</Text>
              <TouchableOpacity onPress={() => removeChronicDisease(d.id)}>
                <Trash2 size={16} color={MedicalColors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {medicalProfile.chronicDiseases.length === 0 && (
            <Text style={styles.emptyText}>Aucune maladie chronique</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Pill size={18} color={MedicalColors.medical} />
            <Text style={styles.cardTitle}>Traitements en cours</Text>
          </View>
          <TextInput
            style={styles.input}
            value={newMedName}
            onChangeText={setNewMedName}
            placeholder="Nom du médicament"
            placeholderTextColor={MedicalColors.textSecondary}
          />
          <TextInput
            style={styles.input}
            value={newMedDosage}
            onChangeText={setNewMedDosage}
            placeholder="Posologie"
            placeholderTextColor={MedicalColors.textSecondary}
          />
          <View style={styles.freqRow}>
            {["matin", "midi", "soir", "nuit"].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.freqBtn, newMedFreq.includes(f) && styles.freqBtnActive]}
                onPress={() => toggleFreq(f)}
              >
                <Text
                  style={[styles.freqText, newMedFreq.includes(f) && styles.freqTextActive]}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, !newMedName.trim() && styles.saveBtnDisabled]}
            onPress={handleAddMedication}
            disabled={!newMedName.trim()}
          >
            <Text style={styles.saveBtnText}>Ajouter le traitement</Text>
          </TouchableOpacity>

          {medicalProfile.medications.map((m) => (
            <View key={m.id} style={styles.medItem}>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{m.name}</Text>
                <Text style={styles.medDetail}>
                  {m.dosage} - {m.frequency.join(", ")}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeMedication(m.id)}>
                <Trash2 size={16} color={MedicalColors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {medicalProfile.medications.length === 0 && (
            <Text style={styles.emptyText}>Aucun traitement</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Phone size={18} color="#27AE60" />
            <Text style={styles.cardTitle}>Contacts d'urgence</Text>
          </View>
          <TextInput
            style={styles.input}
            value={newContactName}
            onChangeText={setNewContactName}
            placeholder="Nom complet"
            placeholderTextColor={MedicalColors.textSecondary}
          />
          <TextInput
            style={styles.input}
            value={newContactRel}
            onChangeText={setNewContactRel}
            placeholder="Lien (conjoint, parent...)"
            placeholderTextColor={MedicalColors.textSecondary}
          />
          <TextInput
            style={styles.input}
            value={newContactPhone}
            onChangeText={setNewContactPhone}
            placeholder="Numéro de téléphone"
            placeholderTextColor={MedicalColors.textSecondary}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!newContactName.trim() || !newContactPhone.trim()) && styles.saveBtnDisabled,
            ]}
            onPress={handleAddContact}
            disabled={!newContactName.trim() || !newContactPhone.trim()}
          >
            <Text style={styles.saveBtnText}>Ajouter le contact</Text>
          </TouchableOpacity>

          {medicalProfile.emergencyContacts.map((c) => (
            <View key={c.id} style={styles.contactItem}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {c.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{c.fullName}</Text>
                <Text style={styles.contactDetail}>
                  {c.relationship} - {c.phoneNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeEmergencyContact(c.id)}>
                <Trash2 size={16} color={MedicalColors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {medicalProfile.emergencyContacts.length === 0 && (
            <Text style={styles.emptyText}>Aucun contact d'urgence</Text>
          )}
        </View>

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
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: MedicalColors.medical,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  profileEmail: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
  },
  card: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  bloodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  bloodBtn: {
    width: 56,
    height: 42,
    borderRadius: 10,
    backgroundColor: MedicalColors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  bloodBtnActive: {
    backgroundColor: MedicalColors.urgency,
    borderColor: MedicalColors.urgency,
  },
  bloodBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  bloodBtnTextActive: {
    color: MedicalColors.white,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
    marginBottom: 8,
  },
  rhRow: {
    flexDirection: "row",
    gap: 10,
  },
  rhBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: MedicalColors.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  rhBtnActive: {
    backgroundColor: MedicalColors.medical,
    borderColor: MedicalColors.medical,
  },
  rhBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  rhBtnTextActive: {
    color: MedicalColors.white,
  },
  addRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  input: {
    backgroundColor: MedicalColors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: MedicalColors.text,
    borderWidth: 1,
    borderColor: MedicalColors.border,
    marginBottom: 8,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: MedicalColors.medical,
    justifyContent: "center",
    alignItems: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.background,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E67E22",
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: MedicalColors.text,
  },
  emptyText: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    paddingVertical: 12,
  },
  freqRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: MedicalColors.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  freqBtnActive: {
    backgroundColor: MedicalColors.medical,
    borderColor: MedicalColors.medical,
  },
  freqText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  freqTextActive: {
    color: MedicalColors.white,
  },
  saveBtn: {
    backgroundColor: MedicalColors.medical,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: MedicalColors.white,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  medItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.background,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  medDetail: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.background,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAFAF1",
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#27AE60",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  contactDetail: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
});
