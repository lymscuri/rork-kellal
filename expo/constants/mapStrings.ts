// Libellés de l'INTERFACE de la carte des secours, bilingues fr/en.
// Aucun texte en dur dans l'écran : tout passe par ce dictionnaire, indexé par
// UI_LANG (constants/i18n.ts). Les noms de lieux viennent de l'API, tels quels.
import type { UiLang } from '@/constants/i18n';
import type { PlaceKind, PlacesSource } from '@/types/places';

export interface MapStrings {
  all: string;
  kind: Record<PlaceKind, string>;
  emergency24h: string;
  hoursUnknown: string; // is_24h === null
  open24h: string; // is_24h === true
  closedNight: string; // is_24h === false
  emergencyUnknown: string; // has_emergency === null
  hasEmergency: string;
  maternity: string;
  call: string;
  itinerary: string;
  recenter: string;
  mapView: string;
  listView: string;
  results: (n: number) => string;
  youAreHere: string;
  accuracy: (m: number) => string; // précision affichée
  positionApproximate: string;
  positionUnknown: string; // pas de vraie position : centré sur la Guinée
  permissionDenied: string;
  openSettings: string;
  servicesDisabled: string;
  locating: string;
  searching: string;
  offlineNotice: (date: string) => string; // « hors ligne, données du <date> »
  sourceLabel: (source: PlacesSource, date: string) => string; // traçabilité du lot
  empty: string;
  loadError: string;
  retry: string;
}

function dateFr(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
}
function dateEn(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB');
}

export const MAP_STRINGS: Record<UiLang, MapStrings> = {
  fr: {
    all: 'Tout',
    kind: {
      hospital: 'Hôpital',
      clinic: 'Clinique',
      pharmacy: 'Pharmacie',
      health_center: 'Centre de santé',
    },
    emergency24h: 'Urgences 24h',
    hoursUnknown: 'Horaires inconnus',
    open24h: '24h/24',
    closedNight: 'Fermé la nuit',
    emergencyUnknown: 'Urgences : inconnu',
    hasEmergency: 'Service d’urgence',
    maternity: 'Maternité',
    call: 'Appeler',
    itinerary: 'Itinéraire',
    recenter: 'Me recentrer',
    mapView: 'Carte',
    listView: 'Liste',
    results: (n) => `${n} établissement${n > 1 ? 's' : ''}`,
    youAreHere: 'Vous êtes ici',
    accuracy: (m) => `Précision ± ${m} m`,
    positionApproximate: 'Position approximative',
    positionUnknown: 'Position inconnue — carte centrée sur la Guinée',
    permissionDenied: 'Localisation refusée. Autorisez-la pour voir les secours proches.',
    openSettings: 'Ouvrir les réglages',
    servicesDisabled: 'Services de localisation désactivés sur l’appareil.',
    locating: 'Localisation en cours…',
    searching: 'Recherche des établissements…',
    offlineNotice: (date) => `Hors ligne, données du ${dateFr(date)}`,
    sourceLabel: (source, date) =>
      source === 'referential_only'
        ? `Référentiel Kendeya, ${dateFr(date)}`
        : `OpenStreetMap, mis à jour le ${dateFr(date)}`,
    empty: 'Aucun établissement dans ce rayon.',
    loadError: 'Impossible de charger les lieux. Vérifiez votre connexion.',
    retry: 'Réessayer',
  },
  en: {
    all: 'All',
    kind: {
      hospital: 'Hospital',
      clinic: 'Clinic',
      pharmacy: 'Pharmacy',
      health_center: 'Health centre',
    },
    emergency24h: '24h emergency',
    hoursUnknown: 'Hours unknown',
    open24h: '24/7',
    closedNight: 'Closed at night',
    emergencyUnknown: 'Emergency: unknown',
    hasEmergency: 'Emergency service',
    maternity: 'Maternity',
    call: 'Call',
    itinerary: 'Directions',
    recenter: 'Recenter',
    mapView: 'Map',
    listView: 'List',
    results: (n) => `${n} place${n > 1 ? 's' : ''}`,
    youAreHere: 'You are here',
    accuracy: (m) => `Accuracy ± ${m} m`,
    positionApproximate: 'Approximate position',
    positionUnknown: 'Position unknown — map centred on Guinea',
    permissionDenied: 'Location denied. Allow it to see nearby emergency places.',
    openSettings: 'Open settings',
    servicesDisabled: 'Location services are turned off on the device.',
    locating: 'Locating…',
    searching: 'Searching for places…',
    offlineNotice: (date) => `Offline, data from ${dateEn(date)}`,
    sourceLabel: (source, date) =>
      source === 'referential_only'
        ? `Kendeya directory, ${dateEn(date)}`
        : `OpenStreetMap, updated ${dateEn(date)}`,
    empty: 'No places within this radius.',
    loadError: 'Could not load places. Check your connection.',
    retry: 'Retry',
  },
};
