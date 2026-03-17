import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronLeft,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Siren,
  Clock,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MedicalColors } from "@/constants/colors";
import type { AlertStatus, AlertUrgencyLevel, EmergencyAlert } from "@/types/medical";
import { useEmergencyStore } from "@/store/emergencyStore";
import { useAuthStore } from "@/store/authStore";

const DEFAULT_LAT = 9.537;
const DEFAULT_LON = -13.6785;

function getUrgencyColor(level: AlertUrgencyLevel): string {
  switch (level) {
    case "critique": return "#DC3545";
    case "grave": return "#FF8C00";
    case "modere": return "#FFC107";
  }
}

function getUrgencyLabel(level: AlertUrgencyLevel): string {
  switch (level) {
    case "critique": return "Critique";
    case "grave": return "Grave";
    case "modere": return "Modéré";
  }
}

function getStatusLabel(status: AlertStatus): string {
  switch (status) {
    case "active": return "En attente";
    case "prise_en_charge": return "Prise en charge";
    case "resolue": return "Résolue";
  }
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${Math.floor(hours / 24)}j`;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  if (dist < 1) return `${Math.round(dist * 1000)} m`;
  return `${dist.toFixed(1)} km`;
}

export default function SecouristNetworkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const alerts = useEmergencyStore((state) => state.alerts);
  const createEmergencyAlert = useEmergencyStore((state) => state.createEmergencyAlert);
  const syncAlertsFromBackend = useEmergencyStore((state) => state.syncAlertsFromBackend);
  const takeAlert = useEmergencyStore((state) => state.takeAlert);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosDescription, setSosDescription] = useState("");
  const [sosUrgency, setSosUrgency] = useState<AlertUrgencyLevel>("grave");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation pulsante du bouton SOS
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Récupération de la position GPS
  useEffect(() => {
    if (Platform.OS === "web") {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setIsLoadingLocation(false);
          },
          () => {
            setUserLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
            setIsLoadingLocation(false);
          },
          { timeout: 10000 }
        );
      } else {
        setUserLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
        setIsLoadingLocation(false);
      }
    } else {
      void (async () => {
        try {
          const Location = await import("expo-location");
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          } else {
            setUserLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
          }
        } catch {
          setUserLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
        } finally {
          setIsLoadingLocation(false);
        }
      })();
    }
  }, []);

  // Synchroniser les alertes depuis le backend au montage
  useEffect(() => {
    console.log('[SecouristNetwork] Syncing alerts from backend on mount');
    syncAlertsFromBackend();
  }, [syncAlertsFromBackend]);

  // Filtrer uniquement les alertes actives
  const activeAlerts = useMemo(() =>
    alerts.filter((a) => a.status === "active" || a.status === "prise_en_charge")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [alerts]
  );

  const handleTakeCharge = useCallback((alertId: string) => {
    Alert.alert(
      "Je vais aider",
      "Confirmez-vous que vous allez vous rendre sur place pour aider cette personne ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: "default",
          onPress: () => {
            const responderName = user ? `${user.firstName} ${user.lastName}` : "Vous";
            takeAlert(alertId, responderName);
            setSelectedAlert(null);
            Alert.alert("Merci !", "La personne en détresse sera notifiée de votre intervention.");
            console.log("[SecouristNetwork] Alert taken:", alertId);
          },
        },
      ]
    );
  }, [takeAlert, user]);

  const handleNavigateToAlert = useCallback((alert: EmergencyAlert) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${alert.latitude},${alert.longitude}(${encodeURIComponent(alert.senderName)})`,
      android: `geo:${alert.latitude},${alert.longitude}?q=${alert.latitude},${alert.longitude}(${encodeURIComponent(alert.senderName)})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`,
    });
    void Linking.openURL(url);
  }, []);

  const handleCallPerson = useCallback(async (phone?: string) => {
    if (!phone) return;
    const url = `tel:${phone.replace(/\s/g, "")}`;
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erreur", "Impossible d'effectuer l'appel");
      }
    } catch (e) {
      console.error("Erreur appel:", e);
    }
  }, []);

  const handleSendSOS = useCallback(() => {
    if (!sosDescription.trim()) {
      Alert.alert("Erreur", "Décrivez la situation d'urgence");
      return;
    }

    const loc = userLocation ?? { latitude: DEFAULT_LAT, longitude: DEFAULT_LON };
    const senderName = user ? `${user.firstName} ${user.lastName}` : "Anonyme";
    const senderPhone = user?.phone;

    const alertId = createEmergencyAlert({
      latitude: loc.latitude,
      longitude: loc.longitude,
      description: sosDescription.trim(),
      urgencyLevel: sosUrgency,
      senderName,
      senderPhone,
    });

    setShowSOSModal(false);
    setSosDescription("");
    setSosUrgency("grave");
    Alert.alert(
      "🚨 SOS envoyé",
      "Votre alerte a été envoyée à tous les utilisateurs de Kendeya. De l'aide arrive bientôt.",
      [{ text: "OK" }]
    );
    console.log("[SecouristNetwork] SOS sent:", alertId);
  }, [sosDescription, sosUrgency, userLocation, createEmergencyAlert, user]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <ChevronLeft size={24} color={MedicalColors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Réseau de Secours</Text>
          {activeAlerts.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{activeAlerts.length} alerte{activeAlerts.length > 1 ? 's' : ''} active{activeAlerts.length > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Liste des alertes */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {isLoadingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MedicalColors.urgency} />
            <Text style={styles.loadingText}>Localisation en cours...</Text>
          </View>
        ) : activeAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Siren size={56} color={MedicalColors.life} />
            </View>
            <Text style={styles.emptyTitle}>Aucune urgence en cours</Text>
            <Text style={styles.emptySubtitle}>
              Tous les utilisateurs de Kendeya sont des secouristes potentiels.
              {'\n'}En cas d'urgence, appuyez sur le bouton SOS.
            </Text>
          </View>
        ) : (
          activeAlerts.map((alert) => {
            const urgencyColor = getUrgencyColor(alert.urgencyLevel);
            const distance = userLocation
              ? haversineDistance(userLocation.latitude, userLocation.longitude, alert.latitude, alert.longitude)
              : null;

            return (
              <TouchableOpacity
                key={alert.id}
                style={[styles.alertCard, { borderLeftColor: urgencyColor }]}
                onPress={() => setSelectedAlert(alert)}
                activeOpacity={0.7}
              >
                <View style={[styles.alertUrgencyBadge, { backgroundColor: urgencyColor }]}>
                  <AlertTriangle size={20} color={MedicalColors.white} />
                </View>

                <View style={styles.alertContent}>
                  <View style={styles.alertHeader}>
                    <Text style={styles.alertSender}>{alert.senderName}</Text>
                    <Text style={styles.alertTime}>{getTimeSince(alert.createdAt)}</Text>
                  </View>

                  <Text style={styles.alertDescription} numberOfLines={2}>
                    {alert.description}
                  </Text>

                  <View style={styles.alertFooter}>
                    <View style={[styles.urgencyPill, { backgroundColor: urgencyColor + "20" }]}>
                      <Text style={[styles.urgencyPillText, { color: urgencyColor }]}>
                        {getUrgencyLabel(alert.urgencyLevel)}
                      </Text>
                    </View>

                    {distance && (
                      <View style={styles.distancePill}>
                        <MapPin size={12} color={MedicalColors.textSecondary} />
                        <Text style={styles.distanceText}>{distance}</Text>
                      </View>
                    )}

                    {alert.status === "prise_en_charge" && alert.responderName && (
                      <View style={styles.takenPill}>
                        <Text style={styles.takenPillText}>✓ Pris en charge</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modal détails d'une alerte */}
      {selectedAlert && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.alertDetailModal, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.modalHandle} />

              <View style={[styles.urgencyHeader, { backgroundColor: getUrgencyColor(selectedAlert.urgencyLevel) }]}>
                <AlertTriangle size={28} color={MedicalColors.white} />
                <Text style={styles.urgencyHeaderText}>{getUrgencyLabel(selectedAlert.urgencyLevel)}</Text>
              </View>

              <Text style={styles.modalSender}>{selectedAlert.senderName}</Text>
              <Text style={styles.modalDescription}>{selectedAlert.description}</Text>

              <View style={styles.modalMeta}>
                <View style={styles.modalMetaItem}>
                  <Clock size={16} color={MedicalColors.textSecondary} />
                  <Text style={styles.modalMetaText}>{getTimeSince(selectedAlert.createdAt)}</Text>
                </View>
                {userLocation && (
                  <View style={styles.modalMetaItem}>
                    <MapPin size={16} color={MedicalColors.medical} />
                    <Text style={[styles.modalMetaText, { color: MedicalColors.medical, fontWeight: '600' }]}>
                      {haversineDistance(userLocation.latitude, userLocation.longitude, selectedAlert.latitude, selectedAlert.longitude)}
                    </Text>
                  </View>
                )}
              </View>

              {selectedAlert.responderName && (
                <View style={styles.takenInfo}>
                  <Text style={styles.takenInfoText}>
                    ✓ Pris en charge par {selectedAlert.responderName}
                  </Text>
                </View>
              )}

              <View style={styles.modalActions}>
                {selectedAlert.status === "active" && (
                  <TouchableOpacity
                    style={styles.helpBtn}
                    onPress={() => handleTakeCharge(selectedAlert.id)}
                  >
                    <Text style={styles.helpBtnText}>Je vais aider</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => handleNavigateToAlert(selectedAlert)}
                >
                  <Navigation size={18} color={MedicalColors.white} />
                  <Text style={styles.navBtnText}>Itinéraire</Text>
                </TouchableOpacity>

                {selectedAlert.senderPhone && (
                  <TouchableOpacity
                    style={styles.callBtnModal}
                    onPress={() => handleCallPerson(selectedAlert.senderPhone)}
                  >
                    <Phone size={18} color={MedicalColors.white} />
                    <Text style={styles.callBtnText}>Appeler</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setSelectedAlert(null)}
              >
                <Text style={styles.closeModalBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Bouton SOS flottant */}
      <Animated.View style={[styles.sosFab, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={styles.sosFabInner}
          onPress={() => setShowSOSModal(true)}
          activeOpacity={0.8}
          testID="sos-btn"
        >
          <Radio size={32} color={MedicalColors.white} />
          <Text style={styles.sosFabText}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Modal création SOS */}
      <Modal visible={showSOSModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.sosModalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHandle} />

            <View style={styles.sosModalHeader}>
              <Siren size={32} color={MedicalColors.urgency} />
              <Text style={styles.sosModalTitle}>🚨 Envoyer un SOS</Text>
              <Text style={styles.sosModalSubtitle}>
                Tous les utilisateurs de Kendeya seront alertés
              </Text>
            </View>

            <Text style={styles.inputLabel}>Décrivez l'urgence</Text>
            <TextInput
              style={styles.sosInput}
              placeholder="Ex: Accident de la route, blessé grave..."
              placeholderTextColor={MedicalColors.textSecondary}
              value={sosDescription}
              onChangeText={setSosDescription}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Niveau d'urgence</Text>
            <View style={styles.urgencyOptions}>
              {(["critique", "grave", "modere"] as AlertUrgencyLevel[]).map((level) => {
                const isSelected = sosUrgency === level;
                const color = getUrgencyColor(level);

                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.urgencyOption,
                      isSelected && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => setSosUrgency(level)}
                  >
                    <Text style={[styles.urgencyOptionText, isSelected && { color: MedicalColors.white }]}>
                      {getUrgencyLabel(level)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {userLocation && (
              <View style={styles.locationInfo}>
                <MapPin size={14} color={MedicalColors.medical} />
                <Text style={styles.locationText}>
                  Votre position sera partagée : {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </Text>
              </View>
            )}

            <View style={styles.sosModalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowSOSModal(false);
                  setSosDescription("");
                  setSosUrgency("grave");
                }}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendSOSBtn} onPress={handleSendSOS}>
                <Radio size={20} color={MedicalColors.white} />
                <Text style={styles.sendSOSBtnText}>Envoyer SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: MedicalColors.urgency,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: MedicalColors.white,
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    color: MedicalColors.white,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(76,175,80,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: MedicalColors.white,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  alertCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  alertUrgencyBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  alertSender: {
    fontSize: 16,
    fontWeight: "700",
    color: MedicalColors.white,
  },
  alertTime: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
  },
  alertDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 10,
    lineHeight: 18,
  },
  alertFooter: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  urgencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    fontWeight: "600",
  },
  takenPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(76,175,80,0.2)",
    borderRadius: 8,
  },
  takenPillText: {
    fontSize: 11,
    color: MedicalColors.life,
    fontWeight: "600",
  },
  sosFab: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
  },
  sosFabInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MedicalColors.urgency,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: MedicalColors.urgency,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  sosFabText: {
    color: MedicalColors.white,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: MedicalColors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  alertDetailModal: {
    backgroundColor: "#0A0E1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  urgencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  urgencyHeaderText: {
    fontSize: 18,
    fontWeight: "800",
    color: MedicalColors.white,
    textTransform: "uppercase",
  },
  modalSender: {
    fontSize: 20,
    fontWeight: "700",
    color: MedicalColors.white,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
    marginBottom: 16,
  },
  modalMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  modalMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalMetaText: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
  },
  takenInfo: {
    backgroundColor: "rgba(76,175,80,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  takenInfoText: {
    fontSize: 13,
    color: MedicalColors.life,
    fontWeight: "600",
    textAlign: "center",
  },
  modalActions: {
    gap: 10,
    marginBottom: 16,
  },
  helpBtn: {
    backgroundColor: MedicalColors.urgency,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  helpBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: MedicalColors.white,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: MedicalColors.medical,
    paddingVertical: 14,
    borderRadius: 12,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: MedicalColors.white,
  },
  callBtnModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: MedicalColors.life,
    paddingVertical: 14,
    borderRadius: 12,
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: MedicalColors.white,
  },
  closeModalBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  closeModalBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: MedicalColors.textSecondary,
  },
  sosModalContent: {
    backgroundColor: "#0A0E1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sosModalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  sosModalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: MedicalColors.white,
    marginTop: 12,
    marginBottom: 6,
  },
  sosModalSubtitle: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: MedicalColors.white,
    marginBottom: 8,
  },
  sosInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
    color: MedicalColors.white,
  },
  urgencyOptions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  urgencyOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  urgencyOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: MedicalColors.white,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(13,110,253,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 24,
  },
  locationText: {
    flex: 1,
    fontSize: 11,
    color: MedicalColors.medical,
    fontWeight: "500",
  },
  sosModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: MedicalColors.textSecondary,
  },
  sendSOSBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: MedicalColors.urgency,
    gap: 8,
  },
  sendSOSBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: MedicalColors.white,
  },
});
