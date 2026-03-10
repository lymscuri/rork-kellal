import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Chip, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MedicalColors } from "@/constants/colors";
import { Building2, Clock, Cross, Phone, Stethoscope } from "lucide-react-native";

interface Hospital {
  id: string;
  name: string;
  type: "hospital" | "pharmacy" | "rescue";
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  is24h?: boolean;
  hasMaternity?: boolean;
  isOnDuty?: boolean;
  distance?: number;
}

const MOCK_HOSPITALS: Hospital[] = [
  { id: "1", name: "CHU Tokoin", type: "hospital", latitude: 6.137, longitude: 1.212, address: "Boulevard du 13 Janvier, Lomé", phone: "+228 22 21 11 11", is24h: true, hasMaternity: true, distance: 1.2 },
  { id: "2", name: "Clinique Saint Joseph", type: "hospital", latitude: 6.145, longitude: 1.205, address: "Rue des Jardins, Lomé", phone: "+228 22 27 77 77", is24h: false, hasMaternity: true, distance: 0.8 },
  { id: "3", name: "Pharmacie de la Paix", type: "pharmacy", latitude: 6.14, longitude: 1.208, address: "Avenue de la Paix, Lomé", phone: "+228 22 21 00 00", isOnDuty: true, distance: 0.5 },
  { id: "4", name: "Centre Hospitalier Adidogomé", type: "hospital", latitude: 6.13, longitude: 1.195, address: "Route de Kpalimé, Adidogomé", phone: "+228 22 25 44 44", is24h: true, hasMaternity: false, distance: 2.5 },
  { id: "5", name: "Secouristes Volontaires", type: "rescue", latitude: 6.142, longitude: 1.218, address: "Zone industrielle, Lomé", phone: "+228 91 00 00 00", is24h: true, distance: 1.8 },
  { id: "6", name: "Pharmacie Centrale", type: "pharmacy", latitude: 6.135, longitude: 1.215, address: "Boulevard Circulaire, Lomé", phone: "+228 22 22 22 22", isOnDuty: false, distance: 1.1 },
  { id: "7", name: "Maternité de Bè", type: "hospital", latitude: 6.148, longitude: 1.22, address: "Quartier Bè, Lomé", phone: "+228 22 28 88 88", is24h: false, hasMaternity: true, distance: 2.1 },
];

function getMarkerColorHelper(type: Hospital["type"]) {
  switch (type) {
    case "hospital":
      return MedicalColors.urgency;
    case "pharmacy":
      return MedicalColors.life;
    case "rescue":
      return MedicalColors.maternity;
    default:
      return MedicalColors.medical;
  }
}

function WebMapFallback({
  location,
  hospitals,
}: {
  location: Location.LocationObject | null;
  hospitals: Hospital[];
}) {
  return (
    <View style={[styles.map, styles.mapFallback]}>
      <Building2 size={64} color={MedicalColors.medical} />
      <Text style={styles.mapFallbackTitle}>Carte des établissements de santé</Text>
      <Text style={styles.mapFallbackText}>
        {location
          ? `Position: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
          : "Localisation en cours..."}
      </Text>
      <Text style={styles.mapFallbackSubtext}>
        {hospitals.length} établissement(s) à proximité
      </Text>
    </View>
  );
}

function NativeMapComponent({
  location,
  hospitals,
  onMarkerPress,
}: {
  location: Location.LocationObject | null;
  hospitals: Hospital[];
  onMarkerPress: (h: Hospital) => void;
}) {
  const MapView = require("react-native-maps").default;
  const { Marker, Circle } = require("react-native-maps");

  const initialRegion = useMemo(() => {
    if (location) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 6.137,
      longitude: 1.212,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [location]);

  return (
    <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
      {location && (
        <Circle
          center={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          radius={1000}
          strokeColor={MedicalColors.urgency}
          fillColor="rgba(220, 53, 69, 0.1)"
        />
      )}
      {hospitals.map((hospital) => (
        <Marker
          key={hospital.id}
          coordinate={{
            latitude: hospital.latitude,
            longitude: hospital.longitude,
          }}
          pinColor={getMarkerColorHelper(hospital.type)}
          title={hospital.name}
          onPress={() => onMarkerPress(hospital)}
        />
      ))}
    </MapView>
  );
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"all" | "hospital" | "pharmacy" | "rescue">("all");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [filters, setFilters] = useState({
    maternity: false,
    emergency24h: false,
    onDuty: false,
  });

  useEffect(() => {
    void requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      if (Platform.OS === "web") {
        setLoading(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission de localisation refusée");
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
    } catch (err) {
      console.error("Erreur de localisation:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHospitals = useMemo(() => {
    return MOCK_HOSPITALS.filter((h) => {
      if (selectedType !== "all" && h.type !== selectedType) return false;
      if (filters.maternity && !h.hasMaternity) return false;
      if (filters.emergency24h && !h.is24h) return false;
      if (filters.onDuty && h.type === "pharmacy" && !h.isOnDuty) return false;
      return true;
    });
  }, [filters, selectedType]);

  const handleCall = useCallback(async (phone?: string) => {
    if (!phone) return;
    const url = `tel:${phone.replace(/\s/g, "")}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MedicalColors.urgency} />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Surface style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <Chip
            selected={selectedType === "all"}
            onPress={() => setSelectedType("all")}
            style={[styles.filterChip, selectedType === "all" && styles.filterChipActive]}
            textStyle={selectedType === "all" ? styles.filterChipTextActive : undefined}
          >
            Tout
          </Chip>
          <Chip
            selected={selectedType === "hospital"}
            onPress={() => setSelectedType("hospital")}
            style={[styles.filterChip, selectedType === "hospital" && styles.filterChipActive]}
            textStyle={selectedType === "hospital" ? styles.filterChipTextActive : undefined}
          >
            Hôpitaux
          </Chip>
          <Chip
            selected={selectedType === "pharmacy"}
            onPress={() => setSelectedType("pharmacy")}
            style={[styles.filterChip, selectedType === "pharmacy" && styles.filterChipActive]}
            textStyle={selectedType === "pharmacy" ? styles.filterChipTextActive : undefined}
          >
            Pharmacies
          </Chip>
          <Chip
            selected={selectedType === "rescue"}
            onPress={() => setSelectedType("rescue")}
            style={[styles.filterChip, selectedType === "rescue" && styles.filterChipActive]}
            textStyle={selectedType === "rescue" ? styles.filterChipTextActive : undefined}
          >
            Secouristes
          </Chip>
        </ScrollView>

        <View style={styles.secondaryFilters}>
          <TouchableOpacity
            style={[styles.secondaryFilter, filters.maternity && styles.secondaryFilterActive]}
            onPress={() => setFilters((f) => ({ ...f, maternity: !f.maternity }))}
          >
            <Text style={[styles.secondaryFilterText, filters.maternity && styles.secondaryFilterTextActive]}>
              Maternité
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryFilter, filters.emergency24h && styles.secondaryFilterActive]}
            onPress={() => setFilters((f) => ({ ...f, emergency24h: !f.emergency24h }))}
          >
            <Clock size={14} color={filters.emergency24h ? MedicalColors.white : MedicalColors.textSecondary} />
            <Text style={[styles.secondaryFilterText, filters.emergency24h && styles.secondaryFilterTextActive]}>
              24h/24
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryFilter, filters.onDuty && styles.secondaryFilterActive]}
            onPress={() => setFilters((f) => ({ ...f, onDuty: !f.onDuty }))}
          >
            <Text style={[styles.secondaryFilterText, filters.onDuty && styles.secondaryFilterTextActive]}>
              De garde
            </Text>
          </TouchableOpacity>
        </View>
      </Surface>

      {Platform.OS === "web" ? (
        <WebMapFallback location={location} hospitals={filteredHospitals} />
      ) : (
        <NativeMapComponent
          location={location}
          hospitals={filteredHospitals}
          onMarkerPress={setSelectedHospital}
        />
      )}

      {selectedHospital && (
        <Surface style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedName}>{selectedHospital.name}</Text>
            <TouchableOpacity onPress={() => setSelectedHospital(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.selectedType}>
            {selectedHospital.type === "hospital" ? "Hôpital" : selectedHospital.type === "pharmacy" ? "Pharmacie" : "Secours"}
          </Text>
          {selectedHospital.address && <Text style={styles.selectedAddress}>{selectedHospital.address}</Text>}
          {selectedHospital.phone && (
            <TouchableOpacity style={styles.callButton} onPress={() => handleCall(selectedHospital.phone)}>
              <Phone size={16} color={MedicalColors.white} />
              <Text style={styles.callButtonText}>{selectedHospital.phone}</Text>
            </TouchableOpacity>
          )}
        </Surface>
      )}

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsText}>{filteredHospitals.length} établissement(s) trouvé(s)</Text>
        {filteredHospitals.map((hospital) => (
          <TouchableOpacity key={hospital.id} style={styles.hospitalCard} onPress={() => handleCall(hospital.phone)}>
            <View style={[styles.hospitalIcon, { backgroundColor: getMarkerColorHelper(hospital.type) }]}>
              {hospital.type === "hospital" ? (
                <Building2 size={20} color={MedicalColors.white} />
              ) : hospital.type === "pharmacy" ? (
                <Cross size={20} color={MedicalColors.white} />
              ) : (
                <Stethoscope size={20} color={MedicalColors.white} />
              )}
            </View>
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>{hospital.name}</Text>
              <Text style={styles.hospitalAddress}>{hospital.address}</Text>
              <View style={styles.hospitalBadges}>
                {hospital.is24h && (
                  <View style={styles.hospitalBadge}>
                    <Clock size={12} color={MedicalColors.life} />
                    <Text style={styles.hospitalBadgeText}>24h/24</Text>
                  </View>
                )}
                {hospital.hasMaternity && (
                  <View style={styles.hospitalBadge}>
                    <Text style={styles.hospitalBadgeTextMaternity}>Maternité</Text>
                  </View>
                )}
                {hospital.isOnDuty && (
                  <View style={styles.hospitalBadge}>
                    <Text style={styles.hospitalBadgeTextDuty}>De garde</Text>
                  </View>
                )}
              </View>
            </View>
            {hospital.distance != null && (
              <View style={styles.distanceContainer}>
                <Text style={styles.distanceText}>{hospital.distance} km</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: MedicalColors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: MedicalColors.textSecondary,
  },
  filtersContainer: {
    paddingVertical: 12,
    backgroundColor: MedicalColors.white,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: MedicalColors.background,
  },
  filterChipActive: {
    backgroundColor: MedicalColors.urgency,
  },
  filterChipTextActive: {
    color: MedicalColors.white,
  },
  secondaryFilters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  secondaryFilter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: MedicalColors.background,
    gap: 4,
  },
  secondaryFilterActive: {
    backgroundColor: MedicalColors.medical,
  },
  secondaryFilterText: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
  },
  secondaryFilterTextActive: {
    color: MedicalColors.white,
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: MedicalColors.medicalLight,
  },
  mapFallbackTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: MedicalColors.text,
    marginTop: 16,
  },
  mapFallbackText: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginTop: 8,
  },
  mapFallbackSubtext: {
    fontSize: 16,
    color: MedicalColors.medical,
    marginTop: 8,
    fontWeight: "600" as const,
  },
  selectedCard: {
    position: "absolute",
    top: 140,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: MedicalColors.white,
    shadowColor: MedicalColors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  selectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedName: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: MedicalColors.text,
    flex: 1,
  },
  closeButton: {
    fontSize: 20,
    color: MedicalColors.textSecondary,
    padding: 4,
  },
  selectedType: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  selectedAddress: {
    fontSize: 14,
    color: MedicalColors.text,
    marginTop: 8,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MedicalColors.urgency,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    alignSelf: "flex-start",
  },
  callButtonText: {
    color: MedicalColors.white,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  listContainer: {
    maxHeight: 200,
    backgroundColor: MedicalColors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
    marginBottom: 8,
  },
  hospitalCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
  },
  hospitalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  hospitalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  hospitalAddress: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  hospitalBadges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  hospitalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  hospitalBadgeText: {
    fontSize: 11,
    color: MedicalColors.life,
  },
  hospitalBadgeTextMaternity: {
    fontSize: 11,
    color: MedicalColors.maternity,
  },
  hospitalBadgeTextDuty: {
    fontSize: 11,
    color: MedicalColors.urgency,
  },
  distanceContainer: {
    alignItems: "flex-end",
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.medical,
  },
});
