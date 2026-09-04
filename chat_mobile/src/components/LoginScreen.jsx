import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { io } from "socket.io-client";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  API_URL,
  APP_NAME,
  TOKEN_KEY,
  USER_KEY,
  api,
  dataOf,
  chatIdOf,
  titleOf,
  textOf,
  idOf,
  authHeaders,
  requestOptions,
  messageIdOf,
  userIdOf,
} from "../mobileConfig";
import { styles } from "../mobileStyles";

import { Brand } from "./Brand";

function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!login.trim() || !password) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.post("/chat-service/auth/login", {
        login: login.trim(),
        password,
        appName: APP_NAME,
      });
      const data = dataOf(result);
      const token = data.accessToken || data.token;
      if (!token) throw new Error("Login did not return an access token.");
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [USER_KEY, JSON.stringify(data.user || {})],
      ]);
      onLogin(token, data.user || {});
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError.message ||
          "Unable to sign in.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.centered}
      >
        <Brand />
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.muted}>
          Sign in to continue to your conversations.
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email or username"
          value={login}
          onChangeText={setLogin}
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          onSubmitEditing={submit}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[
            styles.primaryButton,
            (!login.trim() || !password || busy) && styles.disabled,
          ]}
          onPress={submit}
          disabled={!login.trim() || !password || busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign in</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export { LoginScreen };
