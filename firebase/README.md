# Firebase setup

This project now uses Firebase for:

- Authentication
- Firestore data for cockpit modules
- Optional Storage and Analytics later

Required client env variables:

- `ACESSOR_FIREBASE_API_KEY`
- `ACESSOR_FIREBASE_AUTH_DOMAIN`
- `ACESSOR_FIREBASE_PROJECT_ID`
- `ACESSOR_FIREBASE_STORAGE_BUCKET`
- `ACESSOR_FIREBASE_MESSAGING_SENDER_ID`
- `ACESSOR_FIREBASE_APP_ID`
- `ACESSOR_FIREBASE_MEASUREMENT_ID`

Recommended collections:

- `workspaces`
- `knowledge_base`
- `contacts`
- `conversations`
- `deals`
- `automations`
- `session_notes`
- `changelog_events`

Notes:

- The cockpit falls back to demo mode when Firebase config is absent.
- The login page can sign in with Firebase Auth or demo credentials.
