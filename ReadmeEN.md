# WARP.md

This file provides guidance when working with code in this repository.

## Project Overview

This is a React Native book discovery and social reading app built with Expo, called "en2VersV0". It uses file-based routing via `expo-router` and connects to a backend API for user authentication, book reviews, favorites, and community features.

## Development Commands

### Starting the App
```bash
# Start Expo development server (interactive menu)
npm start

# Start on Android device/emulator
npm run android

# Start on iOS simulator (macOS only)
npm run ios

# Start for web
npm run web
```

### Installation
```bash
npm install
```

No test suite, linting, or build commands are configured in this project.

## Architecture

### Routing Structure (Expo Router)
The app uses file-based routing with two main route groups:
- `app/(auth)/`: Authentication screens (login, signup) - publicly accessible
- `app/(tabs)/`: Main app tabs (index, search, profile, chat) - requires authentication
- `app/(tabs)/book/[bookKey].js`: Dynamic book detail screen (nested under tabs but hidden from tab bar)

### Authentication Flow
- Implemented via `context/AuthContext.js` using React Context API
- Auth tokens stored securely in `expo-secure-store`
- `app/_layout.js` contains `AuthGate` component that enforces authentication rules:
  - Unauthenticated users are redirected to `/(auth)/login`
  - Authenticated users accessing auth routes are redirected to `/(tabs)`
- All protected API requests automatically include Bearer token via axios interceptor in `services/api.js`

### API Integration
- Backend URL: `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run`
- Two API clients:
  - `services/api.js`: Configured axios instance with auth interceptor for backend API
  - Direct `axios` imports: Used for OpenLibrary API calls (public, no auth)
- Main API routes used:
  - `/auth/login`, `/auth/signup`
  - `/favorite` (POST to add favorite books)
  - `/reviews` (POST/GET book reviews)
  - `/reviews/book/:bookKey/stats` (GET rating statistics)
  - `/excerpt/book/:bookKey`, `/deepdive/book/:bookKey`
  - `/books/trending?limit=30` (GET trending books)
  - `/user/profile/:userId`

### Book Key Normalization
- OpenLibrary uses book keys in format `/works/OL123456W`
- Utility functions in `utils/bookkey.js`:
  - `normalizeBookKey(key)`: Ensures format is `/works/...`
  - `stripBookKey(key)`: Removes `/works/` prefix
- Always use normalized keys when storing/comparing, strip when using in URLs

### Main Features

#### Home Tab (`app/(tabs)/index.js`)
- Tinder-style swipe interface for book discovery
- Fetches trending books from backend
- Swipe right to favorite (saves to backend), swipe left to skip
- Uses `Animated` API and `PanResponder` for gesture handling
- Tap card to navigate to book detail screen

#### Search Tab (`app/(tabs)/search.js`)
- Four search modes via dropdown: Title, Author, Subject, ISBN
- Direct integration with OpenLibrary API
- Subject search supports pagination with infinite scroll
- Custom result renderers in `components/OrganisationSearchRender/`

#### Book Detail Screen (`app/(tabs)/book/[bookKey].js`)
- Fetches book metadata from OpenLibrary API
- Displays reviews, excerpts, deep dives from backend
- Users can submit star ratings (1-5)
- Shows average rating from all users
- Uses `StarRating` component from `react-native-star-rating-widget`

#### Profile Tab (`app/(tabs)/profile.js`)
- Displays user info: avatar, username, bio
- Shows favorite books with cover images
- Lists favorite subjects (user preferences)
- Menu for profile modification, settings, logout (partially implemented)

### Component Organization
- `components/BookCard.js`: Reusable book card with cover, tags, and mask functionality
- `components/BookScreen/`: Sub-components for book detail page (Reviews.js, Excerpts.js, DeepDives.js)
- `components/OrganisationSearchRender/`: Search result renderers for each search type
- `components/OrderSubjects.js`: Genre/subject selection component

### Constants & Configuration
- `constants/genres.js`: List of 69 book genres/subjects for user preference selection
- `constants/book.js`: Mock book data (not actively used in production code)
- `app.json`: Expo configuration with Sentry integration

### Error Monitoring
- Sentry configured via `@sentry/react-native/expo` plugin
- Metro bundler extended with Sentry config in `metro.config.js`

## Key Technical Patterns

### State Management
- React Context for global auth state (`context/AuthContext.js`)
- Local component state with hooks (`useState`, `useEffect`)
- No Redux or other state management libraries

### Navigation
- File-based routing via `expo-router`
- Programmatic navigation with `router.push()` and `router.back()`
- Route parameters accessed via `useLocalSearchParams()`

### Styling
- All styling done with StyleSheet API (React Native)
- No external styling libraries or CSS-in-JS
- Color scheme: Orange accent (`#D35400`), beige backgrounds (`#FAFAF0`)

### Data Flow
1. User authenticates → token stored in SecureStore
2. Token automatically injected in API requests via interceptor
3. Components fetch data on mount with `useEffect`
4. Loading states managed with local boolean flags

## Environment Notes
- The app targets iOS, Android, and web platforms
- Uses Expo's new architecture (`"newArchEnabled": true`)
- No native code modifications (pure Expo managed workflow)
- iOS: Supports tablets
- Android: Edge-to-edge display enabled
