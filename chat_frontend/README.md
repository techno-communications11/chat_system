# Pingly Chat Frontend

React/Vite frontend for Pingly Chat. It includes the persistent conversation sidebar, direct and group chats, settings, profile, notes, desktop notifications, calls, files, reactions, search, and realtime updates.

## Requirements

- Node.js 20+
- Running Pingly chat backend
- Browser support for WebSocket, Notification, and WebRTC

## Install and run

~~~bash
npm install
copy .env.example .env
npm run dev
~~~

Open http://localhost:5174/chat-app.

## Desktop and mobile builds

The React application can be packaged for desktop with Electron. The Android
application is maintained separately in `../chat_mobile` using Expo:

~~~bash
npm run desktop:build
npm run pwa:build
~~~

### JavaScript-only mobile installation

If an APK is not required, deploy the frontend over HTTPS and install it from
the browser menu using **Install app** or **Add to Home screen**. This PWA is
the JavaScript-only Android and desktop version; it does not require Java,
Android Studio, Gradle, or an APK build step.

~~~bash
npm run dev
npm run build
npm run preview
npm run lint
~~~

## Configuration

| Variable | Purpose |
| --- | --- |
| VITE_API_URL | Backend base URL, normally http://localhost:4701 |
| VITE_DEV_HTTPS | Enables local HTTPS |
| VITE_CHAT_ALLOWED_PARENT_ORIGINS | Allowed embedding origins |
| VITE_CHAT_STUN_SERVER | WebRTC STUN server |
| VITE_CHAT_TURN_URLS | Optional TURN servers |
| VITE_CHAT_TURN_USERNAME, VITE_CHAT_TURN_CREDENTIAL | TURN credentials |
| VITE_GOOGLE_CLIENT_ID | Optional Google Calendar client |

## Authentication

The app uses the existing auth/token integration and sends Authorization Bearer JWT and x-chat-app-name. Main route is /chat-app. Settings, notes, groups, files, and profile views preserve the conversation sidebar.

## Features

- UUID-backed direct and group conversations
- Realtime messages, typing, reads, reactions, presence, and avatars
- Audio/video calls using WebRTC and Socket.IO signaling
- Online, Away, Busy, Do Not Disturb, and Offline presence
- Desktop message/call notifications and note reminders
- Database-backed desktop-notification preference
- Profile/avatar management
- Account-scoped clear chat
- Group ownership transfer
- Files, call history, editing, pinning, deletion, and search

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API failure | Confirm VITE_API_URL and backend port 4701 |
| Socket failure | Restart backend and check /socket.io in browser Network tools |
| No notifications | Allow browser permission and enable Desktop notifications |
| Calls do not ring | Check recipient presence, socket, HTTPS/localhost, and media permissions |
| Avatar failure | Check S3 connectivity; small images use a database fallback |
| Old UI | Restart Vite or hard-refresh |

See ../chat_backend/docs/API.md or http://localhost:4701/api-docs.
