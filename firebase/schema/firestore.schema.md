# Firestore schema - Acessor Digital

This project uses Firestore as the operational database for the cockpit.

## Collections

### `workspaces`
Stores the tenant/company record.

Fields:
- `name` string
- `slug` string
- `cnpj` string
- `billingPlan` string
- `creditsBalance` number
- `businessHours` map
- `createdAt` timestamp
- `updatedAt` timestamp

### `contacts`
CRM contacts and leads.

Fields:
- `workspaceId` string
- `name` string
- `phone` string
- `email` string
- `channel` string
- `aiScore` number
- `status` string
- `tags` array
- `lastMessageAt` timestamp
- `notes` string
- `createdAt` timestamp
- `updatedAt` timestamp

### `conversations`
Conversation state for inbox.

Fields:
- `workspaceId` string
- `contactId` string
- `status` string
- `aiPaused` boolean
- `lastMessageAt` timestamp
- `summary` string
- `createdAt` timestamp
- `updatedAt` timestamp

### `deals`
Pipeline/deal registry.

Fields:
- `workspaceId` string
- `contactId` string
- `stage` string
- `value` number
- `ownerName` string
- `source` string
- `closedAt` timestamp
- `createdAt` timestamp
- `updatedAt` timestamp

### `automations`
Automation definitions.

Fields:
- `workspaceId` string
- `type` string
- `name` string
- `isActive` boolean
- `triggerCount` number
- `conversionRate` number
- `config` map
- `createdAt` timestamp
- `updatedAt` timestamp

### `knowledge_base`
Knowledge base documents.

Fields:
- `workspaceId` string
- `type` string
- `title` string
- `content` string
- `status` string
- `sourceUrl` string
- `metadata` map
- `createdAt` timestamp
- `updatedAt` timestamp

### `session_notes`
Operational context and conversation memory.

Fields:
- `workspaceId` string
- `author` string
- `note` string
- `context` map
- `createdAt` timestamp

### `changelog_events`
Change log and sync history.

Fields:
- `workspaceId` string
- `source` string
- `eventType` string
- `title` string
- `description` string
- `payload` map
- `createdAt` timestamp

## Index suggestions

- `contacts`: `workspaceId + updatedAt`
- `conversations`: `workspaceId + lastMessageAt`
- `deals`: `workspaceId + stage`
- `automations`: `workspaceId + isActive`
- `knowledge_base`: `workspaceId + updatedAt`
- `session_notes`: `workspaceId + createdAt`
- `changelog_events`: `workspaceId + createdAt`

## Demo seed

Start with one workspace and a handful of sample docs per collection so the cockpit renders immediately in demo and Spark environments.
