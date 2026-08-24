# Pingly Chat Backend

Standalone Node.js backend for Pingly Chat. It provides authenticated REST APIs, MySQL persistence through Sequelize, Socket.IO realtime delivery, WebRTC call signaling, conversations, groups, files, reactions, presence, settings, and audit logs.

## Requirements

- Node.js 20+
- MySQL 8+
- JWT issuer, or optional local password authentication
- AWS S3 for file/avatar uploads

## Install and run

~~~bash
npm install
copy .env.example .env
npm run db:sync
npm run dev
~~~

Default server: http://localhost:4701.

~~~bash
npm run dev
npm start
npm test
npm run db:sync
~~~

If port 4701 is busy on Windows:

~~~cmd
netstat -ano | findstr :4701
tasklist /FI "PID eq <PID>"
taskkill /PID <PID> /F
~~~

## Configuration

Copy .env.example to .env. Configure PORT, MySQL DB_* values, CLIENT_URL, JWT validation values, CHAT_ALLOWED_APPS, CHAT_ENABLE_PASSWORD_AUTH, AWS S3 values, and optional CHAT_PROVIDER_APP_USERS_URL values.

Never commit .env, JWT secrets, AWS credentials, or private keys.

## Database and IDs

Main tables include users, roles, identities, conversations, participants, groups, channels, messages, reactions, calls, and audit logs. Conversation and group public IDs are UUIDs; internal numeric IDs remain private.

## Authentication

Protected requests use:

~~~http
Authorization: Bearer <jwt>
x-chat-app-name: <application-name>
~~~

The router is available under both /chat-service/... and /api/v1/chat/....

Successful responses contain status, success, message, and data. Errors contain status, success, message, and code.

## API documentation

The complete endpoint reference is in docs/API.md.

Interactive OpenAPI documentation:

- http://localhost:4701/api-docs
- http://localhost:4701/api-docs.json

## Realtime and calls

Socket.IO authenticates with token and appName. Events cover messages, typing, reads, reactions, presence, avatars, call lifecycle, and WebRTC signaling. Conversation membership is checked before joining rooms.

Calls use browser WebRTC. Production requires HTTPS and usually a TURN server. Online/Away users can receive calls; Busy, Do Not Disturb, and Offline users do not ring and receive missed-call history. Messages remain deliverable in every status.

## Health and tests

~~~text
GET /ping
GET /api/v1/health
~~~

~~~bash
npm test
~~~

