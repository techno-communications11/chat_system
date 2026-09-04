# Pingly Chat Mobile

Expo/React Native Android client for the existing Pingly Chat backend.

## Run

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the deployed
   HTTPS backend URL. A phone cannot use the computer's `localhost` address.
2. Run `npm start`.
3. Scan the QR code with Expo Go, or use an Android emulator.

## Android build without local Java

Use Expo Application Services (EAS) to build the APK in the cloud:

~~~bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
~~~

The app UI is JavaScript/React Native. EAS performs the Android native build
remotely, so Java and Android Studio are not required on the development PC.
