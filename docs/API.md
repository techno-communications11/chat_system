# Pingly Chat API Reference

Base URL: http://localhost:4701. Every route is also available under /api/v1/chat instead of /chat-service.

Protected routes require Authorization Bearer JWT and normally x-chat-app-name.

## Authentication

| Method | Endpoint                    | Body                                   | Description                            |
| ------ | --------------------------- | -------------------------------------- | -------------------------------------- |
| POST   | /chat-service/auth/register | email, username, displayName, password | Register when password auth is enabled |
| POST   | /chat-service/auth/login    | login, password, type                  | Local login and JWT issuance           |

## Identity and settings

| Method | Endpoint                    | Body/Query                     | Description                             |
| ------ | --------------------------- | ------------------------------ | --------------------------------------- |
| GET    | /chat-service/me            | —                              | Current identity and connection status  |
| GET    | /chat-service/me/settings   | —                              | Read database-backed settings           |
| PATCH  | /chat-service/me/settings   | desktopNotifications boolean   | Save notification preference            |
| PATCH  | /chat-service/me/status     | presence                       | Set online, away, busy, dnd, or offline |
| PATCH  | /chat-service/me/avatar     | image stream or avatarUrl      | Update avatar                           |
| GET    | /chat-service/users         | search, limit, excludeSelf     | List searchable users                   |
| GET    | /chat-service/users/:userId | —                              | Get user profile                        |
| GET    | /chat-service/roles         | —                              | List roles; admin                       |
| POST   | /chat-service/roles         | name, description, permissions | Create role; admin                      |

## Conversations and groups

| Method | Endpoint                                               | Body            | Description                         |
| ------ | ------------------------------------------------------ | --------------- | ----------------------------------- |
| GET    | /chat-service/conversations                            | —               | List conversations and unread state |
| GET    | /chat-service/groups                                   | —               | List groups                         |
| GET    | /chat-service/channels                                 | —               | List channels                       |
| POST   | /chat-service/channels                                 | channel payload | Create channel                      |
| POST   | /chat-service/channels/:channelId/join                 | —               | Join public channel                 |
| POST   | /chat-service/conversations/direct/:userId             | —               | Open/create direct conversation     |
| POST   | /chat-service/conversations/groups                     | title, userIds  | Create UUID-backed group            |
| PATCH  | /chat-service/conversations/:chatId                    | title           | Rename conversation                 |
| POST   | /chat-service/conversations/:chatId/members            | userIds         | Add members                         |
| DELETE | /chat-service/conversations/:chatId/members/:userId    | —               | Remove member                       |
| POST   | /chat-service/conversations/:chatId/leave              | —               | Leave group                         |
| POST   | /chat-service/conversations/:chatId/transfer-ownership | userId          | Transfer group ownership            |
| POST   | /chat-service/conversations/:chatId/read               | —               | Mark read                           |
| DELETE | /chat-service/conversations/:chatId/messages           | —               | Clear only current user's history   |

## Messages, files, and reactions

| Method | Endpoint                                                                 | Body/Query              | Description               |
| ------ | ------------------------------------------------------------------------ | ----------------------- | ------------------------- |
| GET    | /chat-service/conversations/:chatId/messages                             | limit, before           | Paginated visible history |
| POST   | /chat-service/conversations/:chatId/messages                             | text, replyTo, metadata | Send message              |
| PATCH  | /chat-service/conversations/:chatId/messages/:messageId                  | text                    | Edit message              |
| DELETE | /chat-service/conversations/:chatId/messages/:messageId                  | —                       | Soft-delete message       |
| PATCH  | /chat-service/conversations/:chatId/messages/:messageId/pin              | pinned                  | Pin/unpin                 |
| POST   | /chat-service/messages/direct/:userId                                    | text                    | Send direct message       |
| POST   | /chat-service/messages/multiple                                          | userIds, text           | Multi-user message        |
| POST   | /chat-service/messages/broadcast                                         | search, text            | Admin broadcast           |
| GET    | /chat-service/messages/search                                            | search, limit           | Search visible messages   |
| POST   | /chat-service/conversations/:chatId/files                                | file/metadata           | Add file message          |
| POST   | /chat-service/conversations/:chatId/messages/:messageId/reactions        | emoji                   | Add reaction              |
| DELETE | /chat-service/conversations/:chatId/messages/:messageId/reactions/:emoji | —                       | Remove reaction           |

## Calls

| Method | Endpoint                                                  | Body             | Description          |
| ------ | --------------------------------------------------------- | ---------------- | -------------------- |
| POST   | /chat-service/conversations/:chatId/calls                 | type audio/video | Start call           |
| GET    | /chat-service/calls/active                                | —                | Restore active calls |
| POST   | /chat-service/conversations/:chatId/calls/:callId/respond | action           | Accept/decline       |
| POST   | /chat-service/conversations/:chatId/calls/:callId/end     | —                | End/cancel call      |

## Audit and health

| Method | Endpoint                       | Query                         | Description            |
| ------ | ------------------------------ | ----------------------------- | ---------------------- |
| GET    | /chat-service/admin/audit-logs | action, userId, chatId, limit | Admin audit search     |
| GET    | /ping                          | —                             | Health check           |
| GET    | /api/v1/health                 | —                             | Versioned health check |

## Response format

```json
{
  "status": 200,
  "success": true,
  "message": "Request completed",
  "data": {}
}
```

Common errors: 400 invalid input, 401 authentication, 403 permission, 404 not found, 409 conflict, and 5xx provider/server failures.

## Socket.IO

Connect with:

```js
io("http://localhost:4701", {
  auth: { token, appName: "ticket_portal" },
});
```

Client events: join:conversation, leave:conversation, typing:update, join:call, leave:call, call:signal.

Server events: message:new, message:updated, message:read, reaction:added, typing:update, presence:update, avatar:update, call:started, call:ringing, call:accepted, call:declined, call:cancelled, call:missed, call:ended, call:peer-joined, call:peer-left, call:signal.

Public UUIDs are used in API/socket payloads. Membership is checked before conversation and call room access.
