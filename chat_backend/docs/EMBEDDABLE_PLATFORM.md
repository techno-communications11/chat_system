# Embeddable chat platform

## What changed

The existing React chat UI, REST controllers, service layer, Sequelize models, and Socket.IO events remain in place. The integration boundary is now tenant-aware SSO plus an iframe/React/JavaScript SDK layer.

The database column named `appName` is intentionally retained to avoid a destructive rewrite. New code treats it as the **tenant scope** and populates it only from a verified `tenant_id` JWT claim. `x-chat-app-name` now identifies the source product (for example `ticket_portal`) and is authorized by the issuer configuration; it can no longer select a tenant.

```text
Host backend -> signs short-lived JWT -> host browser
                                      -> ChatWidget / ChatSDK
                                      -> postMessage token handshake
Chat UI -> Bearer JWT -> REST + Socket.IO -> tenant-scoped service/model queries
```

## SSO contract

Host backends issue tokens; host browsers must never hold signing keys. A token must contain:

- `iss`: exact configured issuer.
- `aud`: configured chat API audience.
- `sub`: stable user ID within the tenant.
- `tenant_id`: stable company/tenant ID.
- `exp`, `iat`: use a 5–15 minute lifetime.
- `jti`: unique token identifier, required by default.
- Profile claims as available: `name`, `email`, `avatar`, `roles`, `permissions`, `organization`, `department`.
- `apps`: optional source-application allowlist. If absent, the issuer's configured `apps` is used.

Configure `CHAT_AUTH_ISSUERS` as shown in [the backend environment example](../chat_backend/.env.example). Issuer, audience, signature algorithm, signature, expiration, subject, tenant, JTI, and source app are validated for REST and WebSocket connections. Prefer RS256/ES256 with keys managed by the host identity platform. The registry abstraction is ready to be replaced with OIDC discovery/JWKS; SAML should terminate at an identity broker that emits this JWT contract.

Password login and registration are disabled unless `CHAT_ENABLE_PASSWORD_AUTH=true`. They are a development/transition path, not the embed integration.

### Replay and refresh

TLS, short token lifetime, non-persistent browser storage, and JTI are implemented foundations. For immediate revocation and refresh-token rotation across multiple servers, add a Redis-backed session/JTI denylist and a backend-for-frontend token exchange endpoint. Do not put refresh tokens in JavaScript or iframe URLs; keep them in an `HttpOnly`, `Secure`, `SameSite` host session.

## Integration

### JavaScript SDK

Serve `/chat-sdk.js` from the built frontend and initialize it after the host has authenticated its user:

```html
<div id="chat" style="height: 700px"></div>
<script src="https://chat.example.com/chat-sdk.js"></script>
<script>
  ChatSDK.init({
    token: shortLivedJwtFromHostBackend,
    appName: "ticket_portal",
    chatUrl: "https://chat.example.com",
    apiUrl: "https://chat-api.example.com",
    container: "#chat",
    mode: "container", // container, floating, drawer, modal, fullpage
    theme: "light"
  });
</script>
```

Methods: `open()`, `close()`, `logout()`, `setTheme(theme)`, `setLanguage(language)`, `sendMessage(chatId,text,options)`, `joinChannel(channelId)`, `leaveChannel(conversationId)`, `updateUser({token})`, and `destroy()`.

`updateUser` deliberately requires a newly signed token: a browser must not be able to mutate authoritative identity or permission claims.

### React

Import `src/sdk/ChatWidget.jsx` into a React host or publish that file as a small package:

```jsx
<ChatWidget
  token={token}
  appName="ticket_portal"
  chatUrl="https://chat.example.com"
  mode="drawer"
/>
```

The parent and iframe exchange the token through a source- and origin-checked `postMessage` handshake. Configure `VITE_CHAT_ALLOWED_PARENT_ORIGINS`; do not pass tokens in query strings. The old query-token bridge remains only for migration compatibility.

## Tenant and authorization rules

- Tenant scope always comes from the signed token.
- Source apps are checked against token or issuer allowlists.
- Conversation reads and writes require a tenant-scoped participant record.
- Socket conversation-room joins now perform the same membership check.
- Admin endpoints require an admin/superadmin role. The next RBAC increment should replace role-name checks with a centralized permission policy using signed claims plus tenant-scoped role assignments.
- Directory endpoints receive both `x-chat-app-name` and `x-chat-tenant-id`; they must enforce the same tenant and return only visible users.

## Current REST API

Every route below is available under versioned `/api/v1/chat` and compatibility alias `/chat-service`; all except the disabled legacy auth routes require a Bearer token. New integrations should use `/api/v1/chat`.

| Method and path | Purpose |
|---|---|
| `POST /auth/register`, `POST /auth/login` | Optional legacy password auth |
| `GET /me`, `PATCH /me/status`, `PATCH /me/avatar` | Current identity, presence, avatar |
| `GET /users`, `GET /users/:userId` | Directory and profile |
| `GET /roles`, `POST /roles` | Role administration |
| `GET /conversations` | Visible conversations and unread counts |
| `POST /conversations/direct/:userId` | Open direct conversation |
| `POST /conversations/groups` | Create group |
| `PATCH /conversations/:chatId` | Rename group |
| `POST /conversations/:chatId/members` | Add group members |
| `DELETE /conversations/:chatId/members/:userId` | Remove member |
| `POST /conversations/:chatId/leave` | Leave conversation/channel |
| `POST /conversations/:chatId/read` | Advance read receipt |
| `GET`, `POST /conversations/:chatId/messages` | Page/send messages |
| `PATCH /conversations/:chatId/messages/:messageId` | Edit a sent message |
| `PATCH /conversations/:chatId/messages/:messageId/pin` | Pin/unpin |
| `POST`, `DELETE /conversations/:chatId/messages/:messageId/reactions[/:emoji]` | Reactions |
| `POST /conversations/:chatId/files` | File-message metadata/upload stream |
| `POST /conversations/:chatId/calls` | Ring conversation participants |
| `POST /conversations/:chatId/calls/:callId/respond` | Accept or decline; body `{ "action": "accept" }` |
| `POST /conversations/:chatId/calls/:callId/end` | Cancel ringing or end accepted call |
| `POST /messages/direct/:userId`, `POST /messages/multiple`, `POST /messages/broadcast` | Direct/admin sends |
| `GET /messages/search` | Tenant/member-scoped search |
| `GET /groups` | Groups |
| `GET`, `POST /channels` | List/create channels |
| `POST /channels/:channelId/join` | Join allowed channel |
| `GET /admin/audit-logs` | Admin audit query |

Responses use `{status, success, message, data}`; failures add a stable `code`. Collection endpoints accept the query parameters documented in the backend README. Add `/v1` before breaking response or event contracts.

## Socket.IO events

Client emits `join:conversation(chatId, ack)` and `leave:conversation(chatId)`. Join acknowledgements return `{ok}` and an error code when denied. Server emits `message:new`, `message:updated`, `reaction:added`, `presence:update`, `avatar:update`, `call:ringing`, `call:accepted`, `call:declined`, `call:cancelled`, and `call:ended`. Payloads include `chatId` plus the relevant resource. Socket.IO supplies reconnect, ping/pong heartbeat, and transport fallback.

## UI components and modes

- `ChatSystem`: existing responsive application shell.
- `ChatSidebar`: directory, search, groups/channels, unread navigation.
- `ChatWindow`: messages, composer, uploads, reply/edit/forward/pin/reaction/call actions.
- `ChatLauncher`: existing floating launcher.
- `ChatWidget`: React iframe boundary.
- `chat-sdk.js`: framework-neutral iframe lifecycle and REST facade.

Container mode fills its parent. Floating, drawer, modal, and full-page layouts are applied by the SDK without forking the chat UI.

## In-app calls

Audio and video actions first persist a `ringing` call and notify every other
conversation participant. The recipient must accept or decline. Acceptance
marks the call as `accepted`, opens an in-app media panel, and uses Socket.IO to
relay WebRTC offer, answer, ICE candidate, join, and leave messages between
participants. No external meeting-platform integration or OAuth consent is
URL is used.

Call/provider state is stored in `chat_calls` with provider
`internal_webrtc`. Browser media permissions are requested only after a call is
accepted.

## Security and operations

Implemented: strict JWT verification, signed tenant scope, app allowlists, membership-checked sockets, bounded JSON/upload sizes, CORS allowlist, baseline CSP/security headers, HSTS in production, request IDs, rate limiting, non-persistent access-token storage, parameterized Sequelize access, audit records, and generic auth failures.

Production follow-ups:

1. Move rate limits, presence, Socket.IO pub/sub, refresh sessions, and JTI revocation to Redis.
2. Use an object-storage upload service with MIME sniffing, extension allowlists, antivirus quarantine, short signed URLs, thumbnails, and lifecycle policies. The current upload endpoint is not a complete malware-safe file pipeline.
3. Put API and UI behind HTTPS/CDN/WAF; configure exact CORS origins, `CHAT_FRAME_ANCESTORS`, and `VITE_CHAT_ALLOWED_PARENT_ORIGINS`.
4. Replace `sequelize.sync()` compatibility changes with versioned, reversible migrations before production rollout.
5. Add OIDC JWKS rotation, centralized permission policies, abuse signals, retention/legal hold, encrypted backups, and SIEM export.
6. Partition messages by tenant/time, add read replicas/search indexing, queues for notifications/media, and an outbox for reliable events before million-user scale. “Millions” requires load tests and capacity evidence, not an application-code promise.

## Migration sequence

1. Back up the database and deploy the code with password auth disabled.
2. Configure trusted issuers/audience/apps and exact web origins.
3. Update host backends to issue the claims above; test one non-production tenant.
4. Migrate existing `appName` data to stable tenant IDs. If several old app names belong to one company, resolve identity and direct-message collisions in a reviewed migration before merging rows.
5. Integrate via postMessage SDK/React widget; stop generating tokenized URLs.
6. Verify tenant-negative tests (Company A cannot enumerate/join/read Company B), role-negative tests, expiry, bad issuer/audience, and file limits.
7. Add Redis/shared infrastructure, load-test, then roll out tenant by tenant with audit monitoring and rollback checkpoints.
