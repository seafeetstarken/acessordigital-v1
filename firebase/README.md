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

Core setup files:

- `firestore.rules`
- `firestore.indexes.json`
- `seed/firestore.seed.json`
- `schema/firestore.schema.md`

Recommended document shape:

- `workspaces/{workspaceId}`: `name`, `slug`, `cnpj`, `billingPlan`, `creditsBalance`, `businessHours`
- `contacts/{contactId}`: `workspaceId`, `name`, `phone`, `email`, `channel`, `aiScore`, `status`, `tags`, `lastMessageAt`
- `conversations/{conversationId}`: `workspaceId`, `contactId`, `status`, `aiPaused`, `lastMessageAt`
- `deals/{dealId}`: `workspaceId`, `contactId`, `stage`, `value`, `ownerName`, `source`, `closedAt`
- `automations/{automationId}`: `workspaceId`, `type`, `name`, `isActive`, `triggerCount`, `conversionRate`
- `knowledge_base/{documentId}`: `workspaceId`, `type`, `title`, `content`, `status`, `sourceUrl`, `metadata`
- `session_notes/{noteId}`: `workspaceId`, `author`, `note`, `context`
- `changelog_events/{eventId}`: `workspaceId`, `source`, `eventType`, `title`, `description`, `payload`
