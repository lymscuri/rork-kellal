import { router } from "expo-router";
import { AlertCircle, Bot, ChevronRight, Hospital, MapPin, Phone } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Chip, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { MedicalColors } from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HOSPITALS = [
  { name: "CHU Donka", location: "Conakry", number: "115" },
  { name: "Hôpital Ignace Deen", location: "Conakry", number: "115" },
  { name: "Hôpital Sino-Guinéen", location: "Kipé, Conakry", number: "1234" },
  { name: "SAMU Guinée", location: "Urgences", number: "442" },
  { name: "Croix-Rouge Guinée", location: "Secours", number: "3013" },
  { name: "Protection Civile", location: "Pompiers", number: "18" },
];

const DEFAULT_REGION = {
  latitude: 9.5370,
  longitude: -13.6785,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function EmergencyHomeScreen() {
  const criticalAllergies: { name: string }[] = [];
  const medicalProfile = { bloodGroup: '' };
  const isPregnant = false;

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (Platform.OS === "web") {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => setUserLocation({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude }),
          { timeout: 10000 }
        );
      } else {
        setUserLocation({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
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
            setUserLocation({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
          }
        } catch {
          setUserLocation({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
        }
      })();
    }
  }, []);

  const handleEmergencyCall = useCallback(async (number: string) => {
    const url = `tel:${number}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Erreur", "Impossible d'effectuer l'appel");
    }
  }, []);

  const handleChatPress = useCallback(() => {
    router.push("/(tabs)/urgence/chat");
  }, []);

  const handleMapPress = useCallback(() => {
    router.push("/(tabs)/urgence/map");
  }, []);

  const mapRegion = userLocation
    ? { ...userLocation, latitudeDelta: 0.06, longitudeDelta: 0.06 }
    : DEFAULT_REGION;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {(medicalProfile.bloodGroup || criticalAllergies.length > 0 || isPregnant) && (
        <View style={styles.medicalBanner}>
          {medicalProfile.bloodGroup && (
            <Chip style={styles.chip} textStyle={styles.chipText}>
              Groupe: {medicalProfile.bloodGroup}
            </Chip>
          )}
          {isPregnant && (
            <Chip style={[styles.chip, styles.pregnancyChip]} textStyle={styles.chipText}>
              Grossesse en cours
            </Chip>
          )}
        </View>
      )}

      {criticalAllergies.length > 0 && (
        <Surface style={styles.allergyAlert}>
          <AlertCircle color={MedicalColors.urgency} size={20} />
          <Text style={styles.allergyText}>
            Allergie critique: {criticalAllergies.map(a => a.name).join(", ")}
          </Text>
        </Surface>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* AI Assistant Button */}
        <View style={styles.topSection}>
          <Animated.View style={[styles.emergencyButtonWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={handleChatPress}
              activeOpacity={0.8}
              testID="ai-assistant-btn"
            >
              <Bot color={MedicalColors.white} size={36} />
              <Text style={styles.emergencyButtonText}>ASSISTANT IA</Text>
              <Text style={styles.emergencyButtonSubtext}>Premiers secours</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Map Preview */}
        <View style={styles.mapSection}>
          <View style={styles.sectionHeader}>
            <MapPin color={MedicalColors.medical} size={18} />
            <Text style={styles.sectionTitle}>Carte des secours</Text>
            <TouchableOpacity style={styles.seeAllBtn} onPress={handleMapPress}>
              <Text style={styles.seeAllText}>Voir tout</Text>
              <ChevronRight color={MedicalColors.medical} size={16} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.9} onPress={handleMapPress} style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              style={styles.mapPreview}
              region={mapRegion}
              showsUserLocation
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              pointerEvents="none"
            >
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Vous êtes ici"
                  pinColor={MedicalColors.medical}
                />
              )}
            </MapView>
            <View style={styles.mapOverlay}>
              <View style={styles.mapOverlayPill}>
                <MapPin color={MedicalColors.white} size={14} />
                <Text style={styles.mapOverlayText}>Appuyez pour explorer</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Hospitals - Compact horizontal cards */}
        <View style={styles.hospitalsSection}>
          <View style={styles.sectionHeader}>
            <Hospital color={MedicalColors.urgency} size={18} />
            <Text style={styles.sectionTitle}>Numéros d'urgence</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hospitalsScroll}
          >
            {HOSPITALS.map((hospital, index) => (
              <TouchableOpacity
                key={index}
                style={styles.hospitalCard}
                onPress={() => handleEmergencyCall(hospital.number)}
                activeOpacity={0.7}
                testID={`hospital-${index}`}
              >
                <View style={styles.hospitalCardTop}>
                  <View style={styles.hospitalIconBg}>
                    <Hospital color={MedicalColors.urgency} size={16} />
                  </View>
                  <View style={styles.phoneCallBadge}>
                    <Phone color={MedicalColors.white} size={12} />
                  </View>
                </View>
                <Text style={styles.hospitalName} numberOfLines={2}>{hospital.name}</Text>
                <Text style={styles.hospitalLocation}>{hospital.location}</Text>
                <View style={styles.hospitalNumberRow}>
                  <Text style={styles.hospitalNumber}>{hospital.number}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsSectionTitle}>En cas d'urgence</Text>
          <View style={styles.tipsGrid}>
            {[
              { num: "1", text: "Restez calme" },
              { num: "2", text: "Appelez les secours" },
              { num: "3", text: "Ne déplacez pas le blessé" },
              { num: "4", text: "Utilisez l'assistant IA" },
            ].map((tip) => (
              <View key={tip.num} style={styles.tipCard}>
                <View style={styles.tipNumCircle}>
                  <Text style={styles.tipNum}>{tip.num}</Text>
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F3F5",
  },
  medicalBanner: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: MedicalColors.medicalLight,
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: MedicalColors.white,
    height: 32,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.medical,
  },
  pregnancyChip: {
    backgroundColor: MedicalColors.maternityLight,
  },
  allergyAlert: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: MedicalColors.urgencyLight,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  allergyText: {
    color: MedicalColors.urgencyDark,
    fontWeight: "600" as const,
    fontSize: 14,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  topSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 16,
  },
  emergencyButtonWrapper: {},
  emergencyButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: MedicalColors.urgency,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: MedicalColors.urgency,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  emergencyButtonText: {
    color: MedicalColors.white,
    fontSize: 16,
    fontWeight: "800" as const,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  emergencyButtonSubtext: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 2,
  },
  mapSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    flex: 1,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: MedicalColors.medical,
    fontWeight: "600" as const,
  },
  mapWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    height: 200,
    backgroundColor: MedicalColors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapPreview: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  mapOverlayPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(13,110,253,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  mapOverlayText: {
    color: MedicalColors.white,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  hospitalsSection: {
    marginBottom: 20,
  },
  hospitalsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  hospitalCard: {
    width: SCREEN_WIDTH * 0.33,
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  hospitalCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hospitalIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: MedicalColors.urgencyLight,
    justifyContent: "center",
    alignItems: "center",
  },
  phoneCallBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MedicalColors.life,
    justifyContent: "center",
    alignItems: "center",
  },
  hospitalName: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    lineHeight: 17,
    minHeight: 34,
  },
  hospitalLocation: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  hospitalNumberRow: {
    marginTop: 6,
    backgroundColor: MedicalColors.urgencyLight,
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  hospitalNumber: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: MedicalColors.urgency,
    letterSpacing: 1,
  },
  tipsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tipsSectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    marginBottom: 10,
  },
  tipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MedicalColors.white,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tipNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MedicalColors.medical,
    justifyContent: "center",
    alignItems: "center",
  },
  tipNum: {
    color: MedicalColors.white,
    fontWeight: "800" as const,
    fontSize: 13,
  },
  tipText: {
    fontSize: 12,
    color: MedicalColors.text,
    flex: 1,
    fontWeight: "500" as const,
  },
  bottomSpacer: {
    height: 20,
  },
});
