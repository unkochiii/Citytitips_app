# en2VersV0

Une application mobile de découverte de livres et de lecture sociale, construite avec React Native et Expo.

## 📚 Description

en2VersV0 est une application de découverte de livres qui offre une expérience interactive de type Tinder pour explorer de nouveaux ouvrages. L'application permet aux utilisateurs de parcourir des livres tendances, de rechercher des titres spécifiques, de lire et partager des critiques, et de gérer leurs livres favoris.

## ✨ Fonctionnalités principales

### 🏠 Découverte de livres (Accueil)
- Interface de swipe style Tinder pour découvrir des livres
- Swipe à droite pour ajouter aux favoris
- Swipe à gauche pour passer au livre suivant
- Tap sur une carte pour voir les détails du livre
- Livres tendances chargés depuis le backend

### 🔍 Recherche
- Quatre modes de recherche :
  - Par titre
  - Par auteur
  - Par sujet
  - Par ISBN
- Intégration directe avec l'API OpenLibrary
- Pagination et défilement infini pour les recherches par sujet

### 📖 Détails du livre
- Métadonnées complètes des livres (auteur, date de publication, description)
- Système de notation par étoiles (1-5)
- Moyenne des notes de tous les utilisateurs
- Extraits et analyses approfondies
- Section de critiques communautaires

### 👤 Profil utilisateur
- Avatar et informations personnelles
- Collection de livres favoris avec couvertures
- Sujets/genres préférés
- Options de paramètres et déconnexion

## 🚀 Installation

### Prérequis
- Node.js installé sur votre machine
- npm ou yarn
- Expo CLI (optionnel mais recommandé)
- Un émulateur Android/iOS ou un appareil physique avec l'app Expo Go

### Étapes d'installation

1. Cloner le dépôt :
```bash
git clone <url-du-depot>
cd Front-end
```

2. Installer les dépendances :
```bash
npm install
```

3. Démarrer l'application :
```bash
# Menu interactif Expo
npm start

# Sur Android
npm run android

# Sur iOS (macOS uniquement)
npm run ios

# Version web
npm run web
```

## 🏗️ Architecture technique

### Stack technologique
- **Framework** : React Native avec Expo
- **Routing** : expo-router (navigation basée sur les fichiers)
- **Authentification** : React Context API + expo-secure-store
- **API Backend** : https://site--en2versv0-backend--ftkq8hkxyc7l.code.run
- **API Livres** : OpenLibrary API
- **Monitoring** : Sentry

### Structure des routes
```
app/
├── (auth)/          # Écrans d'authentification
│   ├── login.js     # Connexion
│   └── signup.js    # Inscription
├── (tabs)/          # Navigation par onglets principale
│   ├── index.js     # Découverte (swipe)
│   ├── search.js    # Recherche
│   ├── profile.js   # Profil
│   ├── chat.js      # Chat (à venir)
│   └── book/
│       └── [bookKey].js  # Détails du livre (dynamique)
└── _layout.js       # Layout racine avec AuthGate
```

### Gestion de l'authentification
- Les tokens sont stockés de manière sécurisée avec `expo-secure-store`
- Intercepteur axios pour l'injection automatique des tokens
- Composant `AuthGate` qui :
  - Redirige les utilisateurs non authentifiés vers `/login`
  - Redirige les utilisateurs authentifiés depuis les routes auth vers l'app

### APIs utilisées

#### Backend (authentifié)
- `POST /auth/login` - Connexion
- `POST /auth/signup` - Inscription
- `POST /favorite` - Ajouter un livre aux favoris
- `POST /reviews` - Soumettre une critique
- `GET /reviews/book/:bookKey/stats` - Statistiques de notation
- `GET /books/trending` - Livres tendances
- `GET /user/profile/:userId` - Profil utilisateur

#### OpenLibrary (public)
- Recherche de livres (titre, auteur, sujet, ISBN)
- Métadonnées des livres
- Couvertures de livres

## 🎨 Design

- **Couleurs principales** :
  - Accent orange : `#D35400`
  - Fond beige : `#FAFAF0`
- Styling avec React Native StyleSheet API
- Design responsive compatible iOS, Android et web

## 📁 Organisation du code

```
├── app/                    # Routes (expo-router)
├── components/             # Composants réutilisables
│   ├── BookCard.js        # Carte de livre
│   ├── BookScreen/        # Composants de détails
│   └── OrganisationSearchRender/  # Rendus de recherche
├── constants/             # Constantes (genres, config)
├── context/               # Context API (auth)
├── services/              # Services API
├── utils/                 # Utilitaires (normalisation bookKey)
└── assets/               # Images et ressources
```

## 🔑 Normalisation des clés de livres

OpenLibrary utilise des clés au format `/works/OL123456W`. Le projet fournit des utilitaires dans `utils/bookkey.js` :
- `normalizeBookKey(key)` : Assure le format `/works/...`
- `stripBookKey(key)` : Retire le préfixe `/works/`

## 🛠️ Développement

### Patterns utilisés
- React Hooks pour la gestion d'état locale
- React Context pour l'état global (authentification)
- `useEffect` pour le chargement des données
- Navigation programmatique avec `router.push()` et `router.back()`

### Gestion d'état
- Pas de Redux ni autres bibliothèques de state management
- Context API pour l'authentification
- État local avec `useState` et `useEffect`

## 🌐 Plateformes supportées

- ✅ iOS (y compris iPad)
- ✅ Android (affichage edge-to-edge)
- ✅ Web

## 📝 Notes

- L'application utilise la nouvelle architecture Expo (`"newArchEnabled": true`)
- Workflow entièrement géré par Expo (pas de code natif modifié)
- Monitoring des erreurs configuré avec Sentry

## 🤝 Contribution

Aucune procédure de test ou de linting n'est actuellement configurée dans le projet.


## 👥 Auteurs

[À définir]
