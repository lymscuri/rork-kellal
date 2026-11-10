import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Chip, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import {
  Building2, Clock, Cross, Crosshair, HelpCircle, List, Map as MapIcon,
  MapPin, Navigation, Phone, RefreshCw, Settings, Stethoscope, TriangleAlert,
} from "lucide-react-native";
import { MedicalColors } from "@/constants/colors";
import { UI_LANG } from "@/constants/i18n";
import { MAP_STRINGS } from "@/constants/mapStrings";
import { usePreciseLocation } from "@/hooks/usePreciseLocation";
import { usePlacesStore } from "@/store/placesStore";
import { effectivePosition, needsRefetch } from "@/store/firstaid/geo";
import { buildMapHTML, loadLeaflet, type LeafletView } from "@/components/map/leaflet";
import type { Place, PlaceKind, PlacesData } from "@/types/places";

const S = MAP_STRINGS[UI_LANG];

type Filter = "all" | PlaceKind;

function kindColor(kind: PlaceKind): string {
  switch (kind) {
    case "hospital": return MedicalColors.urgency;
    case "pharmacy": return MedicalColors.life;
    case "clinic": return MedicalColors.medical;
    case "health_center": return "#6F42C1";
  }
}

function KindIcon({ kind, size, color }: { kind: PlaceKind; size: number; color: string }) {
  if (kind === "pharmacy") return <Cross size={size} color={color} />;
  if (kind === "clinic") return <Stethoscope size={size} color={color} />;
  if (kind === "health_center") return <MapPin size={size} color={color} />;
  return <Building2 size={size} color={color} />;
}

// Rendu tri-état des horaires : null -> « horaires inconnus », jamais « fermé ».
function HoursBadge({ is24h }: { is24h: boolean | null }) {
  if (is24h === true) {
    return (
      <View style={[styles.badge, styles.badgeGreen]}>
        <Clock size={10} color={MedicalColors.life} />
        <Text style={styles.badgeGreenText}>{S.open24h}</Text>
      </View>
    );
  }
  const label = is24h === false ? S.closedNight : S.hoursUnknown;
  return (
    <View style={[styles.badge, styles.badgeNeutral]}>
      <Clock size={10} color={MedicalColors.textSecondary} />
      <Text style={styles.badgeNeutralText}>{label}</Text>
    </View>
  );
}

export default function MapScreen() {
  const { status, fix, refresh: refreshLocation, openSettings } = usePreciseLocation();
  const { getCached, fetchPlaces, isOffline } = usePlacesStore();

  const [data, setData] = useState<PlacesData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<Filter>("all");
  const [only24h, setOnly24h] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapRef = useRef<WebView>(null);

  // Position effective : vrai fix, sinon dernier connu (cache), sinon Guinée.
  const lastKnownFromCache = useRef<{ latitude: number; longitude: number; accuracy: number | null; timestamp: number; approximate: boolean } | null>(null);
  const pos = useMemo(
    () => effectivePosition(fix, lastKnownFromCache.current),
    [fix],
  );

  // Charge Leaflet embarqué une fois.
  useEffect(() => {
    let alive = true;
    void loadLeaflet().then(() => { if (alive) setLeafletReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Sert le cache immédiatement pour la cellule courante (sans attendre le réseau).
  useEffect(() => {
    if (!pos.known) return;
    const cached = getCached(pos.lat, pos.lon);
    if (cached && !data) {
      setData(cached.data);
      setFetchedAt(cached.fetchedAt);
      lastKnownFromCache.current = {
        latitude: cached.data.center.lat, longitude: cached.data.center.lon,
        accuracy: null, timestamp: cached.fetchedAt, approximate: true,
      };
    }
  }, [pos.known, pos.lat, pos.lon, getCached, data]);

  const runFetch = useCallback(async (lat: number, lon: number) => {
    setFetching(true);
    setError(null);
    const fresh = await fetchPlaces(lat, lon);
    if (fresh) {
      setData(fresh);
      setFetchedAt(Date.now());
    } else if (!data) {
      setError(S.loadError);
    }
    setFetching(false);
  }, [fetchPlaces, data]);

  // Rafraîchit quand on s'éloigne de plus de 500 m du centre du dernier lot.
  useEffect(() => {
    if (!pos.known) return;
    const center = data ? { lat: data.center.lat, lon: data.center.lon } : null;
    if (needsRefetch(center, { lat: pos.lat, lon: pos.lon })) {
      void runFetch(pos.lat, pos.lon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.known, pos.lat, pos.lon]);

  const handleManualRefresh = useCallback(() => {
    if (pos.known) void runFetch(pos.lat, pos.lon);
  }, [pos, runFetch]);

  const places = useMemo(() => data?.places ?? [], [data]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: places.length, hospital: 0, clinic: 0, pharmacy: 0, health_center: 0 };
    for (const p of places) c[p.kind]++;
    return c;
  }, [places]);

  const filtered = useMemo(
    () => places.filter((p) => {
      if (selectedType !== "all" && p.kind !== selectedType) return false;
      if (only24h && p.is_24h !== true) return false;
      return true;
    }),
    [places, selectedType, only24h],
  );

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const html = useMemo(() => {
    if (!leafletReady) return "";
    const view: LeafletView = {
      center: { lat: pos.lat, lon: pos.lon },
      accuracy: pos.accuracy,
      known: pos.known,
      places: filtered,
      youAreHere: S.youAreHere,
    };
    try {
      return buildMapHTMLSync(view);
    } catch {
      return "";
    }
  }, [leafletReady, pos.lat, pos.lon, pos.accuracy, pos.known, filtered]);

  const onWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
      if (msg.type === "markerClick" && msg.id) setSelectedId(msg.id);
    } catch { /* ignore */ }
  }, []);

  const handleCall = useCallback(async (phone: string | null) => {
    if (!phone) return;
    const url = `tel:${phone.replace(/\s/g, "")}`;
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else Alert.alert(S.call, phone);
    } catch { /* ignore */ }
  }, []);

  const handleItinerary = useCallback((p: Place) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${p.lat},${p.lon}(${encodeURIComponent(p.name)})`,
      android: `geo:${p.lat},${p.lon}?q=${p.lat},${p.lon}(${encodeURIComponent(p.name)})`,
      default: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`,
    });
    void Linking.openURL(url);
  }, []);

  const focusOnMap = useCallback((p: Place) => {
    setSelectedId(p.id);
    setViewMode("map");
    mapRef.current?.postMessage(JSON.stringify({ type: "focus", lat: p.lat, lon: p.lon }));
  }, []);

  const recenter = useCallback(() => {
    mapRef.current?.postMessage(JSON.stringify({ type: "recenter" }));
  }, []);

  // --- États de localisation bloquants (bandeaux clairs, pas de repli silencieux) ---
  const locationBanner = useMemo(() => {
    if (status === "denied") return { text: S.permissionDenied, action: openSettings, actionLabel: S.openSettings };
    if (status === "disabled") return { text: S.servicesDisabled, action: openSettings, actionLabel: S.openSettings };
    if (!pos.known) return { text: S.positionUnknown, action: refreshLocation, actionLabel: S.retry };
    if (pos.approximate) return { text: S.positionApproximate, action: null, actionLabel: null };
    return null;
  }, [status, pos.known, pos.approximate, openSettings, refreshLocation]);

  // Écran de localisation initiale (avant toute position et sans cache).
  if (status === "idle" || (status === "unknown" && !pos.known && !data)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MedicalColors.urgency} />
        <Text style={styles.loadingText}>{S.locating}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Surface style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {(["all", "hospital", "clinic", "pharmacy", "health_center"] as Filter[]).map((f) => (
            <Chip
              key={f}
              selected={selectedType === f}
              onPress={() => setSelectedType(f)}
              style={[styles.filterChip, selectedType === f && styles.filterChipActive]}
              textStyle={selectedType === f ? styles.filterChipTextActive : undefined}
            >
              {(f === "all" ? S.all : S.kind[f])} ({counts[f]})
            </Chip>
          ))}
        </ScrollView>

        <View style={styles.secondaryFilters}>
          <TouchableOpacity
            style={[styles.secondaryFilter, only24h && styles.secondaryFilterActive]}
            onPress={() => setOnly24h((v) => !v)}
          >
            <Clock size={14} color={only24h ? MedicalColors.white : MedicalColors.textSecondary} />
            <Text style={[styles.secondaryFilterText, only24h && styles.secondaryFilterTextActive]}>
              {S.emergency24h}
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

          <TouchableOpacity style={styles.refreshBtn} onPress={handleManualRefresh} disabled={fetching}>
            {fetching ? (
              <ActivityIndicator size="small" color={MedicalColors.medical} />
            ) : (
              <RefreshCw size={16} color={MedicalColors.medical} />
            )}
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Bandeau d'état de localisation : clair et honnête. */}
      {locationBanner && (
        <Surface style={styles.locBanner}>
          <TriangleAlert size={16} color={MedicalColors.urgencyDark} />
          <Text style={styles.locBannerText}>{locationBanner.text}</Text>
          {locationBanner.action && (
            <TouchableOpacity style={styles.locBannerBtn} onPress={locationBanner.action}>
              {locationBanner.actionLabel === S.openSettings && <Settings size={13} color={MedicalColors.white} />}
              <Text style={styles.locBannerBtnText}>{locationBanner.actionLabel}</Text>
            </TouchableOpacity>
          )}
        </Surface>
      )}

      {/* Précision + traçabilité du lot. */}
      {(pos.accuracy !== null || data) && (
        <View style={styles.metaRow}>
          {pos.accuracy !== null && (
            <Text style={styles.metaText}>{S.accuracy(Math.round(pos.accuracy))}</Text>
          )}
          {data && fetchedAt && (
            <Text style={styles.metaSource}>
              {isOffline ? S.offlineNotice(new Date(fetchedAt).toISOString()) : S.sourceLabel(data.source, data.generated_at)}
            </Text>
          )}
        </View>
      )}

      {fetching && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MedicalColors.medical} />
          <Text style={styles.loadingText}>{S.searching}</Text>
        </View>
      ) : viewMode === "map" ? (
        <View style={styles.mapContainer}>
          {html ? (
            <WebView
              ref={mapRef}
              style={styles.map}
              originWhitelist={["*"]}
              source={{ html }}
              onMessage={onWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
            />
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <MapPin color={MedicalColors.medical} size={40} />
              <Text style={styles.loadingSubtext}>{S.locating}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
            <Crosshair size={20} color={MedicalColors.medical} />
          </TouchableOpacity>

          {error && (
            <View style={styles.mapErrorBanner}>
              <Text style={styles.mapErrorText}>{error}</Text>
              <TouchableOpacity onPress={handleManualRefresh}>
                <Text style={styles.retryText}>{S.retry}</Text>
              </TouchableOpacity>
            </View>
          )}

          {selected && (
            <View style={styles.placeCard}>
              <TouchableOpacity style={styles.placeCardClose} onPress={() => setSelectedId(null)}>
                <Text style={styles.placeCardCloseText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.placeCardContent}>
                <View style={[styles.placeCardIcon, { backgroundColor: kindColor(selected.kind) }]}>
                  <KindIcon kind={selected.kind} size={20} color={MedicalColors.white} />
                </View>
                <View style={styles.placeCardInfo}>
                  <Text style={styles.placeCardName} numberOfLines={1}>{selected.name}</Text>
                  <Text style={styles.placeCardType}>
                    {S.kind[selected.kind]} • {selected.distance_m} m
                  </Text>
                  {selected.address && <Text style={styles.placeCardAddress} numberOfLines={1}>{selected.address}</Text>}
                  <View style={styles.placeCardBadges}>
                    <HoursBadge is24h={selected.is_24h} />
                    {selected.has_maternity === true && (
                      <View style={[styles.badge, styles.badgeNeutral]}>
                        <Text style={styles.badgeNeutralText}>{S.maternity}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.placeCardActions}>
                {selected.phone && (
                  <TouchableOpacity style={styles.actionBtnCall} onPress={() => handleCall(selected.phone)}>
                    <Phone size={14} color={MedicalColors.white} />
                    <Text style={styles.actionBtnCallText}>{S.call}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtnNav} onPress={() => handleItinerary(selected)}>
                  <Navigation size={14} color={MedicalColors.medical} />
                  <Text style={styles.actionBtnNavText}>{S.itinerary}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.mapResultsBadge}>
            <Text style={styles.mapResultsText}>{S.results(filtered.length)}</Text>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {error && (
            <Surface style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleManualRefresh}>
                <Text style={styles.retryText}>{S.retry}</Text>
              </TouchableOpacity>
            </Surface>
          )}

          {filtered.length === 0 && !fetching && (
            <View style={styles.emptyBox}>
              <HelpCircle size={28} color={MedicalColors.textSecondary} />
              <Text style={styles.emptyText}>{S.empty}</Text>
            </View>
          )}

          {filtered.map((place) => (
            <TouchableOpacity key={place.id} onPress={() => focusOnMap(place)} activeOpacity={0.7}>
              <Surface style={styles.hospitalCard}>
                <View style={styles.hospitalCardContent}>
                  <View style={[styles.hospitalIcon, { backgroundColor: kindColor(place.kind) }]}>
                    <KindIcon kind={place.kind} size={22} color={MedicalColors.white} />
                  </View>
                  <View style={styles.hospitalInfo}>
                    <Text style={styles.hospitalName} numberOfLines={2}>{place.name}</Text>
                    <Text style={styles.hospitalType}>{S.kind[place.kind]} • {place.distance_m} m</Text>
                    {place.address && <Text style={styles.hospitalAddress} numberOfLines={1}>{place.address}</Text>}
                    <View style={styles.hospitalBadges}>
                      <HoursBadge is24h={place.is_24h} />
                      {place.has_emergency === true && (
                        <View style={[styles.badge, styles.badgeRed]}>
                          <Text style={styles.badgeRedText}>{S.hasEmergency}</Text>
                        </View>
                      )}
                      {place.has_maternity === true && (
                        <View style={[styles.badge, styles.badgeNeutral]}>
                          <Text style={styles.badgeNeutralText}>{S.maternity}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.hospitalActions}>
                  {place.phone && (
                    <TouchableOpacity style={styles.actionBtnCall} onPress={() => handleCall(place.phone)}>
                      <Phone size={14} color={MedicalColors.white} />
                      <Text style={styles.actionBtnCallText}>{S.call}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtnNav} onPress={() => handleItinerary(place)}>
                    <Navigation size={14} color={MedicalColors.medical} />
                    <Text style={styles.actionBtnNavText}>{S.itinerary}</Text>
                  </TouchableOpacity>
                </View>
              </Surface>
            </TouchableOpacity>
          ))}

          {data && fetchedAt && (
            <Text style={styles.listSource}>
              {isOffline ? S.offlineNotice(new Date(fetchedAt).toISOString()) : S.sourceLabel(data.source, data.generated_at)}
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// buildMapHTML a besoin du source Leaflet déjà chargé : on le mémorise au module
// après loadLeaflet(). Wrapper synchrone pour useMemo.
let leafletSrc: { js: string; css: string } | null = null;
void loadLeaflet().then((s) => { leafletSrc = s; });
function buildMapHTMLSync(view: LeafletView): string {
  if (!leafletSrc) throw new Error("leaflet not loaded");
  return buildMapHTML(leafletSrc, view);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: MedicalColors.background, padding: 24 },
  loadingText: { marginTop: 14, fontSize: 15, color: MedicalColors.textSecondary },
  loadingSubtext: { marginTop: 8, fontSize: 13, color: MedicalColors.textSecondary },

  filtersContainer: { paddingTop: 8, paddingBottom: 6, backgroundColor: MedicalColors.white, elevation: 2 },
  filtersScroll: { paddingHorizontal: 12, gap: 8 },
  filterChip: { marginRight: 6, backgroundColor: MedicalColors.background },
  filterChipActive: { backgroundColor: MedicalColors.medicalLight },
  filterChipTextActive: { color: MedicalColors.medicalDark, fontWeight: "600" },
  secondaryFilters: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  secondaryFilter: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: MedicalColors.background },
  secondaryFilterActive: { backgroundColor: MedicalColors.urgency },
  secondaryFilterText: { fontSize: 12, color: MedicalColors.textSecondary },
  secondaryFilterTextActive: { color: MedicalColors.white, fontWeight: "600" },
  viewToggle: { flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: MedicalColors.border, marginLeft: "auto" },
  viewToggleBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  viewToggleBtnActive: { backgroundColor: MedicalColors.medical },
  refreshBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: MedicalColors.border },

  locBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: MedicalColors.urgencyLight },
  locBannerText: { flex: 1, fontSize: 12.5, color: MedicalColors.urgencyDark },
  locBannerBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: MedicalColors.urgency, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  locBannerBtnText: { color: MedicalColors.white, fontSize: 12, fontWeight: "600" },

  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 4, backgroundColor: MedicalColors.white },
  metaText: { fontSize: 11, color: MedicalColors.textSecondary },
  metaSource: { fontSize: 10.5, color: MedicalColors.textSecondary, fontStyle: "italic" },

  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapPlaceholder: { justifyContent: "center", alignItems: "center", backgroundColor: MedicalColors.background },
  recenterBtn: { position: "absolute", right: 14, bottom: 150, backgroundColor: MedicalColors.white, padding: 10, borderRadius: 24, elevation: 4, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },

  mapErrorBanner: { position: "absolute", top: 10, left: 12, right: 12, backgroundColor: MedicalColors.urgencyLight, padding: 10, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mapErrorText: { flex: 1, fontSize: 12, color: MedicalColors.urgencyDark },
  retryText: { fontSize: 12, fontWeight: "700", color: MedicalColors.urgency, marginLeft: 8 },

  mapResultsBadge: { position: "absolute", top: 10, left: 12, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  mapResultsText: { color: MedicalColors.white, fontSize: 12, fontWeight: "600" },

  placeCard: { position: "absolute", left: 12, right: 12, bottom: 16, backgroundColor: MedicalColors.white, borderRadius: 12, padding: 12, elevation: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  placeCardClose: { position: "absolute", top: 8, right: 10, zIndex: 2, padding: 4 },
  placeCardCloseText: { fontSize: 16, color: MedicalColors.textSecondary },
  placeCardContent: { flexDirection: "row", gap: 12 },
  placeCardIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  placeCardInfo: { flex: 1, paddingRight: 20 },
  placeCardName: { fontSize: 15, fontWeight: "700", color: MedicalColors.text },
  placeCardType: { fontSize: 12.5, color: MedicalColors.textSecondary, marginTop: 2 },
  placeCardAddress: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  placeCardBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  placeCardActions: { flexDirection: "row", gap: 8, marginTop: 12 },

  listContainer: { flex: 1, paddingHorizontal: 12, paddingTop: 10 },
  errorBanner: { padding: 12, borderRadius: 8, backgroundColor: MedicalColors.urgencyLight, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  errorText: { flex: 1, fontSize: 12.5, color: MedicalColors.urgencyDark },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: MedicalColors.textSecondary },

  hospitalCard: { borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: MedicalColors.white, elevation: 1 },
  hospitalCardContent: { flexDirection: "row", gap: 12 },
  hospitalIcon: { width: 46, height: 46, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  hospitalInfo: { flex: 1 },
  hospitalName: { fontSize: 15, fontWeight: "700", color: MedicalColors.text },
  hospitalType: { fontSize: 12.5, color: MedicalColors.textSecondary, marginTop: 2 },
  hospitalAddress: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  hospitalBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  hospitalActions: { flexDirection: "row", gap: 8, marginTop: 10 },

  badge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeGreen: { backgroundColor: MedicalColors.lifeLight },
  badgeGreenText: { fontSize: 10.5, color: MedicalColors.lifeDark, fontWeight: "600" },
  badgeRed: { backgroundColor: MedicalColors.urgencyLight },
  badgeRedText: { fontSize: 10.5, color: MedicalColors.urgencyDark, fontWeight: "600" },
  badgeNeutral: { backgroundColor: MedicalColors.background },
  badgeNeutralText: { fontSize: 10.5, color: MedicalColors.textSecondary, fontWeight: "600" },

  actionBtnCall: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: MedicalColors.life, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnCallText: { color: MedicalColors.white, fontSize: 13, fontWeight: "600" },
  actionBtnNav: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: MedicalColors.medicalLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnNavText: { color: MedicalColors.medicalDark, fontSize: 13, fontWeight: "600" },

  listSource: { fontSize: 10.5, color: MedicalColors.textSecondary, fontStyle: "italic", textAlign: "center", paddingVertical: 14 },
});
