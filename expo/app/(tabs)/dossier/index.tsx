import { useCallback, useMemo, useState } from "react";
import { Modal, ScrollView, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Card, Chip, Divider, IconButton, List, Surface, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import type { BloodGroup } from "@/types/medical";
import { AlertTriangle, Droplet, HeartPulse, Pill, Trash2, User, X, Share2, Maximize2, AlertCircle, Phone, LogOut } from "lucide-react-native";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function MedicalRecordScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
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
    getQRCodeData,
    getCriticalAllergies,
  } = useMedicalStore();

  const [showQRModal, setShowQRModal] = useState(false);
  const [activeSection, setActiveSection] = useState<"info" | "history" | "treatments" | "contacts">("info");
  
  // Form states
  const [newAllergy, setNewAllergy] = useState("");
  const [allergyType, _setAllergyType] = useState<"medicament" | "alimentaire" | "autre">("medicament");
  const [newDisease, setNewDisease] = useState("");
  const [newMedication, setNewMedication] = useState({ name: "", dosage: "", frequency: [] as string[] });
  const [newContact, setNewContact] = useState({ fullName: "", relationship: "", phoneNumber: "" });

  const qrData = useMemo(() => getQRCodeData(), [getQRCodeData]);
  const criticalAllergies = useMemo(() => getCriticalAllergies(), [getCriticalAllergies]);

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/auth/login");
  }, [logout, router]);

const handleShareQR = useCallback(async () => {
    try {
      await Share.share({
        message: `Mon dossier médical d'urgence: ${qrData}`,
        title: "Dossier médical SanteConnect",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  }, [qrData]);

  const handleAddAllergy = useCallback(() => {
    if (!newAllergy.trim()) return;
    addAllergy({ name: newAllergy.trim(), type: allergyType, severity: "moderee" });
    setNewAllergy("");
  }, [newAllergy, allergyType, addAllergy]);

  const handleAddDisease = useCallback(() => {
    if (!newDisease.trim()) return;
    addChronicDisease({ name: newDisease.trim() });
    setNewDisease("");
  }, [newDisease, addChronicDisease]);

  const handleAddMedication = useCallback(() => {
    if (!newMedication.name.trim()) return;
    addMedication({
      name: newMedication.name.trim(),
      dosage: newMedication.dosage.trim() || "Non spécifié",
      frequency: newMedication.frequency as ("matin" | "midi" | "soir" | "nuit")[],
    });
    setNewMedication({ name: "", dosage: "", frequency: [] });
  }, [newMedication, addMedication]);

  const handleAddContact = useCallback(() => {
    if (!newContact.fullName.trim() || !newContact.phoneNumber.trim()) return;
    addEmergencyContact({
      fullName: newContact.fullName.trim(),
      relationship: newContact.relationship.trim() || "Non spécifié",
      phoneNumber: newContact.phoneNumber.trim(),
    });
    setNewContact({ fullName: "", relationship: "", phoneNumber: "" });
  }, [newContact, addEmergencyContact]);

  const toggleFrequency = useCallback((freq: string) => {
    setNewMedication(prev => ({
      ...prev,
      frequency: prev.frequency.includes(freq)
        ? prev.frequency.filter(f => f !== freq)
        : [...prev.frequency, freq]
    }));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header avec QR Code */}
      <Surface style={styles.header}>
        <Text style={styles.headerTitle}>Mon Dossier Médical</Text>
        
        {criticalAllergies.length > 0 && (
          <Surface style={styles.criticalAlert}>
            <AlertTriangle size={20} color={MedicalColors.urgency} />
            <Text style={styles.criticalAlertText}>
              Allergies critiques: {criticalAllergies.map(a => a.name).join(", ")}
            </Text>
          </Surface>
        )}
        
        <TouchableOpacity style={styles.qrContainer} onPress={() => setShowQRModal(true)}>
          <Surface style={styles.qrSurface}>
            <QRCode
              value={qrData}
              size={120}
              color={MedicalColors.medical}
              backgroundColor={MedicalColors.white}
            />
            <Text style={styles.qrLabel}>QR Code d'urgence</Text>
          </Surface>
          <View style={styles.qrActions}>
            <TouchableOpacity style={styles.qrAction} onPress={() => setShowQRModal(true)}>
              <Maximize2 size={20} color={MedicalColors.medical} />
              <Text style={styles.qrActionText}>Agrandir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrAction} onPress={handleShareQR}>
              <Share2 size={20} color={MedicalColors.medical} />
              <Text style={styles.qrActionText}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.qrAction, styles.logoutAction]} onPress={handleLogout}>
              <LogOut size={20} color={MedicalColors.urgency} />
              <Text style={[styles.qrActionText, styles.logoutText]}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Surface>

      {/* Navigation des sections */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionNav}>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === "info" && styles.sectionTabActive]}
          onPress={() => setActiveSection("info")}
        >
          <HeartPulse size={18} color={activeSection === "info" ? MedicalColors.medical : MedicalColors.textSecondary} />
          <Text style={[styles.sectionTabText, activeSection === "info" && styles.sectionTabTextActive]}>Infos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === "history" && styles.sectionTabActive]}
          onPress={() => setActiveSection("history")}
        >
          <AlertCircle size={18} color={activeSection === "history" ? MedicalColors.medical : MedicalColors.textSecondary} />
          <Text style={[styles.sectionTabText, activeSection === "history" && styles.sectionTabTextActive]}>Antécédents</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === "treatments" && styles.sectionTabActive]}
          onPress={() => setActiveSection("treatments")}
        >
          <Pill size={18} color={activeSection === "treatments" ? MedicalColors.medical : MedicalColors.textSecondary} />
          <Text style={[styles.sectionTabText, activeSection === "treatments" && styles.sectionTabTextActive]}>Traitements</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === "contacts" && styles.sectionTabActive]}
          onPress={() => setActiveSection("contacts")}
        >
          <Phone size={18} color={activeSection === "contacts" ? MedicalColors.medical : MedicalColors.textSecondary} />
          <Text style={[styles.sectionTabText, activeSection === "contacts" && styles.sectionTabTextActive]}>Contacts</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeSection === "info" && (
          <>
            {/* Groupe sanguin */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>
                  <Droplet size={18} color={MedicalColors.urgency} /> Groupe sanguin
                </Text>
                <View style={styles.bloodGroupContainer}>
                  {BLOOD_GROUPS.map((group) => (
                    <TouchableOpacity
                      key={group}
                      style={[
                        styles.bloodGroupButton,
                        medicalProfile.bloodGroup === group && styles.bloodGroupButtonActive,
                      ]}
                      onPress={() => setBloodGroup(group as BloodGroup)}
                    >
                      <Text
                        style={[
                          styles.bloodGroupText,
                          medicalProfile.bloodGroup === group && styles.bloodGroupTextActive,
                        ]}
                      >
                        {group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.subsectionTitle}>Facteur Rhésus</Text>
                <View style={styles.rhContainer}>
                  <TouchableOpacity
                    style={[styles.rhButton, medicalProfile.rhFactor === "Positif" && styles.rhButtonActive]}
                    onPress={() => setRhFactor("Positif")}
                  >
                    <Text style={[styles.rhText, medicalProfile.rhFactor === "Positif" && styles.rhTextActive]}>Positif</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rhButton, medicalProfile.rhFactor === "Négatif" && styles.rhButtonActive]}
                    onPress={() => setRhFactor("Négatif")}
                  >
                    <Text style={[styles.rhText, medicalProfile.rhFactor === "Négatif" && styles.rhTextActive]}>Négatif</Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>

            {/* Allergies */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Allergies</Text>
                
                <View style={styles.inputRow}>
                  <TextInput
                    label="Nouvelle allergie"
                    value={newAllergy}
                    onChangeText={setNewAllergy}
                    mode="outlined"
                    style={[styles.input, { flex: 1 }]}
                    outlineColor={MedicalColors.border}
                    activeOutlineColor={MedicalColors.medical}
                  />
                  <Button
                    mode="contained"
                    onPress={handleAddAllergy}
                    buttonColor={MedicalColors.medical}
                    disabled={!newAllergy.trim()}
                    style={styles.addButton}
                  >
                    Ajouter
                  </Button>
                </View>
                
                <View style={styles.chipContainer}>
                  {medicalProfile.allergies.map((allergy) => (
                    <Chip
                      key={allergy.id}
                      onClose={() => removeAllergy(allergy.id)}
                      style={[
                        styles.allergyChip,
                        allergy.severity === "severe" && styles.severeAllergyChip,
                      ]}
                      textStyle={allergy.severity === "severe" ? styles.severeAllergyText : undefined}
                    >
                      {allergy.name} ({allergy.type})
                    </Chip>
                  ))}
                </View>
                
                {medicalProfile.allergies.length === 0 && (
                  <Text style={styles.emptyText}>Aucune allergie enregistrée</Text>
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {activeSection === "history" && (
          <>
            {/* Maladies chroniques */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Maladies chroniques</Text>
                
                <View style={styles.inputRow}>
                  <TextInput
                    label="Nouvelle maladie"
                    value={newDisease}
                    onChangeText={setNewDisease}
                    mode="outlined"
                    style={[styles.input, { flex: 1 }]}
                    outlineColor={MedicalColors.border}
                    activeOutlineColor={MedicalColors.medical}
                  />
                  <Button
                    mode="contained"
                    onPress={handleAddDisease}
                    buttonColor={MedicalColors.medical}
                    disabled={!newDisease.trim()}
                    style={styles.addButton}
                  >
                    Ajouter
                  </Button>
                </View>
                
                {medicalProfile.chronicDiseases.map((disease) => (
                  <List.Item
                    key={disease.id}
                    title={disease.name}
                    right={(props) => (
                      <IconButton
                        {...props}
                        icon={() => <Trash2 size={20} color={MedicalColors.urgency} />}
                        onPress={() => removeChronicDisease(disease.id)}
                      />
                    )}
                    style={styles.listItem}
                  />
                ))}
                
                {medicalProfile.chronicDiseases.length === 0 && (
                  <Text style={styles.emptyText}>Aucune maladie chronique enregistrée</Text>
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {activeSection === "treatments" && (
          <>
            {/* Traitements en cours */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Traitements en cours</Text>
                
                <TextInput
                  label="Nom du médicament"
                  value={newMedication.name}
                  onChangeText={(text) => setNewMedication(prev => ({ ...prev, name: text }))}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={MedicalColors.border}
                  activeOutlineColor={MedicalColors.medical}
                />
                
                <TextInput
                  label="Posologie"
                  value={newMedication.dosage}
                  onChangeText={(text) => setNewMedication(prev => ({ ...prev, dosage: text }))}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={MedicalColors.border}
                  activeOutlineColor={MedicalColors.medical}
                  placeholder="Ex: 1 comprimé de 500mg"
                />
                
                <Text style={styles.frequencyLabel}>Fréquence:</Text>
                <View style={styles.frequencyContainer}>
                  {["matin", "midi", "soir", "nuit"].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        newMedication.frequency.includes(freq) && styles.frequencyButtonActive,
                      ]}
                      onPress={() => toggleFrequency(freq)}
                    >
                      <Text
                        style={[
                          styles.frequencyText,
                          newMedication.frequency.includes(freq) && styles.frequencyTextActive,
                        ]}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Button
                  mode="contained"
                  onPress={handleAddMedication}
                  buttonColor={MedicalColors.medical}
                  disabled={!newMedication.name.trim()}
                  style={styles.button}
                >
                  Ajouter le médicament
                </Button>
                
                <Divider style={styles.divider} />
                
                {medicalProfile.medications.map((med) => (
                  <List.Item
                    key={med.id}
                    title={med.name}
                    description={`${med.dosage} - ${med.frequency.join(", ")}`}
                    right={(props) => (
                      <IconButton
                        {...props}
                        icon={() => <Trash2 size={20} color={MedicalColors.urgency} />}
                        onPress={() => removeMedication(med.id)}
                      />
                    )}
                    style={styles.listItem}
                  />
                ))}
                
                {medicalProfile.medications.length === 0 && (
                  <Text style={styles.emptyText}>Aucun traitement en cours</Text>
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {activeSection === "contacts" && (
          <>
            {/* Contacts d'urgence */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Contacts d'urgence</Text>
                
                <TextInput
                  label="Nom complet"
                  value={newContact.fullName}
                  onChangeText={(text) => setNewContact(prev => ({ ...prev, fullName: text }))}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={MedicalColors.border}
                  activeOutlineColor={MedicalColors.medical}
                />
                
                <TextInput
                  label="Lien (conjoint, parent, ami...)"
                  value={newContact.relationship}
                  onChangeText={(text) => setNewContact(prev => ({ ...prev, relationship: text }))}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={MedicalColors.border}
                  activeOutlineColor={MedicalColors.medical}
                />
                
                <TextInput
                  label="Numéro de téléphone"
                  value={newContact.phoneNumber}
                  onChangeText={(text) => setNewContact(prev => ({ ...prev, phoneNumber: text }))}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={MedicalColors.border}
                  activeOutlineColor={MedicalColors.medical}
                  keyboardType="phone-pad"
                />
                
                <Button
                  mode="contained"
                  onPress={handleAddContact}
                  buttonColor={MedicalColors.medical}
                  disabled={!newContact.fullName.trim() || !newContact.phoneNumber.trim()}
                  style={styles.button}
                >
                  Ajouter le contact
                </Button>
                
                <Divider style={styles.divider} />
                
                {medicalProfile.emergencyContacts.map((contact) => (
                  <List.Item
                    key={contact.id}
                    title={contact.fullName}
                    description={`${contact.relationship} - ${contact.phoneNumber}`}
                    left={(props) => <User {...props} size={24} color={MedicalColors.medical} />}
                    right={(props) => (
                      <IconButton
                        {...props}
                        icon={() => <Trash2 size={20} color={MedicalColors.urgency} />}
                        onPress={() => removeEmergencyContact(contact.id)}
                      />
                    )}
                    style={styles.listItem}
                  />
                ))}
                
                {medicalProfile.emergencyContacts.length === 0 && (
                  <Text style={styles.emptyText}>Aucun contact d'urgence enregistré</Text>
                )}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>

      {/* Modal QR Code */}
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR Code d'urgence</Text>
              <IconButton icon={() => <X size={24} color={MedicalColors.text} />} onPress={() => setShowQRModal(false)} />
            </View>
            
            <View style={styles.modalQRContainer}>
              <QRCode
                value={qrData}
                size={250}
                color={MedicalColors.medical}
                backgroundColor={MedicalColors.white}
              />
            </View>
            
            <Text style={styles.modalDescription}>
              Ce QR code contient vos informations médicales essentielles pour les secours en cas d'urgence.
            </Text>
            
            <Button
              mode="contained"
              onPress={handleShareQR}
              buttonColor={MedicalColors.medical}
              style={styles.modalButton}
              icon={() => <Share2 size={18} color={MedicalColors.white} />}
            >
              Partager le QR Code
            </Button>
          </Surface>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoutAction: {
    backgroundColor: MedicalColors.urgencyLight,
  },
  logoutText: {
    color: MedicalColors.urgency,
  },
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: MedicalColors.white,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: MedicalColors.medical,
    marginBottom: 12,
  },
  criticalAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MedicalColors.urgencyLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  criticalAlertText: {
    color: MedicalColors.urgencyDark,
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  qrContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  qrSurface: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: MedicalColors.white,
    alignItems: "center",
    borderWidth: 2,
    borderColor: MedicalColors.medical,
  },
  qrLabel: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 8,
  },
  qrActions: {
    flex: 1,
    gap: 12,
  },
  qrAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: MedicalColors.medicalLight,
  },
  qrActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: MedicalColors.medical,
  },
  sectionNav: {
    backgroundColor: MedicalColors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
  },
  sectionTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: MedicalColors.background,
    marginRight: 8,
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: MedicalColors.medicalLight,
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: MedicalColors.textSecondary,
  },
  sectionTabTextActive: {
    color: MedicalColors.medical,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: MedicalColors.white,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: MedicalColors.text,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: MedicalColors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  bloodGroupContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bloodGroupButton: {
    width: 50,
    height: 40,
    borderRadius: 8,
    backgroundColor: MedicalColors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  bloodGroupButtonActive: {
    backgroundColor: MedicalColors.urgency,
    borderColor: MedicalColors.urgency,
  },
  bloodGroupText: {
    fontSize: 14,
    fontWeight: "600",
    color: MedicalColors.text,
  },
  bloodGroupTextActive: {
    color: MedicalColors.white,
  },
  rhContainer: {
    flexDirection: "row",
    gap: 12,
  },
  rhButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: MedicalColors.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  rhButtonActive: {
    backgroundColor: MedicalColors.medical,
    borderColor: MedicalColors.medical,
  },
  rhText: {
    fontSize: 14,
    fontWeight: "600",
    color: MedicalColors.text,
  },
  rhTextActive: {
    color: MedicalColors.white,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  input: {
    backgroundColor: MedicalColors.background,
    marginBottom: 12,
  },
  addButton: {
    marginTop: -12,
  },
  button: {
    marginTop: 8,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  allergyChip: {
    backgroundColor: MedicalColors.warningLight,
  },
  severeAllergyChip: {
    backgroundColor: MedicalColors.urgency,
  },
  severeAllergyText: {
    color: MedicalColors.white,
  },
  emptyText: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 16,
  },
  listItem: {
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 16,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: MedicalColors.text,
    marginBottom: 8,
  },
  frequencyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: MedicalColors.background,
    borderWidth: 1,
    borderColor: MedicalColors.border,
  },
  frequencyButtonActive: {
    backgroundColor: MedicalColors.medical,
    borderColor: MedicalColors.medical,
  },
  frequencyText: {
    fontSize: 14,
    color: MedicalColors.text,
  },
  frequencyTextActive: {
    color: MedicalColors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    backgroundColor: MedicalColors.white,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: MedicalColors.text,
  },
  modalQRContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButton: {
    borderRadius: 8,
  },
});
