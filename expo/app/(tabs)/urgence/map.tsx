import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Chip, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { MedicalColors } from "@/constants/colors";
import { Building2, Clock, Cross, List, Map as MapIcon, MapPin, Navigation, Phone, RefreshCw, Stethoscope } from "lucide-react-native";

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

const DEFAULT_LAT = 9.5370;
const DEFAULT_LON = -13.6785;
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

function generateLeafletHTML(userLat: number, userLon: number, places: OSMPlace[]): string {
  const placesJSON = JSON.stringify(places);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
    #loader {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background: rgba(0, 0, 0, 0.7);
      padding: 20px;
      border-radius: 10px;
      color: white;
      font-family: Arial, sans-serif;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="loader">Chargement de la carte...</div>
  <div id="map"></div>
  <script>
    // Initialiser la carte avec performances améliorées
    const map = L.map('map', {
      preferCanvas: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      tap: false
    }).setView([${userLat}, ${userLon}], 13);

    // Couche de tuiles principale avec fallback
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      crossOrigin: true,
      keepBuffer: 4,
      updateWhenIdle: false,
      updateWhenZooming: false
    }).addTo(map);

    // Gestion des erreurs de tuiles avec fallback
    tileLayer.on('tileerror', function(e) {
      e.tile.src = 'https://tile.openstreetmap.fr/osmfr/'
        + e.coords.z + '/' + e.coords.x + '/' + e.coords.y + '.png';
    });

    // Marqueur utilisateur
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: '<div style="background: #0D6EFD; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    L.marker([${userLat}, ${userLon}], { icon: userIcon })
      .addTo(map)
      .bindPopup('Vous êtes ici');

    // Marqueurs des établissements
    const places = ${placesJSON};

    function getMarkerColor(type) {
      switch(type) {
        case 'hospital': return '#DC3545';
        case 'pharmacy': return '#4CAF50';
        case 'clinic': return '#0D6EFD';
        default: return '#6C757D';
      }
    }

    function getTypeLabel(type) {
      switch(type) {
        case 'hospital': return 'Hôpital';
        case 'pharmacy': return 'Pharmacie';
        case 'clinic': return 'Clinique';
        default: return '';
      }
    }

    places.forEach(place => {
      const color = getMarkerColor(place.type);
      const icon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: ' + color + '; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const popupContent =
        '<strong>' + place.name + '</strong><br>' +
        getTypeLabel(place.type) +
        (place.distance ? ' • ' + place.distance + ' km' : '') +
        (place.address ? '<br><small>' + place.address + '</small>' : '') +
        (place.is24h ? '<br><small style="color: #4CAF50;">24h/24</small>' : '');

      L.marker([place.latitude, place.longitude], { icon: icon })
        .addTo(map)
        .bindPopup(popupContent)
        .on('click', function() {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'markerClick',
            place: place
          }));
        });
    });

    // Cacher le loader après le chargement de la carte
    map.on('load', function() {
      const loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';

      // Précharger les tuiles autour de la position
      map.flyTo([${userLat}, ${userLon}], 14, { duration: 1 });
    });

    // Cacher le loader après 3 secondes même si pas complètement chargé
    setTimeout(function() {
      const loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';
    }, 3000);

    // Écouter les messages de React Native
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'focusPlace' && data.place) {
          map.setView([data.place.latitude, data.place.longitude], 16);
        }
      } catch(e) {
        console.error('Error parsing message:', e);
      }
    });
  </script>
</body>
</html>
  `;
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

    const phoneVal = tags.phone || tags["contact:phone"] || undefined;
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
      phone: phoneVal,
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
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedPlace, setSelectedPlace] = useState<OSMPlace | null>(null);
  const [filters, setFilters] = useState({ emergency24h: false });
  const mapRef = useRef<any>(null);

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

      try {
        const Location = await import("expo-location");
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
      } catch (locErr) {
        console.error("Erreur expo-location:", locErr);
        return { latitude: DEFAULT_LAT, longitude: DEFAULT_LON };
      }
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

  const handleMarkerPress = useCallback((place: OSMPlace) => {
    setSelectedPlace(place);
  }, []);

  const handleFocusPlace = useCallback((place: OSMPlace) => {
    setSelectedPlace(place);
    setViewMode("map");
    // Envoyer un message à la WebView pour centrer sur le lieu
    mapRef.current?.postMessage(JSON.stringify({
      type: 'focusPlace',
      place: { latitude: place.latitude, longitude: place.longitude }
    }));
  }, []);

  const typeCounts = useMemo(() => {
    const counts = { all: places.length, hospital: 0, pharmacy: 0, clinic: 0 };
    for (const p of places) {
      counts[p.type]++;
    }
    return counts;
  }, [places]);

  const leafletHTML = useMemo(() => {
    if (!location) return '';
    return generateLeafletHTML(location.latitude, location.longitude, filteredPlaces);
  }, [location, filteredPlaces]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick' && data.place) {
        setSelectedPlace(data.place);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  }, []);

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
              Urgences 24h
            </Text>
          </TouchableOpacity>

          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === "map" && styles.viewToggleBtnActive]}
              onPress={() => setViewMode("map")}
            >
              <MapIcon size={14} color={viewMode === "map" ? MedicalColors.white : MedicalColors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
              onPress={() => setViewMode("list")}
            >
              <List size={14} color={viewMode === "list" ? MedicalColors.white : MedicalColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={fetching}>
            {fetching ? (
              <ActivityIndicator size="small" color={MedicalColors.medical} />
            ) : (
              <RefreshCw size={16} color={MedicalColors.medical} />
            )}
          </TouchableOpacity>
        </View>
      </Surface>

      {fetching && places.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MedicalColors.medical} />
          <Text style={styles.loadingText}>Recherche des établissements...</Text>
          <Text style={styles.loadingSubtext}>Données OpenStreetMap</Text>
        </View>
      ) : viewMode === "map" ? (
        <View style={styles.mapContainer}>
          {location && leafletHTML ? (
            <WebView
              ref={mapRef}
              style={styles.map}
              originWhitelist={['*']}
              source={{ html: leafletHTML }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          ) : (
            <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: MedicalColors.background }]}>
              <MapPin color={MedicalColors.medical} size={40} />
              <Text style={{ marginTop: 12, color: MedicalColors.textSecondary }}>Carte en chargement...</Text>
            </View>
          )}

          {error && (
            <View style={styles.mapErrorBanner}>
              <Text style={styles.mapErrorText}>{error}</Text>
              <TouchableOpacity onPress={handleRefresh}>
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedPlace && (
            <View style={styles.placeCard}>
              <TouchableOpacity style={styles.placeCardClose} onPress={() => setSelectedPlace(null)}>
                <Text style={styles.placeCardCloseText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.placeCardContent}>
                <View style={[styles.placeCardIcon, { backgroundColor: getTypeColor(selectedPlace.type) }]}>
                  {(() => { const Icon = getTypeIcon(selectedPlace.type); return <Icon size={20} color={MedicalColors.white} />; })()}
                </View>
                <View style={styles.placeCardInfo}>
                  <Text style={styles.placeCardName} numberOfLines={1}>{selectedPlace.name}</Text>
                  <Text style={styles.placeCardType}>
                    {getTypeLabel(selectedPlace.type)}{selectedPlace.distance != null ? ` • ${selectedPlace.distance} km` : ""}
                  </Text>
                  {selectedPlace.address && <Text style={styles.placeCardAddress} numberOfLines={1}>{selectedPlace.address}</Text>}
                  <View style={styles.placeCardBadges}>
                    {selectedPlace.is24h && (
                      <View style={styles.badge24h}>
                        <Text style={styles.badge24hText}>24h/24</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.placeCardActions}>
                {selectedPlace.phone && (
                  <TouchableOpacity style={styles.actionBtnCall} onPress={() => handleCall(selectedPlace.phone)}>
                    <Phone size={14} color={MedicalColors.white} />
                    <Text style={styles.actionBtnCallText}>Appeler</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtnNav} onPress={() => handleOpenMaps(selectedPlace)}>
                  <Navigation size={14} color={MedicalColors.medical} />
                  <Text style={styles.actionBtnNavText}>Itinéraire</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.mapResultsBadge}>
            <Text style={styles.mapResultsText}>{filteredPlaces.length} établissement(s)</Text>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
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
              <TouchableOpacity key={place.id} onPress={() => handleFocusPlace(place)} activeOpacity={0.7}>
                <Surface style={styles.hospitalCard}>
                  <View style={styles.hospitalCardContent}>
                    <View style={[styles.hospitalIcon, { backgroundColor: typeColor }]}>
                      <IconComponent size={22} color={MedicalColors.white} />
                    </View>

                    <View style={styles.hospitalInfo}>
                      <Text style={styles.hospitalName} numberOfLines={2}>{place.name}</Text>
                      <Text style={styles.hospitalType}>{getTypeLabel(place.type)}</Text>
                      {place.address && <Text style={styles.hospitalAddress} numberOfLines={1}>{place.address}</Text>}
                      <View style={styles.hospitalBadges}>
                        {place.is24h && (
                          <View style={[styles.badge, styles.badgeGreen]}>
                            <Clock size={10} color={MedicalColors.life} />
                            <Text style={styles.badgeGreenText}>24h/24</Text>
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
                      <TouchableOpacity style={styles.hospitalActionCall} onPress={() => handleCall(place.phone)}>
                        <Phone size={14} color={MedicalColors.white} />
                        <Text style={styles.hospitalActionCallText}>Appeler</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.hospitalActionNav, !place.phone && styles.hospitalActionNavFull]}
                      onPress={() => handleOpenMaps(place)}
                    >
                      <Navigation size={14} color={MedicalColors.medical} />
                      <Text style={styles.hospitalActionNavText}>Itinéraire</Text>
                    </TouchableOpacity>
                  </View>
                </Surface>
              </TouchableOpacity>
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
  filtersContainer: {
    paddingVertical: 10,
    backgroundColor: MedicalColors.white,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
  },
  filtersScroll: {
    paddingHorizontal: 12,
    gap: 6,
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
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  secondaryFilter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
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
  viewToggle: {
    flexDirection: "row",
    backgroundColor: MedicalColors.background,
    borderRadius: 16,
    overflow: "hidden",
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: MedicalColors.medical,
  },
  refreshBtn: {
    marginLeft: "auto",
    padding: 6,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapErrorBanner: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: MedicalColors.urgencyLight,
    borderRadius: 10,
  },
  mapErrorText: {
    fontSize: 12,
    color: MedicalColors.urgencyDark,
    flex: 1,
  },
  mapResultsBadge: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: MedicalColors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mapResultsText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  placeCard: {
    position: "absolute",
    bottom: 20,
    left: 12,
    right: 12,
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  placeCardClose: {
    position: "absolute",
    top: 8,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  placeCardCloseText: {
    fontSize: 16,
    color: MedicalColors.textSecondary,
    fontWeight: "600" as const,
  },
  placeCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  placeCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  placeCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  placeCardName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: MedicalColors.text,
    paddingRight: 20,
  },
  placeCardType: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 1,
  },
  placeCardAddress: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  placeCardBadges: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  badge24h: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MedicalColors.lifeLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  badge24hText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: MedicalColors.life,
  },
  placeCardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionBtnCall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    backgroundColor: MedicalColors.urgency,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnCallText: {
    color: MedicalColors.white,
    fontWeight: "600" as const,
    fontSize: 13,
  },
  actionBtnNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    backgroundColor: MedicalColors.medicalLight,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnNavText: {
    color: MedicalColors.medical,
    fontWeight: "600" as const,
    fontSize: 13,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
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
    marginBottom: 10,
    overflow: "hidden",
  },
  hospitalCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
  },
  hospitalIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  hospitalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: MedicalColors.text,
  },
  hospitalType: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 1,
  },
  hospitalAddress: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 3,
  },
  hospitalBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  badgeGreen: {
    backgroundColor: MedicalColors.lifeLight,
  },
  badgeGreenText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: MedicalColors.life,
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
  hospitalActionCall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    backgroundColor: MedicalColors.urgency,
    gap: 6,
  },
  hospitalActionCallText: {
    color: MedicalColors.white,
    fontWeight: "600" as const,
    fontSize: 13,
  },
  hospitalActionNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    backgroundColor: MedicalColors.medicalLight,
    gap: 6,
  },
  hospitalActionNavFull: {
    flex: 2,
  },
  hospitalActionNavText: {
    color: MedicalColors.medical,
    fontWeight: "600" as const,
    fontSize: 13,
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
