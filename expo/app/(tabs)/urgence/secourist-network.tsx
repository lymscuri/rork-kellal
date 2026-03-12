import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronLeft,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Shield,
  ShieldCheck,
  Siren,
  Users,
  X,
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
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { MedicalColors } from "@/constants/colors";
import type { AlertStatus, AlertUrgencyLevel, EmergencyAlert, Secourist } from "@/types/medical";

const DEFAULT_LAT = 9.537;
const DEFAULT_LON = -13.6785;

const MOCK_SECOURISTS: Secourist[] = [
  { id: "s1", name: "Mamadou Diallo", phone: "+224620000001", latitude: 9.54, longitude: -13.675, isAvailable: true, specialty: "Secouriste certifié", lastActive: new Date().toISOString() },
  { id: "s2", name: "Aissatou Barry", phone: "+224620000002", latitude: 9.535, longitude: -13.682, isAvailable: true, specialty: "Infirmière", lastActive: new Date().toISOString() },
  { id: "s3", name: "Ibrahim Camara", phone: "+224620000003", latitude: 9.532, longitude: -13.671, isAvailable: false, specialty: "Pompier volontaire", lastActive: new Date(Date.now() - 3600000).toISOString() },
  { id: "s4", name: "Fatoumata Soumah", phone: "+224620000004", latitude: 9.543, longitude: -13.688, isAvailable: true, specialty: "Agent de santé", lastActive: new Date().toISOString() },
];

const MOCK_ALERTS: EmergencyAlert[] = [
  {
    id: "a1",
    senderId: "u1",
    senderName: "Ousmane Bah",
    senderPhone: "+224620000010",
    latitude: 9.538,
    longitude: -13.68,
    description: "Accident de la route, personne blessée",
    urgencyLevel: "critique",
    status: "active",
    createdAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "a2",
    senderId: "u2",
    senderName: "Kadiatou Balde",
    senderPhone: "+224620000011",
    latitude: 9.534,
    longitude: -13.676,
    description: "Malaise cardiaque, besoin d'aide urgente",
    urgencyLevel: "critique",
    status: "prise_en_charge",
    responderId: "s1",
    responderName: "Mamadou Diallo",
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "a3",
    senderId: "u3",
    senderName: "Alpha Souare",
    latitude: 9.541,
    longitude: -13.672,
    description: "Chute dans l'escalier, douleur au genou",
    urgencyLevel: "modere",
    status: "active",
    createdAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
  },
];

function getUrgencyColor(level: AlertUrgencyLevel): string {
  switch (level) {
    case "critique": return MedicalColors.urgency;
    case "grave": return "#FF8C00";
    case "modere": return MedicalColors.warning;
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

function getStatusColor(status: AlertStatus): string {
  switch (status) {
    case "active": return MedicalColors.urgency;
    case "prise_en_charge": return "#FF8C00";
    case "resolue": return MedicalColors.life;
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

type ViewTab = "carte" | "alertes" | "secouristes";

export default function SecouristNetworkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("carte");
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(MOCK_ALERTS);
  const [secourists] = useState<Secourist[]>(MOCK_SECOURISTS);
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosDescription, setSosDescription] = useState("");
  const [sosUrgency, setSosUrgency] = useState<AlertUrgencyLevel>("grave");

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (Platform.OS === "web") {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => setUserLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON }),
          { timeout: 10000 }
        );
      } else {
        setUserLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
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
        }
      })();
    }
  }, []);

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status !== "resolue"), [alerts]);
  const availableSecourists = useMemo(() => secourists.filter((s) => s.isAvailable), [secourists]);

  const mapRegion = useMemo(() => {
    if (userLocation) return { ...userLocation, latitudeDelta: 0.03, longitudeDelta: 0.03 };
    return { latitude: DEFAULT_LAT, longitude: DEFAULT_LON, latitudeDelta: 0.03, longitudeDelta: 0.03 };
  }, [userLocation]);

  const handleTakeCharge = useCallback((alertId: string) => {
    Alert.alert(
      "Prendre en charge",
      "Voulez-vous prendre en charge cette alerte et vous rendre sur place ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: "default",
          onPress: () => {
            setAlerts((prev) =>
              prev.map((a) =>
                a.id === alertId
                  ? { ...a, status: "prise_en_charge" as const, responderId: "me", responderName: "Vous", updatedAt: new Date().toISOString() }
                  : a
              )
            );
            setSelectedAlert(null);
            console.log("[SecouristNetwork] Alert taken:", alertId);
          },
        },
      ]
    );
  }, []);

  const handleNavigateToAlert = useCallback((alert: EmergencyAlert) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${alert.latitude},${alert.longitude}(${encodeURIComponent(alert.senderName)})`,
      android: `geo:${alert.latitude},${alert.longitude}?q=${alert.latitude},${alert.longitude}(${encodeURIComponent(alert.senderName)})`,
      default: `https://www.openstreetmap.org/?mlat=${alert.latitude}&mlon=${alert.longitude}#map=17/${alert.latitude}/${alert.longitude}`,
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
    const newAlert: EmergencyAlert = {
      id: `a-${Date.now()}`,
      senderId: "me",
      senderName: "Vous",
      latitude: loc.latitude,
      longitude: loc.longitude,
      description: sosDescription.trim(),
      urgencyLevel: sosUrgency,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setShowSOSModal(false);
    setSosDescription("");
    Alert.alert("Alerte envoyée", "Les secouristes proches ont été notifiés de votre position.");
    console.log("[SecouristNetwork] SOS sent:", newAlert.id);
  }, [sosDescription, sosUrgency, userLocation]);

  const handleFocusOnAlert = useCallback((alert: EmergencyAlert) => {
    setSelectedAlert(alert);
    setActiveTab("carte");
    mapRef.current?.animateToRegion(
      { latitude: alert.latitude, longitude: alert.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 },
      500
    );
  }, []);

  const getAlertMarkerColor = (alert: EmergencyAlert): string => {
    if (alert.status === "prise_en_charge") return "#FF8C00";
    if (alert.urgencyLevel === "critique") return MedicalColors.urgency;
    if (alert.urgencyLevel === "grave") return "#FF8C00";
    return "#FFC107";
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <ChevronLeft size={24} color={MedicalColors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Réseau de Secouristes</Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStatPill}>
              <View style={[styles.statusDot, { backgroundColor: MedicalColors.urgency }]} />
              <Text style={styles.headerStatText}>{activeAlerts.length} alertes</Text>
            </View>
            <View style={styles.headerStatPill}>
              <View style={[styles.statusDot, { backgroundColor: MedicalColors.life }]} />
              <Text style={styles.headerStatText}>{availableSecourists.length} dispo.</Text>
            </View>
          </View>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabBar}>
        {(["carte", "alertes", "secouristes"] as ViewTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            {tab === "carte" && <MapPin size={14} color={activeTab === tab ? MedicalColors.white : MedicalColors.textSecondary} />}
            {tab === "alertes" && <Siren size={14} color={activeTab === tab ? MedicalColors.white : MedicalColors.textSecondary} />}
            {tab === "secouristes" && <Users size={14} color={activeTab === tab ? MedicalColors.white : MedicalColors.textSecondary} />}
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "carte" ? "Carte" : tab === "alertes" ? "Alertes" : "Secouristes"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "carte" && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            region={mapRegion}
            showsUserLocation
            showsMyLocationButton
          >
            {activeAlerts.map((alert) => (
              <Marker
                key={alert.id}
                coordinate={{ latitude: alert.latitude, longitude: alert.longitude }}
                title={alert.senderName}
                description={alert.description}
                pinColor={getAlertMarkerColor(alert)}
                onPress={() => setSelectedAlert(alert)}
              />
            ))}
            {secourists.filter((s) => s.isAvailable).map((sec) => (
              <Marker
                key={sec.id}
                coordinate={{ latitude: sec.latitude, longitude: sec.longitude }}
                title={sec.name}
                description={sec.specialty}
                pinColor={MedicalColors.life}
              />
            ))}
          </MapView>

          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MedicalColors.urgency }]} />
              <Text style={styles.legendText}>Alerte</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#FF8C00" }]} />
              <Text style={styles.legendText}>En charge</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MedicalColors.life }]} />
              <Text style={styles.legendText}>Secouriste</Text>
            </View>
          </View>

          {selectedAlert && (
            <View style={styles.alertCard}>
              <TouchableOpacity style={styles.alertCardClose} onPress={() => setSelectedAlert(null)}>
                <X size={18} color={MedicalColors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.alertCardHeader}>
                <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(selectedAlert.urgencyLevel) }]}>
                  <AlertTriangle size={12} color={MedicalColors.white} />
                  <Text style={styles.urgencyBadgeText}>{getUrgencyLabel(selectedAlert.urgencyLevel)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAlert.status) + "20" }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedAlert.status) }]}>
                    {getStatusLabel(selectedAlert.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.alertCardName}>{selectedAlert.senderName}</Text>
              <Text style={styles.alertCardDesc}>{selectedAlert.description}</Text>
              <Text style={styles.alertCardTime}>{getTimeSince(selectedAlert.createdAt)}</Text>
              {userLocation && (
                <Text style={styles.alertCardDistance}>
                  {haversineDistance(userLocation.latitude, userLocation.longitude, selectedAlert.latitude, selectedAlert.longitude)}
                </Text>
              )}
              {selectedAlert.responderId && (
                <View style={styles.responderInfo}>
                  <ShieldCheck size={14} color={MedicalColors.life} />
                  <Text style={styles.responderText}>Pris en charge par {selectedAlert.responderName}</Text>
                </View>
              )}
              <View style={styles.alertCardActions}>
                {selectedAlert.status === "active" && (
                  <TouchableOpacity
                    style={styles.takeChargeBtn}
                    onPress={() => handleTakeCharge(selectedAlert.id)}
                  >
                    <Shield size={16} color={MedicalColors.white} />
                    <Text style={styles.takeChargeBtnText}>Prendre en charge</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.navigateBtn}
                  onPress={() => handleNavigateToAlert(selectedAlert)}
                >
                  <Navigation size={16} color={MedicalColors.medical} />
                  <Text style={styles.navigateBtnText}>Itinéraire</Text>
                </TouchableOpacity>
                {selectedAlert.senderPhone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCallPerson(selectedAlert.senderPhone)}
                  >
                    <Phone size={16} color={MedicalColors.white} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {activeTab === "alertes" && (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {activeAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <ShieldCheck size={56} color={MedicalColors.life} />
              <Text style={styles.emptyTitle}>Aucune alerte active</Text>
              <Text style={styles.emptySubtitle}>La zone est sécurisée pour le moment</Text>
            </View>
          ) : (
            activeAlerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={styles.alertListItem}
                onPress={() => handleFocusOnAlert(alert)}
                activeOpacity={0.7}
              >
                <View style={[styles.alertListBadge, { backgroundColor: getUrgencyColor(alert.urgencyLevel) }]}>
                  <AlertTriangle size={18} color={MedicalColors.white} />
                </View>
                <View style={styles.alertListContent}>
                  <View style={styles.alertListTop}>
                    <Text style={styles.alertListName}>{alert.senderName}</Text>
                    <Text style={styles.alertListTime}>{getTimeSince(alert.createdAt)}</Text>
                  </View>
                  <Text style={styles.alertListDesc} numberOfLines={2}>{alert.description}</Text>
                  <View style={styles.alertListMeta}>
                    <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(alert.status) + "20" }]}>
                      <Text style={[styles.miniStatusText, { color: getStatusColor(alert.status) }]}>
                        {getStatusLabel(alert.status)}
                      </Text>
                    </View>
                    {userLocation && (
                      <View style={styles.distancePill}>
                        <MapPin size={10} color={MedicalColors.textSecondary} />
                        <Text style={styles.distanceText}>
                          {haversineDistance(userLocation.latitude, userLocation.longitude, alert.latitude, alert.longitude)}
                        </Text>
                      </View>
                    )}
                    {alert.responderName && (
                      <View style={styles.responderPill}>
                        <ShieldCheck size={10} color={MedicalColors.life} />
                        <Text style={styles.responderPillText}>{alert.responderName}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {activeTab === "secouristes" && (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.secouristSectionHeader}>
            <Text style={styles.secouristSectionTitle}>Disponibles ({availableSecourists.length})</Text>
          </View>
          {secourists.map((sec) => (
            <View
              key={sec.id}
              style={[styles.secouristCard, !sec.isAvailable && styles.secouristCardInactive]}
            >
              <View style={styles.secouristCardLeft}>
                <View style={[styles.secouristAvatar, { backgroundColor: sec.isAvailable ? MedicalColors.life : MedicalColors.textSecondary }]}>
                  <Shield size={20} color={MedicalColors.white} />
                </View>
                <View style={[styles.availabilityDot, { backgroundColor: sec.isAvailable ? MedicalColors.life : MedicalColors.textSecondary }]} />
              </View>
              <View style={styles.secouristInfo}>
                <Text style={styles.secouristName}>{sec.name}</Text>
                <Text style={styles.secouristSpecialty}>{sec.specialty}</Text>
                <View style={styles.secouristMeta}>
                  <Text style={[styles.secouristStatus, { color: sec.isAvailable ? MedicalColors.life : MedicalColors.textSecondary }]}>
                    {sec.isAvailable ? "Disponible" : "Occupé"}
                  </Text>
                  {userLocation && (
                    <Text style={styles.secouristDistance}>
                      {haversineDistance(userLocation.latitude, userLocation.longitude, sec.latitude, sec.longitude)}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.secouristCallBtn, !sec.isAvailable && styles.secouristCallBtnInactive]}
                onPress={() => handleCallPerson(sec.phone)}
              >
                <Phone size={18} color={sec.isAvailable ? MedicalColors.white : MedicalColors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Animated.View style={[styles.sosFab, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={styles.sosFabInner}
          onPress={() => setShowSOSModal(true)}
          activeOpacity={0.8}
          testID="sos-btn"
        >
          <Radio size={28} color={MedicalColors.white} />
          <Text style={styles.sosFabText}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={showSOSModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Siren size={28} color={MedicalColors.urgency} />
              <Text style={styles.modalTitle}>Envoyer une alerte SOS</Text>
              <Text style={styles.modalSubtitle}>Les secouristes proches seront notifiés</Text>
            </View>

            <Text style={styles.inputLabel}>Décrivez la situation</Text>
            <TextInput
              style={styles.sosInput}
              placeholder="Ex: Accident de la route, personne inconsciente..."
              placeholderTextColor={MedicalColors.textSecondary}
              value={sosDescription}
              onChangeText={setSosDescription}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Niveau d'urgence</Text>
            <View style={styles.urgencyOptions}>
              {(["critique", "grave", "modere"] as AlertUrgencyLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.urgencyOption,
                    sosUrgency === level && { backgroundColor: getUrgencyColor(level), borderColor: getUrgencyColor(level) },
                  ]}
                  onPress={() => setSosUrgency(level)}
                >
                  <Text
                    style={[
                      styles.urgencyOptionText,
                      sosUrgency === level && { color: MedicalColors.white },
                    ]}
                  >
                    {getUrgencyLabel(level)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {userLocation && (
              <View style={styles.locationInfo}>
                <MapPin size={14} color={MedicalColors.medical} />
                <Text style={styles.locationText}>
                  Position: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSOSModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendSOSBtn} onPress={handleSendSOS}>
                <Radio size={18} color={MedicalColors.white} />
                <Text style={styles.sendSOSBtnText}>Envoyer l'alerte</Text>
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
    backgroundColor: "#F1F3F5",
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
    fontSize: 17,
    fontWeight: "700" as const,
    color: MedicalColors.white,
  },
  headerStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  headerStatPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStatText: {
    fontSize: 11,
    color: MedicalColors.white,
    fontWeight: "600" as const,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: MedicalColors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: MedicalColors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: MedicalColors.background,
    gap: 5,
  },
  tabActive: {
    backgroundColor: MedicalColors.urgency,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  tabTextActive: {
    color: MedicalColors.white,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapLegend: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: MedicalColors.text,
    fontWeight: "500" as const,
  },
  alertCard: {
    position: "absolute",
    bottom: 90,
    left: 12,
    right: 12,
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  alertCardClose: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  alertCardHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: MedicalColors.white,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  alertCardName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  alertCardDesc: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  alertCardTime: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    marginTop: 6,
  },
  alertCardDistance: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.medical,
    marginTop: 2,
  },
  responderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: MedicalColors.lifeLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  responderText: {
    fontSize: 12,
    color: MedicalColors.lifeDark,
    fontWeight: "500" as const,
  },
  alertCardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  takeChargeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: MedicalColors.urgency,
    borderRadius: 10,
    gap: 6,
  },
  takeChargeBtnText: {
    color: MedicalColors.white,
    fontWeight: "700" as const,
    fontSize: 13,
  },
  navigateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: MedicalColors.medicalLight,
    borderRadius: 10,
    gap: 6,
  },
  navigateBtnText: {
    color: MedicalColors.medical,
    fontWeight: "600" as const,
    fontSize: 13,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: MedicalColors.life,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  alertListItem: {
    flexDirection: "row",
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  alertListBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  alertListContent: {
    flex: 1,
  },
  alertListTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertListName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  alertListTime: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
  },
  alertListDesc: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  alertListMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: MedicalColors.background,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 10,
    color: MedicalColors.textSecondary,
    fontWeight: "500" as const,
  },
  responderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: MedicalColors.lifeLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  responderPillText: {
    fontSize: 10,
    color: MedicalColors.lifeDark,
    fontWeight: "500" as const,
  },
  secouristSectionHeader: {
    marginBottom: 10,
  },
  secouristSectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  secouristCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  secouristCardInactive: {
    opacity: 0.6,
  },
  secouristCardLeft: {
    position: "relative",
    marginRight: 12,
  },
  secouristAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  availabilityDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: MedicalColors.white,
  },
  secouristInfo: {
    flex: 1,
  },
  secouristName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  secouristSpecialty: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  secouristMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  secouristStatus: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  secouristDistance: {
    fontSize: 11,
    color: MedicalColors.medical,
    fontWeight: "500" as const,
  },
  secouristCallBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: MedicalColors.life,
    justifyContent: "center",
    alignItems: "center",
  },
  secouristCallBtnInactive: {
    backgroundColor: MedicalColors.background,
  },
  sosFab: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
  },
  sosFabInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: MedicalColors.urgency,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: MedicalColors.urgency,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  sosFabText: {
    color: MedicalColors.white,
    fontSize: 12,
    fontWeight: "800" as const,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: MedicalColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: MedicalColors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: MedicalColors.text,
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.text,
    marginBottom: 8,
  },
  sosInput: {
    backgroundColor: MedicalColors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
    borderWidth: 1,
    borderColor: MedicalColors.border,
    marginBottom: 16,
    color: MedicalColors.text,
  },
  urgencyOptions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  urgencyOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: MedicalColors.border,
  },
  urgencyOptionText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: MedicalColors.medicalLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 12,
    color: MedicalColors.medical,
    fontWeight: "500" as const,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: MedicalColors.background,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
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
    fontSize: 15,
    fontWeight: "700" as const,
    color: MedicalColors.white,
  },
});
