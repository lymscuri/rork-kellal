import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Chip, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MedicalColors } from "@/constants/colors";
import { Building2, Clock, Cross, MapPin, Navigation, Phone, RefreshCw, Stethoscope } from "lucide-react-native";

interface OSMPlace {
  id: string;
  name: string;
  type: "hospital" | "pharmacy" | "clinic";
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  is24h?: boolean;
  hasMaternity?: boolean;
  distance?: number;
  openingHours?: string;
}

const DEFAULT_LAT = 6.1319;
const DEFAULT_LON = 1.2228;
const SEARCH_RADIUS = 5000;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function buildOverpassQuery(lat: number, lon: number, radius: number): string {
  const query = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});
  relation["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="pharmacy"](around:${radius},${lat},${lon});
  way["amenity"="pharmacy"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  way["amenity"="clinic"](around:${radius},${lat},${lon});
);
out center body;
`;
  return query.trim();
}

function parseOSMResults(data: any, userLat: number, userLon: number): OSMPlace[] {
  if (!data?.elements) return [];

  const places: OSMPlace[] = [];

  for (const el of data.elements) {
    const tags = el.tags || {};
    const name = tags.name || tags["name:fr"];
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const amenity = tags.amenity as string;
    let type: OSMPlace["type"] = "hospital";
    if (amenity === "pharmacy") type = "pharmacy";
    else if (amenity === "clinic") type = "clinic";

    const addressParts: string[] = [];
    if (tags["addr:street"]) {
      if (tags["addr:housenumber"]) addressParts.push(tags["addr:housenumber"]);
      addressParts.push(tags["addr:street"]);
    }
    if (tags["addr:city"]) addressParts.push(tags["addr:city"]);
    const address = addressParts.length > 0 ? addressParts.join(", ") : tags["addr:full"] || undefined;

    const phone = tags.phone || tags["contact:phone"] || undefined;
    const openingHours = tags.opening_hours || undefined;
    const is24h = openingHours === "24/7" || tags.emergency === "yes";
    const hasMaternity = !!tags.healthcare && (tags.healthcare.includes("maternity") || tags.healthcare.includes("birthing"));

    const distance = haversineDistance(userLat, userLon, lat, lon);

    places.push({
      id: `${el.type}-${el.id}`,
      name,
      type,
      latitude: lat,
      longitude: lon,
      address,
      phone,
      is24h,
      hasMaternity,
      distance,
      openingHours,
    });
  }

  places.sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));
  return places;
}

function getTypeLabel(type: OSMPlace["type"]) {
  switch (type) {
    case "hospital": return "Hôpital";
    case "pharmacy": return "Pharmacie";
    case "clinic": return "Clinique";
  }
}

function getTypeColor(type: OSMPlace["type"]) {
  switch (type) {
    case "hospital": return MedicalColors.urgency;
    case "pharmacy": return MedicalColors.life;
    case "clinic": return MedicalColors.medical;
  }
}

function getTypeIcon(type: OSMPlace["type"]) {
  switch (type) {
    case "hospital": return Building2;
    case "pharmacy": return Cross;
    case "clinic": return Stethoscope;
  }
}

export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [places, setPlaces] = useState<OSMPlace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"all" | "hospital" | "pharmacy" | "clinic">("all");
  const [filters, setFilters] = useState({
    emergency24h: false,
  });

  const requestLocation = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        if ("geolocation" in navigator) {
          return new Promise<{ latitude: number; longitude: number }>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              () => resolve({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON }),
              { timeout: 10000 }
            );
          });
        }
        return { latitude: DEFAULT_LAT, longitude: DEFAULT_LON };
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission de localisation refusée, utilisation position par défaut");
        return { latitude: DEFAULT_LAT, longitude: DEFAULT_LON };
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
    } catch (err) {
      console.error("Erreur de localisation:", err);
      return { latitude: DEFAULT_LAT, longitude: DEFAULT_LON };
    }
  }, []);

  const fetchNearbyPlaces = useCallback(async (lat: number, lon: number) => {
    setFetching(true);
    setError(null);
    console.log(`Recherche OpenStreetMap autour de ${lat}, ${lon}...`);

    try {
      const query = buildOverpassQuery(lat, lon, SEARCH_RADIUS);
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      console.log(`OpenStreetMap: ${data.elements?.length ?? 0} résultats trouvés`);

      const parsed = parseOSMResults(data, lat, lon);
      setPlaces(parsed);

      if (parsed.length === 0) {
        setError("Aucun établissement trouvé dans un rayon de 5km. Essayez de rafraîchir.");
      }
    } catch (err) {
      console.error("Erreur Overpass API:", err);
      setError("Impossible de charger les données. Vérifiez votre connexion internet.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const loc = await requestLocation();
      if (cancelled) return;
      setLocation(loc);
      setLoading(false);
      void fetchNearbyPlaces(loc.latitude, loc.longitude);
    })();

    return () => { cancelled = true; };
  }, [requestLocation, fetchNearbyPlaces]);

  const handleRefresh = useCallback(async () => {
    if (!location) return;
    void fetchNearbyPlaces(location.latitude, location.longitude);
  }, [location, fetchNearbyPlaces]);

  const filteredPlaces = useMemo(() => {
    return places.filter((h) => {
      if (selectedType !== "all" && h.type !== selectedType) return false;
      if (filters.emergency24h && !h.is24h) return false;
      return true;
    });
  }, [places, filters, selectedType]);

  const handleCall = useCallback(async (phone?: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/\s/g, "");
    const url = `tel:${cleaned}`;
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

  const handleOpenMaps = useCallback((place: OSMPlace) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${place.latitude},${place.longitude}(${encodeURIComponent(place.name)})`,
      android: `geo:${place.latitude},${place.longitude}?q=${place.latitude},${place.longitude}(${encodeURIComponent(place.name)})`,
      default: `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=17/${place.latitude}/${place.longitude}`,
    });
    void Linking.openURL(url);
  }, []);

  const typeCounts = useMemo(() => {
    const counts = { all: places.length, hospital: 0, pharmacy: 0, clinic: 0 };
    for (const p of places) {
      counts[p.type]++;
    }
    return counts;
  }, [places]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MedicalColors.urgency} />
        <Text style={styles.loadingText}>Localisation en cours...</Text>
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
              ? `Position: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
              : "Position par défaut (Lomé)"}
          </Text>
        </View>
        <Text style={styles.sourceText}>Source: OpenStreetMap</Text>
      </Surface>

      <Surface style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <Chip
            selected={selectedType === "all"}
            onPress={() => setSelectedType("all")}
            style={[styles.filterChip, selectedType === "all" && styles.filterChipActive]}
            textStyle={selectedType === "all" ? styles.filterChipTextActive : undefined}
          >
            Tout ({typeCounts.all})
          </Chip>
          <Chip
            selected={selectedType === "hospital"}
            onPress={() => setSelectedType("hospital")}
            style={[styles.filterChip, selectedType === "hospital" && styles.filterChipActive]}
            textStyle={selectedType === "hospital" ? styles.filterChipTextActive : undefined}
          >
            Hôpitaux ({typeCounts.hospital})
          </Chip>
          <Chip
            selected={selectedType === "pharmacy"}
            onPress={() => setSelectedType("pharmacy")}
            style={[styles.filterChip, selectedType === "pharmacy" && styles.filterChipActive]}
            textStyle={selectedType === "pharmacy" ? styles.filterChipTextActive : undefined}
          >
            Pharmacies ({typeCounts.pharmacy})
          </Chip>
          <Chip
            selected={selectedType === "clinic"}
            onPress={() => setSelectedType("clinic")}
            style={[styles.filterChip, selectedType === "clinic" && styles.filterChipActive]}
            textStyle={selectedType === "clinic" ? styles.filterChipTextActive : undefined}
          >
            Cliniques ({typeCounts.clinic})
          </Chip>
        </ScrollView>

        <View style={styles.secondaryFilters}>
          <TouchableOpacity
            style={[styles.secondaryFilter, filters.emergency24h && styles.secondaryFilterActive]}
            onPress={() => setFilters((f) => ({ ...f, emergency24h: !f.emergency24h }))}
          >
            <Clock size={14} color={filters.emergency24h ? MedicalColors.white : MedicalColors.textSecondary} />
            <Text style={[styles.secondaryFilterText, filters.emergency24h && styles.secondaryFilterTextActive]}>
              Urgences 24h/24
            </Text>
          </TouchableOpacity>
        </View>
      </Surface>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>{filteredPlaces.length} établissement(s) trouvé(s)</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={fetching}>
          {fetching ? (
            <ActivityIndicator size="small" color={MedicalColors.medical} />
          ) : (
            <RefreshCw size={18} color={MedicalColors.medical} />
          )}
        </TouchableOpacity>
      </View>

      {fetching && places.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MedicalColors.medical} />
          <Text style={styles.loadingText}>Recherche des établissements...</Text>
          <Text style={styles.loadingSubtext}>Données OpenStreetMap</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={fetching} onRefresh={handleRefresh} colors={[MedicalColors.medical]} />
          }
        >
          {error && (
            <Surface style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleRefresh}>
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </Surface>
          )}

          {filteredPlaces.map((place) => {
            const IconComponent = getTypeIcon(place.type);
            const typeColor = getTypeColor(place.type);

            return (
              <Surface key={place.id} style={styles.hospitalCard}>
                <View style={styles.hospitalCardContent}>
                  <View style={[styles.hospitalIcon, { backgroundColor: typeColor }]}>
                    <IconComponent size={22} color={MedicalColors.white} />
                  </View>

                  <View style={styles.hospitalInfo}>
                    <Text style={styles.hospitalName} numberOfLines={2}>{place.name}</Text>
                    <Text style={styles.hospitalType}>{getTypeLabel(place.type)}</Text>
                    {place.address && (
                      <Text style={styles.hospitalAddress} numberOfLines={2}>{place.address}</Text>
                    )}
                    {place.openingHours && (
                      <Text style={styles.openingHours} numberOfLines={1}>{place.openingHours}</Text>
                    )}

                    <View style={styles.hospitalBadges}>
                      {place.is24h && (
                        <View style={[styles.badge, styles.badge24h]}>
                          <Clock size={10} color={MedicalColors.life} />
                          <Text style={styles.badge24hText}>24h/24</Text>
                        </View>
                      )}
                      {place.hasMaternity && (
                        <View style={[styles.badge, styles.badgeMaternity]}>
                          <Text style={styles.badgeMaternityText}>Maternité</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {place.distance != null && (
                    <View style={styles.distanceContainer}>
                      <Text style={styles.distanceValue}>{place.distance}</Text>
                      <Text style={styles.distanceUnit}>km</Text>
                    </View>
                  )}
                </View>

                <View style={styles.hospitalActions}>
                  {place.phone && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(place.phone)}>
                      <Phone size={16} color={MedicalColors.white} />
                      <Text style={styles.actionButtonText}>Appeler</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButtonNav, !place.phone && styles.actionButtonNavFull]}
                    onPress={() => handleOpenMaps(place)}
                  >
                    <Navigation size={16} color={MedicalColors.medical} />
                    <Text style={styles.actionButtonNavText}>Itinéraire</Text>
                  </TouchableOpacity>
                </View>
              </Surface>
            );
          })}

          {filteredPlaces.length === 0 && !fetching && !error && (
            <View style={styles.emptyContainer}>
              <MapPin size={48} color={MedicalColors.textSecondary} />
              <Text style={styles.emptyText}>Aucun établissement trouvé</Text>
              <Text style={styles.emptySubtext}>Essayez de modifier vos filtres</Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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
  loadingSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: MedicalColors.textSecondary,
    opacity: 0.7,
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
    flex: 1,
  },
  sourceText: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    opacity: 0.6,
    marginTop: 4,
    marginLeft: 26,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: MedicalColors.textSecondary,
  },
  refreshButton: {
    padding: 6,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: MedicalColors.urgencyLight,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: MedicalColors.urgencyDark,
    flex: 1,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: MedicalColors.urgency,
    marginLeft: 12,
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
  openingHours: {
    fontSize: 11,
    color: MedicalColors.medical,
    marginTop: 3,
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
  actionButtonNavFull: {
    flex: 2,
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
