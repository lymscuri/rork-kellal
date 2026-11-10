// Chargement de Leaflet EMBARQUÉ (assets/leaflet/*.txt) et génération du HTML
// de la WebView. Leaflet est inliné dans la page : la carte s'initialise même
// hors ligne (seules les tuiles OSM manquent alors). Les tuiles restent les
// tuiles OSM standard avec attribution.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { Place, PlaceKind } from '@/types/places';

// require() des assets vendored : seul require() renvoie l'id de module d'asset
// que Metro/expo-asset savent résoudre ; un import ESM ne le ferait pas.
/* eslint-disable @typescript-eslint/no-require-imports */
const LEAFLET_JS = require('@/assets/leaflet/leaflet.js.txt') as number;
const LEAFLET_CSS = require('@/assets/leaflet/leaflet.css.txt') as number;
/* eslint-enable @typescript-eslint/no-require-imports */

interface LeafletSource {
  js: string;
  css: string;
}
let cached: LeafletSource | null = null;

async function readAsset(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  if (!asset.localUri) await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return await new File(uri).text();
}

// Lit et mémorise le code Leaflet embarqué (une seule fois par session).
export async function loadLeaflet(): Promise<LeafletSource> {
  if (cached) return cached;
  const [js, css] = await Promise.all([readAsset(LEAFLET_JS), readAsset(LEAFLET_CSS)]);
  cached = { js, css };
  return cached;
}

const KIND_COLOR: Record<PlaceKind, string> = {
  hospital: '#DC3545',
  clinic: '#0D6EFD',
  pharmacy: '#4CAF50',
  health_center: '#6F42C1',
};

export interface LeafletView {
  center: { lat: number; lon: number };
  accuracy: number | null; // rayon du cercle d'incertitude (m), null = pas de cercle
  known: boolean; // false = position inconnue (pas de marqueur « vous »)
  places: Place[];
  youAreHere: string;
}

// Construit la page. `src` = Leaflet inliné ; aucune dépendance réseau pour le
// moteur de carte (tuiles exceptées). Escape minimal : les données viennent de
// notre backend et sont injectées en JSON.stringify (sûr dans <script>).
export function buildMapHTML(src: LeafletSource, view: LeafletView): string {
  const placesJSON = JSON.stringify(view.places).replace(/</g, '\\u003c');
  const colorsJSON = JSON.stringify(KIND_COLOR);
  const youAreHere = JSON.stringify(view.youAreHere);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>${src.css}</style>
<style>
  html,body{margin:0;padding:0;height:100%;}
  #map{width:100vw;height:100vh;background:#e9ecef;}
  .uloc{background:#0D6EFD;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);}
  .pin{width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3);}
</style>
</head>
<body>
<div id="map"></div>
<script>${src.js}</script>
<script>
(function(){
  var center=[${view.center.lat},${view.center.lon}];
  var known=${view.known ? 'true' : 'false'};
  var accuracy=${view.accuracy === null ? 'null' : view.accuracy};
  var COLORS=${colorsJSON};
  var places=${placesJSON};
  var map=L.map('map',{preferCanvas:true,tap:false,zoomControl:true}).setView(center,14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© OpenStreetMap',maxZoom:19,subdomains:['a','b','c'],crossOrigin:true
  }).addTo(map);

  if(known){
    L.marker(center,{icon:L.divIcon({className:'',html:'<div class="uloc"></div>',iconSize:[22,22],iconAnchor:[11,11]})})
      .addTo(map).bindPopup(${youAreHere});
    if(accuracy!==null && accuracy>0){
      L.circle(center,{radius:accuracy,color:'#0D6EFD',weight:1,fillColor:'#0D6EFD',fillOpacity:.12}).addTo(map);
    }
  }

  places.forEach(function(p){
    var color=COLORS[p.kind]||'#6C757D';
    var icon=L.divIcon({className:'',html:'<div class="pin" style="background:'+color+'"></div>',iconSize:[18,18],iconAnchor:[9,9]});
    var m=L.marker([p.lat,p.lon],{icon:icon}).addTo(map);
    m.bindPopup('<strong>'+(p.name||'')+'</strong><br><small>'+Math.round(p.distance_m)+' m</small>');
    m.on('click',function(){
      if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick',id:p.id}));}
    });
  });

  window.addEventListener('message',function(ev){
    try{
      var d=JSON.parse(ev.data);
      if(d.type==='focus'){map.setView([d.lat,d.lon],16);}
      if(d.type==='recenter'){map.setView(center, Math.max(map.getZoom(),15));}
    }catch(e){}
  });
  document.addEventListener('message',function(ev){
    try{var d=JSON.parse(ev.data);if(d.type==='focus'){map.setView([d.lat,d.lon],16);}if(d.type==='recenter'){map.setView(center,Math.max(map.getZoom(),15));}}catch(e){}
  });
})();
</script>
</body>
</html>`;
}
