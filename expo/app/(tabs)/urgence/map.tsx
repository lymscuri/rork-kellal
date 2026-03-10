import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Chip, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MedicalColors } from "@/constants/colors";
import { Building2, Clock, Cross, MapPin, Navigation, Phone, Stethoscope } from "lucide-react-native";

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

function getTypeLabel(type: Hospital["type"]) {
  switch (type) {
    case "hospital": return "Hôpital";
    case "pharmacy": return "Pharmacie";
    case "rescue": return "Secours";
  }
}

function getTypeColor(type: Hospital["type"]) {
  switch (type) {
    case "hospital": return MedicalColors.urgency;
    case "pharmacy": return MedicalColors.life;
    case "rescue": return MedicalColors.maternity;
  }
}

function getTypeIcon(type: Hospital["type"]) {
  switch (type) {
    case "hospital": return Building2;
    case "pharmacy": return Cross;
    case "rescue": return Stethoscope;
  }
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"all" | "hospital" | "pharmacy" | "rescue">("all");
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
    }).sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));
  }, [filters, selectedType]);

  const handleCall = useCallback(async (phone?: string) => {
    if (!phone) return;
    const url = `tel:${phone.replace(/\s/g, "")}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  }, []);

  const handleOpenMaps = useCallback((hospital: Hospital) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${hospital.latitude},${hospital.longitude}(${encodeURIComponent(hospital.name)})`,
      android: `geo:${hospital.latitude},${hospital.longitude}?q=${hospital.latitude},${hospital.longitude}(${encodeURIComponent(hospital.name)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`,
    });
    void Linking.openURL(url);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MedicalColors.urgency} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Surface style={styles.headerSection}>
        <View style={styles.locationRow}>
          <MapPin size={18} color={MedicalColors.medical} />
          <Text style={styles.locationText}>
            {location
              ? `Position: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
              : "Position non disponible"}
          </Text>
        </View>
      </Surface>

      <Surface style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <Chip
            selected={selectedType === "all"}
            onPress={() => setSelectedType("all")}
            style={[styles.filterChip, selectedType === "all" && styles.filterChipActive]}
            textStyle={selectedType === "all" ? styles.filterChipTextActive : undefined}
          >
            Tout ({MOCK_HOSPITALS.length})
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

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>{filteredHospitals.length} établissement(s) trouvé(s)</Text>
      </View>

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredHospitals.map((hospital) => {
          const IconComponent = getTypeIcon(hospital.type);
          const typeColor = getTypeColor(hospital.type);

          return (
            <Surface key={hospital.id} style={styles.hospitalCard}>
              <View style={styles.hospitalCardContent}>
                <View style={[styles.hospitalIcon, { backgroundColor: typeColor }]}>
                  <IconComponent size={22} color={MedicalColors.white} />
                </View>

                <View style={styles.hospitalInfo}>
                  <Text style={styles.hospitalName}>{hospital.name}</Text>
                  <Text style={styles.hospitalType}>{getTypeLabel(hospital.type)}</Text>
                  {hospital.address && (
                    <Text style={styles.hospitalAddress}>{hospital.address}</Text>
                  )}

                  <View style={styles.hospitalBadges}>
                    {hospital.is24h && (
                      <View style={[styles.badge, styles.badge24h]}>
                        <Clock size={10} color={MedicalColors.life} />
                        <Text style={styles.badge24hText}>24h/24</Text>
                      </View>
                    )}
                    {hospital.hasMaternity && (
                      <View style={[styles.badge, styles.badgeMaternity]}>
                        <Text style={styles.badgeMaternityText}>Maternité</Text>
                      </View>
                    )}
                    {hospital.isOnDuty && (
                      <View style={[styles.badge, styles.badgeDuty]}>
                        <Text style={styles.badgeDutyText}>De garde</Text>
                      </View>
                    )}
                  </View>
                </View>

                {hospital.distance != null && (
                  <View style={styles.distanceContainer}>
                    <Text style={styles.distanceValue}>{hospital.distance}</Text>
                    <Text style={styles.distanceUnit}>km</Text>
                  </View>
                )}
              </View>

              <View style={styles.hospitalActions}>
                {hospital.phone && (
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(hospital.phone)}>
                    <Phone size={16} color={MedicalColors.white} />
                    <Text style={styles.actionButtonText}>Appeler</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionButtonNav} onPress={() => handleOpenMaps(hospital)}>
                  <Navigation size={16} color={MedicalColors.medical} />
                  <Text style={styles.actionButtonNavText}>Itinéraire</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          );
        })}

        {filteredHospitals.length === 0 && (
          <View style={styles.emptyContainer}>
            <MapPin size={48} color={MedicalColors.textSecondary} />
            <Text style={styles.emptyText}>Aucun établissement trouvé</Text>
            <Text style={styles.emptySubtext}>Essayez de modifier vos filtres</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
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
  headerSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MedicalColors.white,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    fontSize: 13,
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
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  hospitalCard: {
    backgroundColor: MedicalColors.white,
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  hospitalCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
  },
  hospitalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  hospitalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  hospitalType: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  hospitalAddress: {
    fontSize: 13,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  hospitalBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  badge24h: {
    backgroundColor: MedicalColors.lifeLight,
  },
  badge24hText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: MedicalColors.life,
  },
  badgeMaternity: {
    backgroundColor: MedicalColors.maternityLight,
  },
  badgeMaternityText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: MedicalColors.maternity,
  },
  badgeDuty: {
    backgroundColor: MedicalColors.urgencyLight,
  },
  badgeDutyText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: MedicalColors.urgency,
  },
  distanceContainer: {
    alignItems: "center",
    marginLeft: 8,
    paddingTop: 2,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: MedicalColors.medical,
  },
  distanceUnit: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
  },
  hospitalActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: MedicalColors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: MedicalColors.urgency,
    gap: 6,
  },
  actionButtonText: {
    color: MedicalColors.white,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  actionButtonNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: MedicalColors.medicalLight,
    gap: 6,
  },
  actionButtonNavText: {
    color: MedicalColors.medical,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: MedicalColors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginTop: 4,
  },
  bottomSpacer: {
    height: 24,
  },
});
