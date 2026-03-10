import { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
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
  Check,
  Eye,
  EyeOff,
  Lock,
  QrCode,
  Share2,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react-native";
import type { SharedAccess } from "@/types/medical";

let QRCode: React.ComponentType<{ value: string; size: number; color: string; backgroundColor: string }> | null = null;
try {
  if (Platform.OS !== "web") {
    QRCode = require("react-native-qrcode-svg").default;
  }
} catch {
  QRCode = null;
}

function QRCodeDisplay({ value, size, color }: { value: string; size: number; color: string }) {
  if (Platform.OS === "web" || !QRCode) {
    return (
      <View style={[qrStyles.fallback, { width: size, height: size }]}>
        <QrCode size={40} color={MedicalColors.medical} />
        <Text style={qrStyles.fallbackText}>QR Code</Text>
        <Text style={qrStyles.fallbackSub}>Disponible sur mobile</Text>
      </View>
    );
  }
  return <QRCode value={value} size={size} color={color} backgroundColor={MedicalColors.white} />;
}

const qrStyles = StyleSheet.create({
  fallback: {
    backgroundColor: MedicalColors.medicalLight,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: MedicalColors.medical,
    borderStyle: "dashed",
    gap: 4,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.medical,
  },
  fallbackSub: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
  },
});

export default function ShareScreen() {
  const { user } = useAuthStore();
  const { sharedAccess, addSharedAccess, removeSharedAccess, toggleSharedAccess, getQRCodeData } = useMedicalStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [accessLevel, setAccessLevel] = useState<SharedAccess["accessLevel"]>("partiel");

  const qrData = getQRCodeData();

  const handleShare = useCallback(async () => {
    try {
      const msg = `Dossier médical de ${user?.firstName ?? ""} ${user?.lastName ?? ""}\n\nDonnées d'urgence:\n${qrData}`;
      await Share.share({ message: msg, title: "Dossier médical" });
    } catch (e) {
      console.error("Share error:", e);
    }
  }, [user, qrData]);

  const handleAddAccess = useCallback(() => {
    if (!doctorName.trim()) {
      Alert.alert("Champ requis", "Veuillez entrer le nom du praticien.");
      return;
    }
    addSharedAccess({
      doctorName: doctorName.trim(),
      specialty: specialty.trim() || "Généraliste",
      grantedDate: new Date().toISOString().split("T")[0],
      accessLevel,
      isActive: true,
    });
    setDoctorName("");
    setSpecialty("");
    setAccessLevel("partiel");
    setShowAddForm(false);
  }, [doctorName, specialty, accessLevel, addSharedAccess]);

  const getAccessIcon = useCallback((level: SharedAccess["accessLevel"]) => {
    switch (level) {
      case "complet":
        return <ShieldCheck size={16} color="#27AE60" />;
      case "urgence":
        return <Shield size={16} color={MedicalColors.urgency} />;
      default:
        return <Lock size={16} color={MedicalColors.medical} />;
    }
  }, []);

  const getAccessLabel = useCallback((level: SharedAccess["accessLevel"]) => {
    switch (level) {
      case "complet":
        return "Accès complet";
      case "urgence":
        return "Urgence uniquement";
      default:
        return "Accès partiel";
    }
  }, []);

  const accessLevels: { key: SharedAccess["accessLevel"]; label: string; desc: string }[] = [
    { key: "partiel", label: "Partiel", desc: "Infos de base" },
    { key: "complet", label: "Complet", desc: "Tout le dossier" },
    { key: "urgence", label: "Urgence", desc: "Données critiques" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.qrSection}>
        <Text style={styles.qrTitle}>QR Code d'urgence</Text>
        <Text style={styles.qrSubtitle}>
          Partagez ce code avec les professionnels de santé
        </Text>
        <View style={styles.qrBox}>
          <QRCodeDisplay value={qrData} size={180} color={MedicalColors.medical} />
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Share2 size={18} color={MedicalColors.white} />
          <Text style={styles.shareBtnText}>Partager mon dossier</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Praticiens autorisés</Text>
          <TouchableOpacity
            style={styles.addAccessBtn}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? (
              <Text style={styles.addAccessBtnText}>Annuler</Text>
            ) : (
              <>
                <UserPlus size={16} color={MedicalColors.medical} />
                <Text style={styles.addAccessBtnText}>Ajouter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {showAddForm && (
          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              value={doctorName}
              onChangeText={setDoctorName}
              placeholder="Nom du praticien"
              placeholderTextColor={MedicalColors.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="Spécialité"
              placeholderTextColor={MedicalColors.textSecondary}
            />

            <Text style={styles.accessLabel}>Niveau d'accès</Text>
            <View style={styles.accessOptions}>
              {accessLevels.map((al) => (
                <TouchableOpacity
                  key={al.key}
                  style={[
                    styles.accessOption,
                    accessLevel === al.key && styles.accessOptionActive,
                  ]}
                  onPress={() => setAccessLevel(al.key)}
                >
                  <Text
                    style={[
                      styles.accessOptionLabel,
                      accessLevel === al.key && styles.accessOptionLabelActive,
                    ]}
                  >
                    {al.label}
                  </Text>
                  <Text style={styles.accessOptionDesc}>{al.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleAddAccess}>
              <Check size={18} color={MedicalColors.white} />
              <Text style={styles.confirmBtnText}>Autoriser l'accès</Text>
            </TouchableOpacity>
          </View>
        )}

        {sharedAccess.length === 0 && !showAddForm ? (
          <View style={styles.emptyAccess}>
            <Lock size={32} color={MedicalColors.border} />
            <Text style={styles.emptyTitle}>Aucun partage actif</Text>
            <Text style={styles.emptySubtitle}>
              Autorisez des praticiens à accéder à votre dossier
            </Text>
          </View>
        ) : (
          sharedAccess.map((access) => (
            <View key={access.id} style={styles.accessCard}>
              <View style={styles.accessCardLeft}>
                <View style={styles.accessAvatar}>
                  <Text style={styles.accessAvatarText}>
                    {access.doctorName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.accessInfo}>
                  <Text style={styles.accessName}>{access.doctorName}</Text>
                  <Text style={styles.accessSpecialty}>{access.specialty}</Text>
                  <View style={styles.accessMeta}>
                    {getAccessIcon(access.accessLevel)}
                    <Text style={styles.accessMetaText}>
                      {getAccessLabel(access.accessLevel)}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.accessActions}>
                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => toggleSharedAccess(access.id)}
                >
                  {access.isActive ? (
                    <Eye size={18} color="#27AE60" />
                  ) : (
                    <EyeOff size={18} color={MedicalColors.textSecondary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeSharedAccess(access.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={18} color={MedicalColors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Shield size={20} color={MedicalColors.medical} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Sécurité des données</Text>
          <Text style={styles.infoText}>
            Vos données médicales sont protégées. Seuls les praticiens que vous autorisez
            peuvent consulter votre dossier. Vous pouvez révoquer l'accès à tout moment.
          </Text>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
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
  qrSection: {
    backgroundColor: MedicalColors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    marginBottom: 20,
    textAlign: "center" as const,
  },
  qrBox: {
    padding: 16,
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MedicalColors.border,
    marginBottom: 20,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: MedicalColors.medical,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    width: "100%",
  },
  shareBtnText: {
    color: MedicalColors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  section: {
    backgroundColor: MedicalColors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  addAccessBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addAccessBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.medical,
  },
  addForm: {
    backgroundColor: MedicalColors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 10,
  },
  accessLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  accessOptions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  accessOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: MedicalColors.white,
    borderWidth: 1,
    borderColor: MedicalColors.border,
    alignItems: "center",
  },
  accessOptionActive: {
    borderColor: MedicalColors.medical,
    backgroundColor: "#EBF5FB",
  },
  accessOptionLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  accessOptionLabelActive: {
    color: MedicalColors.medical,
  },
  accessOptionDesc: {
    fontSize: 10,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: MedicalColors.medical,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: MedicalColors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  emptyAccess: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.text,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    textAlign: "center" as const,
  },
  accessCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.background,
  },
  accessCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  accessAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MedicalColors.medicalLight,
    justifyContent: "center",
    alignItems: "center",
  },
  accessAvatarText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.medical,
  },
  accessInfo: {
    flex: 1,
  },
  accessName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  accessSpecialty: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
  },
  accessMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  accessMetaText: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
  },
  accessActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleBtn: {
    padding: 4,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: MedicalColors.medicalLight,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: MedicalColors.medical,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: MedicalColors.medicalDark,
    lineHeight: 18,
  },
});
