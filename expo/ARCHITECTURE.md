# Kendeya - Architecture Complète du Projet

> Application mobile de santé connectée pour la Guinée, construite avec React Native / Expo.
> Dernière mise à jour : 2026-03-13

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Stack technique](#2-stack-technique)
3. [Structure des fichiers](#3-structure-des-fichiers)
4. [Navigation & Routing](#4-navigation--routing)
5. [Modules fonctionnels](#5-modules-fonctionnels)
6. [Gestion d'état](#6-gestion-détat)
7. [Types & Modèles de données](#7-types--modèles-de-données)
8. [Authentification](#8-authentification)
9. [Thème & Design System](#9-thème--design-system)
10. [Reproduire le projet en local](#10-reproduire-le-projet-en-local)

---

## 1. Présentation générale

**Kendeya** est une application mobile de santé connectée destinée au contexte guinéen. Elle couvre trois grands domaines :

- **Urgence** : gestion des urgences médicales, localisation des hôpitaux/pharmacies, réseau de secouristes, chat IA d'assistance
- **Maternité** : suivi de grossesse, consultations prénatales, suivi pédiatrique (enfants), système SMS de rappel
- **Dossier médical** : dossier patient complet, consultations, ordonnances, résultats de labo, vaccins, QR code médical

L'application supporte deux rôles : **médecin** et **patient**, avec des vues et fonctionnalités adaptées à chaque rôle.

---

## 2. Stack technique

| Technologie | Version | Usage |
|---|---|---|
| **Expo SDK** | 54 | Framework React Native |
| **React Native** | 0.81.x | UI mobile cross-platform |
| **React** | 19.1 | Bibliothèque UI |
| **TypeScript** | 5.9 | Typage statique |
| **Expo Router** | 6.x | Routing file-based |
| **Zustand** | 5.x | Gestion d'état globale |
| **React Query** | 5.x | Gestion d'état serveur |
| **React Native Paper** | 5.x | Composants Material Design |
| **Lucide React Native** | 0.577 | Icônes |
| **React Native Maps** | 1.20 | Cartes interactives |
| **React Native QRCode SVG** | 6.x | Génération QR codes |
| **AsyncStorage** | 2.2 | Persistance locale |
| **Expo Camera** | 17.x | Scanner QR |
| **Expo Location** | 19.x | Géolocalisation |
| **Expo Notifications** | 0.32 | Notifications |
| **Expo Haptics** | 15.x | Retour haptique |
| **Axios** | 1.x | Requêtes HTTP |
| **Bun** | - | Package manager |

---

## 3. Structure des fichiers

```
expo/
├── app/                          # Pages (Expo Router file-based routing)
│   ├── _layout.tsx               # Layout racine (providers, AuthGuard)
│   ├── index.tsx                 # Redirection initiale
│   ├── modal.tsx                 # Modal générique
│   ├── +not-found.tsx            # Page 404
│   │
│   ├── auth/                     # Module authentification
│   │   ├── _layout.tsx           # Layout auth (Stack sans header)
│   │   ├── login.tsx             # Écran de connexion
│   │   └── signup.tsx            # Écran d'inscription
│   │
│   └── (tabs)/                   # Navigation par onglets
│       ├── _layout.tsx           # Configuration des 3 tabs
│       │
│       ├── urgence/              # Tab 1 : Urgence (rouge)
│       │   ├── _layout.tsx       # Stack interne urgence
│       │   ├── index.tsx         # Accueil urgence (carte, hôpitaux, alertes)
│       │   ├── chat.tsx          # Assistant IA urgence (modal)
│       │   ├── map.tsx           # Carte des secours complète
│       │   └── secourist-network.tsx  # Réseau de secouristes
│       │
│       ├── maternite/            # Tab 2 : Maternité (violet)
│       │   ├── _layout.tsx       # Stack interne maternité
│       │   ├── index.tsx         # Accueil maternité (vue patient/soignant)
│       │   ├── weekly-checkup.tsx     # Suivi hebdomadaire grossesse
│       │   ├── prenatal-calendar.tsx  # Calendrier consultations prénatales
│       │   ├── child-tracking.tsx     # Suivi pédiatrique (croissance, vaccins PEV)
│       │   ├── patient-dossier.tsx    # Dossier prénatal détaillé
│       │   ├── soignant-dashboard.tsx # Tableau de bord soignant
│       │   ├── sms-system.tsx         # Système SMS de rappel multilingue
│       │   └── add-maternity-patient.tsx # Ajout patiente maternité
│       │
│       └── dossier/              # Tab 3 : Dossier médical (bleu)
│           ├── _layout.tsx       # Stack interne dossier
│           ├── index.tsx         # Accueil dossier (vue patient/médecin)
│           ├── patient-record.tsx     # Dossier patient complet (antécédents, etc.)
│           ├── new-consultation.tsx   # Nouvelle consultation médicale
│           ├── add-patient.tsx        # Ajout nouveau patient
│           ├── my-qrcode.tsx          # QR code du dossier médical
│           ├── prescriptions.tsx      # Liste des ordonnances
│           ├── scanner.tsx            # Scanner QR code
│           ├── doctor-reports.tsx     # Rapports médecin
│           ├── new-lab-result.tsx     # Nouveau résultat de labo
│           └── new-vaccine.tsx        # Nouveau vaccin
│
├── constants/
│   ├── colors.ts                 # Palette de couleurs médicales
│   └── theme.ts                  # Thème React Native Paper
│
├── store/
│   ├── authStore.ts              # Store authentification (Zustand)
│   ├── medicalStore.ts           # Store données médicales (Zustand + persist)
│   └── storage.ts                # Couche abstraction AsyncStorage
│
├── types/
│   └── medical.ts                # Tous les types/interfaces TypeScript
│
├── assets/
│   └── images/                   # Icônes et images de l'app
│
├── app.json                      # Configuration Expo
├── package.json                  # Dépendances
├── tsconfig.json                 # Configuration TypeScript
├── babel.config.js               # Configuration Babel
└── metro.config.js               # Configuration Metro bundler
```

---

## 4. Navigation & Routing

### Architecture de navigation

```
RootLayout (_layout.tsx)
├── QueryClientProvider (React Query)
│   └── PaperProvider (React Native Paper theme)
│       └── GestureHandlerRootView
│           └── AuthGuard (redirection auth)
│               └── Stack Navigator
│                   ├── index → Redirect (vers login ou tabs)
│                   ├── auth/ → Stack (login, signup)
│                   ├── (tabs)/ → Tab Navigator
│                   │   ├── urgence/ → Stack interne
│                   │   ├── maternite/ → Stack interne
│                   │   └── dossier/ → Stack interne
│                   └── modal → Modal
```

### AuthGuard

Le composant `AuthGuard` dans `_layout.tsx` :
- Hydrate l'état d'authentification depuis AsyncStorage au démarrage
- Redirige vers `/auth/login` si non authentifié
- Redirige vers `/(tabs)/urgence` si déjà authentifié
- Affiche un loader pendant l'hydratation

### Onglets (Tabs)

| Tab | Nom | Couleur | Icône |
|-----|-----|---------|-------|
| 1 | Urgence | Rouge `#DC3545` | AlertCircle |
| 2 | Maternité | Violet `#9B59B6` | Baby |
| 3 | Mon Dossier | Bleu `#0D6EFD` | FileText |

Chaque tab a son propre Stack Navigator interne avec header personnalisé.

---

## 5. Modules fonctionnels

### 5.1 Module Urgence

| Écran | Fichier | Description |
|-------|---------|-------------|
| Accueil urgence | `urgence/index.tsx` | Carte MapView avec hôpitaux proches, numéros d'urgence (SAMU 442, Croix-Rouge 3013, Pompiers 18), bouton d'alerte |
| Assistant IA | `urgence/chat.tsx` | Chat avec assistant IA médical (modal) |
| Carte des secours | `urgence/map.tsx` | Carte complète avec hôpitaux, pharmacies, points de secours, filtres par type |
| Réseau secouristes | `urgence/secourist-network.tsx` | Voir les secouristes disponibles, envoyer/recevoir des alertes d'urgence avec géolocalisation |

**Fonctionnalités clés :**
- Appel direct aux numéros d'urgence guinéens
- Géolocalisation en temps réel
- Niveaux d'urgence : critique, grave, modéré
- Statut des alertes : active, prise en charge, résolue

### 5.2 Module Maternité

| Écran | Fichier | Description |
|-------|---------|-------------|
| Accueil maternité | `maternite/index.tsx` | Vue adaptée au rôle (patient : suivi grossesse / soignant : liste patientes) |
| Suivi hebdomadaire | `maternite/weekly-checkup.tsx` | Saisie poids, tension, symptômes, mouvements fœtaux, humeur |
| Calendrier prénatal | `maternite/prenatal-calendar.tsx` | 8 consultations prénatales standards (semaines 8, 12, 20, 28, 32, 36, 38, 40) |
| Suivi pédiatrique | `maternite/child-tracking.tsx` | Courbe de croissance enfant, vaccins PEV (Programme Élargi de Vaccination) |
| Dossier prénatal | `maternite/patient-dossier.tsx` | Dossier complet de la grossesse avec examens prénataux |
| Dashboard soignant | `maternite/soignant-dashboard.tsx` | Tableau de bord pour sage-femme/médecin avec statistiques |
| Système SMS | `maternite/sms-system.tsx` | Rappels multilingues (français, pular, malinké, soussou) par SMS ou vocal |
| Ajout patiente | `maternite/add-maternity-patient.tsx` | Formulaire d'inscription patiente maternité |

**Fonctionnalités clés :**
- Système d'alerte tricolore (vert/jaune/rouge) basé sur les constantes
- Vaccins PEV Guinée (BCG, Pentavalent, Pneumocoque, Fièvre jaune, etc.)
- Suivi hebdomadaire validé visible côté médecin
- SMS multilingues en 4 langues nationales

### 5.3 Module Dossier Médical

| Écran | Fichier | Description |
|-------|---------|-------------|
| Accueil dossier | `dossier/index.tsx` | Vue médecin (liste patients, stats) ou patient (résumé dossier) |
| Dossier patient | `dossier/patient-record.tsx` | Dossier complet : identité, infos critiques, antécédents personnels/familiaux, habitudes de vie, consultations, résultats labo, vaccins |
| Nouvelle consultation | `dossier/new-consultation.tsx` | Formulaire consultation (signes vitaux, examen clinique, diagnostic, prescription, examens demandés) |
| Ajout patient | `dossier/add-patient.tsx` | Formulaire création patient avec liaison par email |
| QR Code | `dossier/my-qrcode.tsx` | QR code contenant les infos critiques du patient |
| Ordonnances | `dossier/prescriptions.tsx` | Liste des ordonnances avec détails médicaments |
| Scanner QR | `dossier/scanner.tsx` | Scanner de QR code pour accéder au dossier patient |
| Rapports | `dossier/doctor-reports.tsx` | Rapports et statistiques médecin |
| Résultat labo | `dossier/new-lab-result.tsx` | Ajout résultat d'analyse |
| Nouveau vaccin | `dossier/new-vaccine.tsx` | Ajout vaccination |

**Fonctionnalités clés :**
- Numéro de dossier unique format `KNY-YYYY-XXXXX`
- QR Code médical avec infos critiques (groupe sanguin, allergies, traitements permanents)
- Antécédents remplissables par le médecin ET le patient
- Liaison patient-médecin par numéro de dossier ou email
- Prescriptions détaillées (DCI, posologie, voie d'administration)

---

## 6. Gestion d'état

### Architecture

```
┌─────────────────────────────────────────┐
│           React Query Provider           │
│  (cache, mutations, état serveur)        │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  authStore   │  │  medicalStore   │  │
│  │  (Zustand)   │  │  (Zustand +     │  │
│  │              │  │   persist)      │  │
│  │ - user       │  │ - patients      │  │
│  │ - isAuth     │  │ - maternity     │  │
│  │ - login()    │  │ - smsReminders  │  │
│  │ - signup()   │  │ - CRUD ops      │  │
│  └──────────────┘  └─────────────────┘  │
│         │                  │            │
│         └──────┬───────────┘            │
│                ▼                        │
│     ┌─────────────────┐                 │
│     │  AppStorage     │                 │
│     │  (AsyncStorage  │                 │
│     │   abstraction)  │                 │
│     └─────────────────┘                 │
└─────────────────────────────────────────┘
```

### authStore (`store/authStore.ts`)

Store Zustand (sans persist middleware, hydratation manuelle) :

| Champ/Méthode | Description |
|---|---|
| `user` | Utilisateur connecté (`User \| null`) |
| `isAuthenticated` | État de connexion |
| `isHydrated` | AsyncStorage chargé |
| `login(email, password)` | Connexion par email/mot de passe |
| `signup(userData)` | Inscription avec rôle (médecin/patient) |
| `logout()` | Déconnexion |
| `hydrate()` | Restauration session depuis AsyncStorage |
| `findPatientByEmail(email)` | Recherche patient par email |
| `findPatientByPhone(phone)` | Recherche patient par téléphone |

Les utilisateurs sont stockés dans AsyncStorage sous la clé `santeconnect-users`.
L'état d'auth est stocké sous `santeconnect-auth`.

### medicalStore (`store/medicalStore.ts`)

Store Zustand **avec persist middleware** (clé : `santeconnect-medical-v2`) :

**Données :**
- `patients: PatientRecord[]` — Dossiers patients complets
- `maternityPatients: MaternityPatient[]` — Dossiers maternité
- `smsReminders: SmsReminder[]` — Rappels SMS

**Méthodes principales :**

| Catégorie | Méthodes |
|---|---|
| Patients | `addPatient`, `getPatientsByDoctor`, `getPatientById`, `getPatientByDossierNumber`, `updatePatientIdentity`, `updateCriticalInfo`, `updatePersonalHistory`, `updateFamilyHistory`, `updateLifeHabits` |
| Consultations | `addConsultation`, `addLabResult`, `addVaccine` |
| Liaison | `linkPatientToDoctor`, `linkPatientToUser`, `autoLinkPatientByEmail` |
| Mon dossier | `getMyRecord`, `getMyRecordByEmail`, `getMyPrescriptions`, `getQRCodeData` |
| Maternité | `addMaternityPatient`, `getMaternityPatientsByDoctor`, `addWeeklyCheckup`, `markPrenatalConsultationDone`, `addPrenatalExam`, `addChild`, `addChildGrowth`, `markChildVaccineDone` |
| SMS | `addSmsReminder`, `updateReminderStatus`, `getSmsReminders` |
| Stats | `getDoctorStats` |

### storage.ts (`store/storage.ts`)

Couche d'abstraction au-dessus de `AsyncStorage` :
- Tente d'utiliser AsyncStorage natif
- Fallback vers un store en mémoire si indisponible (web)
- Expose `AppStorage` (pour authStore) et `zustandStorage` (pour le middleware persist de Zustand)

---

## 7. Types & Modèles de données

Tous les types sont dans `types/medical.ts`. Voici les principaux :

### Patient

```typescript
PatientRecord {
  id, userId?, linkedEmail?,
  identity: PatientIdentity,       // Nom, prénom, date naissance, sexe, contacts urgence
  criticalInfo: CriticalInfo,      // Groupe sanguin, allergies, maladies chroniques, traitements
  personalHistory: PersonalHistory, // Chirurgies, hospitalisations, transfusion
  familyHistory: FamilyHistory,    // Diabète, HTA, cancer, drépanocytose, hérédité
  lifeHabits: LifeHabits,         // Tabac, alcool, activité physique, régime
  consultations: ConsultationRecord[],
  labResults: LabResult[],
  vaccines: VaccineRecord[],
  doctorIds: string[],
  doctorId: string
}
```

### Consultation

```typescript
ConsultationRecord {
  id, patientId, doctorId, doctorName, date, time,
  reason,                          // Motif
  vitalSigns: VitalSigns,         // Poids, taille, IMC, T°, TA, FC, SpO2, FR
  clinicalExams: ClinicalExam[],   // Examen par appareil
  mainDiagnosis, differentialDiagnosis?,
  treatment,
  prescriptions: PrescriptionItem[], // Ordonnances détaillées
  requestedExams: string[],
  nextAppointment?, referral?
}
```

### Maternité

```typescript
MaternityPatient {
  id, userId?, linkedEmail?,
  pregnancy: Pregnancy,            // DDR, DPA, semaine actuelle, gestité, parité
  weeklyCheckups: WeeklyCheckup[], // Suivi hebdomadaire
  prenatalConsultations: PrenatalConsultation[], // 8 CPN standards
  prenatalExams: PrenatalExam[],
  children: ChildProfile[],
  childGrowth: ChildGrowthRecord[],
  childVaccines: PEVVaccine[],     // Vaccins PEV Guinée
  alertLevel: 'vert' | 'jaune' | 'rouge',
  soignantId?
}
```

### Urgence

```typescript
EmergencyAlert {
  id, senderId, senderName, senderPhone?,
  latitude, longitude, description,
  urgencyLevel: 'critique' | 'grave' | 'modere',
  status: 'active' | 'prise_en_charge' | 'resolue',
  responderId?, responderName?
}

Secourist { id, name, phone, latitude, longitude, isAvailable, specialty? }
Hospital { id, name, type, latitude, longitude, phone?, is24h?, hasMaternity? }
```

---

## 8. Authentification

### Flux

1. L'utilisateur ouvre l'app → `AuthGuard` vérifie l'hydratation
2. Si pas de session → redirection vers `/auth/login`
3. Inscription (`/auth/signup`) : choix du rôle **médecin** ou **patient**
4. Connexion → stockage de l'état auth dans AsyncStorage
5. Session restaurée automatiquement au prochain lancement

### Rôles

| Rôle | Accès |
|------|-------|
| **medecin** | Créer patients, consultations, prescriptions, résultats labo, vaccins. Dashboard avec statistiques. Scanner QR. Remplir antécédents. |
| **patient** | Voir son dossier, ses ordonnances, son QR code. Suivi maternité. Modifier ses antécédents. |

### Stockage actuel

> **Note** : L'authentification est actuellement locale (AsyncStorage). Les mots de passe sont stockés en clair. Pour la production, il faut implémenter un backend avec hachage des mots de passe et JWT.

---

## 9. Thème & Design System

### Couleurs (`constants/colors.ts`)

```
Urgence  : #DC3545 (rouge)     → Headers, boutons urgence
Maternité: #9B59B6 (violet)    → Headers, accents maternité
Médical  : #0D6EFD (bleu)      → Headers, accents dossier
Vie      : #4CAF50 (vert)      → Indicateurs positifs
Warning  : #FFC107 (jaune)     → Alertes modérées
Background: #F8F9FA             → Fond général
Text     : #212529              → Texte principal
TextSec  : #6C757D              → Texte secondaire
Border   : #DEE2E6              → Bordures
```

### Thème React Native Paper (`constants/theme.ts`)

Basé sur `MD3LightTheme` avec les couleurs médicales appliquées en primary/secondary/tertiary.

---

## 10. Reproduire le projet en local

### Prérequis

- **Node.js** 18+ (recommandé 20+)
- **Bun** (package manager) — installer via `curl -fsSL https://bun.sh/install | bash`
- **Expo CLI** — installé via bun
- **Expo Go** sur votre téléphone (iOS/Android) pour tester

### Étapes

#### 1. Créer le projet Expo

```bash
bunx create-expo-app@latest kendeya --template blank-typescript
cd kendeya
```

#### 2. Installer les dépendances

```bash
bun add expo-router react-native-screens react-native-safe-area-context
bun add react-native-gesture-handler expo-linking expo-constants expo-status-bar
bun add react-native-paper react-native-svg
bun add lucide-react-native
bun add zustand @react-native-async-storage/async-storage
bun add @tanstack/react-query
bun add react-native-maps
bun add react-native-qrcode-svg
bun add expo-camera expo-location expo-haptics expo-notifications
bun add expo-image expo-image-picker expo-linear-gradient
bun add expo-blur expo-web-browser expo-splash-screen expo-system-ui
bun add axios
bun add react-native-web react-dom
```

#### 3. Configurer `app.json`

```json
{
  "expo": {
    "name": "Kendeya",
    "slug": "kendeya",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "kendeya",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": [
      ["expo-router", { "origin": "https://kendeya.app/" }],
      "expo-font",
      "expo-web-browser"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

#### 4. Configurer `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### 5. Copier l'arborescence

Reproduire exactement la structure de fichiers décrite dans la section 3 :

1. Créer `constants/colors.ts` et `constants/theme.ts`
2. Créer `types/medical.ts` avec tous les types
3. Créer `store/storage.ts`, `store/authStore.ts`, `store/medicalStore.ts`
4. Créer tous les fichiers de `app/` en suivant l'arborescence

#### 6. Configurer le `package.json`

Ajouter dans `package.json` :

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
}
```

#### 7. Lancer le projet

```bash
bun start
```

Scanner le QR code affiché avec l'app **Expo Go** sur votre téléphone.

Pour le web :
```bash
bun start --web
```

### Pour connecter un vrai backend

Actuellement, toutes les données sont stockées localement via AsyncStorage/Zustand persist. Pour passer en production :

1. **Créer un backend** (Node.js + Express/Hono, Python + FastAPI, etc.) avec :
   - API REST ou tRPC pour les opérations CRUD
   - Base de données (PostgreSQL recommandé)
   - Authentification JWT avec hachage bcrypt des mots de passe
   - Endpoints pour chaque opération du `medicalStore` et `authStore`

2. **Modifier les stores** :
   - Remplacer les opérations AsyncStorage par des appels API (via `axios` ou `fetch`)
   - Utiliser React Query (`useQuery`, `useMutation`) pour la synchronisation
   - Garder Zustand pour l'état local/UI et le cache optimiste

3. **Variables d'environnement** à configurer :
   - `EXPO_PUBLIC_API_BASE_URL` : URL de votre backend
   - Créer un fichier `.env` à la racine du projet Expo

4. **Schéma base de données** suggéré :
   - Table `users` (id, email, password_hash, first_name, last_name, phone, role)
   - Table `patients` (toutes les colonnes de PatientRecord)
   - Table `consultations` (colonnes de ConsultationRecord, FK vers patients)
   - Table `lab_results`, `vaccines`, `prescriptions`
   - Table `maternity_patients`, `weekly_checkups`, `prenatal_consultations`
   - Table `children`, `child_growth`, `child_vaccines`
   - Table `emergency_alerts`, `secourists`
   - Table `sms_reminders`

### Notes importantes

- L'app utilise **react-native-maps** pour la cartographie. Sur le web, elle fonctionne mais avec des limitations.
- Le scanner QR (`expo-camera`) a un support limité sur le web.
- La géolocalisation (`expo-location`) nécessite un fallback web avec l'API Geolocation du navigateur.
- Les données mockées (hôpitaux, secouristes) sont directement dans les composants. En production, les déplacer vers le backend.

---

## Diagramme de flux utilisateur

```
┌─────────┐     ┌──────────┐     ┌─────────────────────┐
│  Splash  │────▶│  Login   │────▶│   Tabs Navigation   │
│  Screen  │     │  Signup  │     │                     │
└─────────┘     └──────────┘     │  ┌───┐ ┌───┐ ┌───┐ │
                                  │  │ U │ │ M │ │ D │ │
                                  │  │ r │ │ a │ │ o │ │
                                  │  │ g │ │ t │ │ s │ │
                                  │  └─┬─┘ └─┬─┘ └─┬─┘ │
                                  └───┼─────┼─────┼───┘
                                      │     │     │
                              ┌───────┘     │     └───────┐
                              ▼             ▼             ▼
                        ┌──────────┐  ┌──────────┐  ┌──────────┐
                        │ Carte    │  │ Suivi    │  │ Dossier  │
                        │ Hôpitaux │  │ Grossesse│  │ Patient  │
                        │ Chat IA  │  │ Enfants  │  │ Consult. │
                        │ Secouris.│  │ SMS      │  │ Ordonn.  │
                        │ Alertes  │  │ Dashboard│  │ QR Code  │
                        └──────────┘  └──────────┘  └──────────┘
```

---

*Ce document doit être mis à jour à chaque modification significative de l'architecture du projet.*
