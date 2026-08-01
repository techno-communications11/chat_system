# Deployment checklist

## Build and migrate

```bash
cd chat_backend
npm ci --omit=dev
npm run db:sync
npm start

cd ../chat_frontend
npm ci
npm run build
```

Serve `chat_frontend/dist` behind HTTPS and reverse-proxy the API and Socket.IO endpoint to the backend. WebSocket upgrade headers must be preserved.

## Required secrets and settings

- Configure production DB credentials, `SERVER_SECRETS`, trusted JWT issuers/audience, exact `CLIENT_URL`, `CHAT_FRAME_ANCESTORS`, and rate limits.
- Serve the frontend over HTTPS in production so browsers allow camera and microphone access.
- Run exactly one schema migration job per release before starting replicas.

## Call flow smoke test

1. Sign in as two users in the same tenant and direct conversation.
2. Caller selects audio or video; caller sees **waiting for an answer**.
3. Recipient sees the incoming-call dialog and browser notification even when another conversation is open.
4. Decline clears both clients and informs the caller.
5. Accept opens the in-app media panel for both users and connects local and remote streams.
6. Cancel/end clears both clients and persists the terminal call status.

The current in-memory rate limiter and Socket.IO process state support a single backend instance. Before horizontal scaling, use a Redis rate-limit store and the Socket.IO Redis adapter so user-room call events work across replicas.
