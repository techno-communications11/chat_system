# Chat Backend

Standalone local chat API extracted from the ticketing backend.

## Database

Configured for local MySQL:

```env
DB_NAME=chat_system
DB_USER=root
DB_PASS=root
DB_HOST=localhost
DB_PORT=3306
```

The server creates the `chat_system` database if it does not exist, then syncs these tables:

- `chat_identities`
- `chat_audit_logs`
- `chat_conversations`
- `chat_conversation_participants`
- `chat_messages`
- `chat_message_reactions`

The chat flow is local and uses the ticketing system user table as the source of truth.
Chat identities are created only as local chat mappings for ticketing users.

Configure the ticketing user table with:

```env
TICKET_DB_NAME=chat_system
TICKET_USERS_TABLE=users
TICKET_USER_ID_COLUMN=id
TICKET_USER_EMAIL_COLUMN=email
TICKET_USER_NAME_COLUMN=name
TICKET_USER_USERNAME_COLUMN=username
TICKET_USER_ROLE_COLUMN=role
```

## Run

```bash
npm install
npm run dev
```

Before the first deployment or after model changes, apply the idempotent schema compatibility migration:

```bash
npm run db:sync
```

API health check:

```text
http://localhost:4701/ping
```

## In-app calls

Audio and video calls are handled by the chat backend and browser clients. The
REST API stores the call lifecycle, and Socket.IO relays WebRTC signaling
messages between conversation participants. No external meeting API or OAuth
setup is required.

The frontend should use:

```env
VITE_API_URL=http://localhost:4701
```

## Multi-Application Embedding

Open chat from each application with both the JWT and application name:

```text
https://chat.example.com/chat?token=<jwt>&app=ticket_portal
```

The frontend stores the app name and sends it on every API request:

```http
x-chat-app-name: ticket_portal
Authorization: Bearer <jwt>
```

Configure an app-specific user directory endpoint so `/chat-service/users`
returns only the people associated with the current user in that application:

```env
CHAT_PROVIDER_TICKET_PORTAL_USERS_URL=https://ticket.example.com/api/chat/users
```

The chat backend calls that endpoint with the same bearer token and query params
like `currentUserId`, `email`, `search`, `limit`, and `excludeSelf`. The endpoint
can return an array directly or `{ "users": [...] }` / `{ "data": [...] }`.

If no provider URL is configured for an app, chat falls back to local
`chat_users` plus already-known chat identities.

## Enterprise Chat API

All chat routes live under `/chat-service` and require `Authorization: Bearer <jwt>`
unless noted.

Legacy password login can be scoped to a host portal by passing `type` in the
request body. The same value should be sent as `x-chat-app-name` on later API
requests:

```json
{
  "login": "agent@example.com",
  "password": "secret",
  "type": "ticket_portal"
}
```

`app`, `appName`, and `portal` are also accepted as aliases for `type`.

### Identity and discovery

- `GET /chat-service/me` - current chat identity and connection status.
- `GET /chat-service/users?search=&limit=&excludeSelf=true` - searchable ticketing user directory.
- `GET /chat-service/users/:userId` - user profile.

### Conversations

- `GET /chat-service/conversations` - conversations with participants, unread counts, and last message.
- `POST /chat-service/conversations/direct/:userId` - open or create a 1:1 conversation.
- `POST /chat-service/conversations/groups` - create a group. Body: `{ "title": "...", "userIds": ["..."] }`.
- `PATCH /chat-service/conversations/:chatId` - rename a group. Body: `{ "title": "..." }`.
- `POST /chat-service/conversations/:chatId/members` - add group members. Body: `{ "userIds": ["..."] }`.
- `DELETE /chat-service/conversations/:chatId/members/:userId` - remove a group member.
- `POST /chat-service/conversations/:chatId/leave` - leave a group.
- `POST /chat-service/conversations/:chatId/read` - mark a conversation read.

### Messaging

- `GET /chat-service/conversations/:chatId/messages?limit=&before=` - paginated message history.
- `POST /chat-service/conversations/:chatId/messages` - send to a conversation. Body: `{ "text": "...", "replyTo": 123 }`.
- `POST /chat-service/messages/direct/:userId` - send a direct message. Body: `{ "text": "..." }`.
- `POST /chat-service/messages/multiple` - admin bulk DM. Body: `{ "userIds": ["..."], "text": "..." }`.
- `POST /chat-service/messages/broadcast` - admin broadcast to discovered users. Body: `{ "search": "", "text": "..." }`.
- `GET /chat-service/messages/search?search=&limit=` - search messages visible to the current user.
- `POST /chat-service/conversations/:chatId/files` - records a file message with request content metadata.

### Reactions and audit

- `POST /chat-service/conversations/:chatId/messages/:messageId/reactions` - add reaction. Body: `{ "emoji": "..." }`.
- `DELETE /chat-service/conversations/:chatId/messages/:messageId/reactions/:emoji` - remove reaction.
- `GET /chat-service/admin/audit-logs?action=&userId=&chatId=&limit=` - admin audit log search.

