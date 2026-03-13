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
9. [Backend API (tRPC + Hono)](#9-backend-api-trpc--hono)
10. [Thème & Design System](#10-thème--design-system)
11. [Reproduire le projet en local](#11-reproduire-le-projet-en-local)
12. [Checklist production](#12-checklist-production)

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
├── backend/                       # Backend API (Hono + tRPC)
│   ├── hono.ts                    # Point d'entrée Hono (monté sur /api)
│   └── trpc/
│       ├── create-context.ts      # Context tRPC, procédures public/protected
│       ├── db.ts                  # Store en mémoire + helpers (hash, token)
│       ├── app-router.ts          # Router principal tRPC
│       └── routes/
│           ├── auth.ts            # signup, login, getProfile, updateProfile
│           ├── patients.ts        # CRUD patients, consultations, labo, vaccins
│           ├── maternity.ts       # CRUD maternité, checkups, enfants, PEV
│           ├── emergency.ts       # Alertes urgence, secouristes
│           └── sms.ts             # Rappels SMS multilingues
│
├── lib/
│   ├── trpc.ts                    # Client tRPC (React + direct)
│   └── api-types.ts               # Types dérivés du router
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

## 9. Backend API (tRPC + Hono)

### Architecture

```
Client (Expo)                         Serveur (Hono)
┌─────────────────┐                  ┌─────────────────────────┐
│  trpc (React)   │───HTTP/JSON────▶│  /api/trpc/*            │
│  trpcClient     │                  │  ├── auth.*             │
│                 │                  │  ├── patients.*         │
│  Auth token     │                  │  ├── maternity.*        │
│  (Bearer)       │                  │  ├── emergency.*        │
│                 │                  │  └── sms.*              │
└─────────────────┘                  └─────────────────────────┘
```

### Point d'entree : `backend/hono.ts`

Fichier deploye automatiquement. Monte tRPC sur `/api/trpc` et expose un health check sur `/api/`.

### Authentification API

- Token genere en base64 (payload JSON : id, email, role, etc.)
- Envoye via header `Authorization: Bearer <token>`
- `protectedProcedure` verifie et decode le token
- `publicProcedure` pour login/signup (pas de token requis)

### Routes disponibles

| Router | Procedure | Type | Description |
|--------|-----------|------|-------------|
| `auth` | `signup` | mutation | Inscription (email, password, role) |
| `auth` | `login` | mutation | Connexion |
| `auth` | `getProfile` | query | Profil utilisateur connecte |
| `auth` | `updateProfile` | mutation | Mise a jour profil |
| `auth` | `findPatientByEmail` | query | Recherche patient par email |
| `auth` | `findPatientByPhone` | query | Recherche patient par telephone |
| `patients` | `create` | mutation | Creer un dossier patient |
| `patients` | `listByDoctor` | query | Liste patients du medecin |
| `patients` | `getById` | query | Dossier par ID |
| `patients` | `getByDossierNumber` | query | Dossier par numero |
| `patients` | `updateIdentity` | mutation | MAJ identite |
| `patients` | `updateCriticalInfo` | mutation | MAJ infos critiques |
| `patients` | `updatePersonalHistory` | mutation | MAJ antecedents personnels |
| `patients` | `updateFamilyHistory` | mutation | MAJ antecedents familiaux |
| `patients` | `updateLifeHabits` | mutation | MAJ habitudes de vie |
| `patients` | `addConsultation` | mutation | Ajouter consultation |
| `patients` | `addLabResult` | mutation | Ajouter resultat labo |
| `patients` | `addVaccine` | mutation | Ajouter vaccin |
| `patients` | `getDoctorStats` | query | Statistiques medecin |
| `patients` | `getMyRecord` | query | Mon dossier (patient) |
| `patients` | `getMyPrescriptions` | query | Mes ordonnances |
| `patients` | `getQRCodeData` | query | Donnees QR code |
| `maternity` | `create` | mutation | Creer dossier maternite |
| `maternity` | `listByDoctor` | query | Liste patientes du soignant |
| `maternity` | `getById` | query | Dossier par ID |
| `maternity` | `getMyData` | query | Mon suivi maternite |
| `maternity` | `addWeeklyCheckup` | mutation | Suivi hebdomadaire |
| `maternity` | `markConsultationDone` | mutation | Valider consultation prenatale |
| `maternity` | `addPrenatalExam` | mutation | Ajouter examen prenatal |
| `maternity` | `addChild` | mutation | Ajouter enfant (+ vaccins PEV) |
| `maternity` | `addChildGrowth` | mutation | Suivi croissance |
| `maternity` | `markChildVaccineDone` | mutation | Valider vaccin enfant |
| `emergency` | `createAlert` | mutation | Creer alerte urgence |
| `emergency` | `getActiveAlerts` | query | Alertes actives |
| `emergency` | `respondToAlert` | mutation | Prendre en charge alerte |
| `emergency` | `resolveAlert` | mutation | Resoudre alerte |
| `emergency` | `registerSecourist` | mutation | S'inscrire comme secouriste |
| `emergency` | `getSecourists` | query | Liste secouristes disponibles |
| `sms` | `create` | mutation | Creer rappel SMS |
| `sms` | `list` | query | Liste rappels |
| `sms` | `updateStatus` | mutation | MAJ statut rappel |

### Client tRPC (`lib/trpc.ts`)

```typescript
// Dans un composant React
const patientsQuery = trpc.patients.listByDoctor.useQuery();
const addPatient = trpc.patients.create.useMutation();

// En dehors de React
const data = await trpcClient.patients.listByDoctor.query();
```

Le token d'authentification est gere via `setAuthToken(token)` depuis `lib/trpc.ts`.

### Stockage actuel (en memoire)

> **IMPORTANT** : Le backend utilise actuellement un store **en memoire** (`db.ts`). Les donnees sont perdues a chaque redemarrage du serveur. Pour la production, connecter une base de donnees (PostgreSQL, MongoDB, etc.).

---

## 10. Theme & Design System

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

## 11. Reproduire le projet en local

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

# Backend dependencies
bun add hono @hono/trpc-server @trpc/server @trpc/client @trpc/react-query superjson zod
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

### Backend integre (tRPC + Hono)

Le backend est deja en place dans `backend/`. Il utilise :
- **Hono** comme serveur HTTP (point d'entree : `backend/hono.ts`)
- **tRPC** pour l'API type-safe
- **superjson** comme transformer
- **zod** pour la validation des entrees

Le client tRPC est configure dans `lib/trpc.ts` et branche dans `_layout.tsx` via `<trpc.Provider>`.

### Variables d'environnement

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_RORK_API_BASE_URL` | URL base de l'API backend (auto-configure sur Rork) |
| `EXPO_PUBLIC_RORK_AUTH_URL` | URL auth Rork |
| `EXPO_PUBLIC_PROJECT_ID` | ID du projet |

Pour un deploiement hors Rork, creer un `.env` :
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://votre-api.com
```

### Pour connecter une vraie base de donnees

Actuellement le backend stocke en memoire. Pour la production :

1. **Remplacer `db.ts`** par une connexion a PostgreSQL/MongoDB
2. **Schema base de donnees suggere** :
   - Table `users` (id, email, password_hash, first_name, last_name, phone, role)
   - Table `patients` (toutes les colonnes de PatientRecord)
   - Table `consultations` (FK vers patients)
   - Table `lab_results`, `vaccines`, `prescriptions`
   - Table `maternity_patients`, `weekly_checkups`, `prenatal_consultations`
   - Table `children`, `child_growth`, `child_vaccines`
   - Table `emergency_alerts`, `secourists`
   - Table `sms_reminders`
3. **Migrer les stores frontend** : remplacer les appels Zustand par les hooks tRPC

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

---

## 12. Checklist production

Avant de lancer en production, ces points doivent etre adresses :

| # | Element | Statut | Priorite |
|---|---------|--------|----------|
| 1 | Connecter une base de donnees (PostgreSQL recommande) | A faire | Critique |
| 2 | Remplacer le hash simple par bcrypt pour les mots de passe | A faire | Critique |
| 3 | Implementer JWT avec expiration et refresh tokens | A faire | Critique |
| 4 | Chiffrement des donnees medicales au repos (AES-256) | A faire | Critique |
| 5 | HTTPS obligatoire sur toutes les communications | A faire | Critique |
| 6 | Rate limiting sur les endpoints sensibles (login, signup) | A faire | Haute |
| 7 | Validation RGPD / conformite donnees de sante | A faire | Critique |
| 8 | Logs d'audit (qui accede a quel dossier, quand) | A faire | Haute |
| 9 | Backup automatique de la base de donnees | A faire | Haute |
| 10 | Tests unitaires et d'integration | A faire | Haute |
| 11 | Migrer les stores Zustand vers les hooks tRPC | A faire | Moyenne |
| 12 | Remplacer les donnees mockees (hopitaux) par des vraies | A faire | Moyenne |
| 13 | Configurer les notifications push reelles | A faire | Moyenne |
| 14 | Integrer un vrai service SMS (Twilio, Africa's Talking) | A faire | Moyenne |
| 15 | Build EAS pour iOS/Android | A faire | Haute |

---

*Ce document doit etre mis a jour a chaque modification significative de l'architecture du projet.*
