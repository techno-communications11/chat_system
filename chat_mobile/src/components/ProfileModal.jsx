import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
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
import { api, dataOf, requestOptions } from "../mobileConfig";
import { styles } from "../mobileStyles";

function ProfileModal({
  token,
  user,
  visible,
  onClose,
  onUserUpdated,
  onLogout,
  enterToSend = false,
  onEnterToSendChange,
  darkTheme: appDarkTheme = false,
  onThemeChange,
  onTestNotification,
}) {
  const [profile, setProfile] = useState(user || {});
  const [status, setStatus] = useState(
    user?.presence || user?.status || "online",
  );
  const [busy, setBusy] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkTheme, setDarkTheme] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [enterSetting, setEnterSetting] = useState(enterToSend);
  useEffect(() => {
    if (!visible) return;
    api
      .get("/chat-service/me/settings", requestOptions(token))
      .then((result) => {
        const saved = dataOf(result);
        setNotificationsEnabled(saved.desktopNotifications !== false);
        setDarkTheme((saved.themeMode || saved.theme) === "dark");
        setEnterSetting(saved.enterToSend === true);
      })
      .catch(() => {});
    api
      .get("/chat-service/me", requestOptions(token))
      .then((result) => {
        const next = dataOf(result).user || dataOf(result);
        setProfile(next);
        setDisplayName(
          next.displayName || next.display_name || next.name || "",
        );
        setStatus(next.presence || next.status || "online");
      })
      .catch(() => setProfile(user || {}));
  }, [token, user, visible]);
  const updateSetting = async (key, value) => {
    const next = {
      desktopNotifications: notificationsEnabled,
      themeMode: darkTheme ? "dark" : "light",
      enterToSend: enterSetting,
      [key]: value,
    };
    if (key === "desktopNotifications") setNotificationsEnabled(value);
    if (key === "themeMode") setDarkTheme(value === "dark");
    if (key === "themeMode") onThemeChange?.(value === "dark");
    if (key === "displayName") setDisplayName(value);
    if (key === "enterToSend") {
      setEnterSetting(value);
      onEnterToSendChange?.(value);
    }
    try {
      await api.patch("/chat-service/me/settings", next, requestOptions(token));
    } catch (error) {
      Alert.alert(
        "Unable to save setting",
        error?.response?.data?.message || error.message,
      );
    }
  };
  const saveProfile = async () => {
    const value = displayName.trim();
    if (!value) return;
    await updateSetting("displayName", value);
    const next = { ...profile, displayName: value, display_name: value };
    setProfile(next);
    onUserUpdated(next);
    Alert.alert("Profile updated", "Your display name was saved.");
  };
  const updateAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    try {
      const asset = result.assets[0];
      const body = await (await fetch(asset.uri)).blob();
      const response = await api.patch("/chat-service/me/avatar", body, {
        ...requestOptions(token),
        headers: {
          ...requestOptions(token).headers,
          "Content-Type": body.type || asset.mimeType || "image/jpeg",
          "x-file-content-type": body.type || asset.mimeType || "image/jpeg",
          "x-file-name": encodeURIComponent(asset.fileName || "avatar.jpg"),
          "x-file-size": String(body.size || 0),
        },
      });
      const next = dataOf(response).user || dataOf(response);
      setProfile((current) => ({ ...current, ...next }));
      onUserUpdated({ ...profile, ...next });
    } catch (error) {
      Alert.alert(
        "Unable to update photo",
        error?.response?.data?.message || error.message,
      );
    } finally {
      setBusy(false);
    }
  };
  const updateStatus = async (nextStatus) => {
    setBusy(true);
    try {
      await api.patch(
        "/chat-service/me/status",
        { presence: nextStatus },
        requestOptions(token),
      );
      setStatus(nextStatus);
      onUserUpdated({ ...profile, presence: nextStatus });
    } catch (error) {
      Alert.alert(
        "Unable to update status",
        error?.response?.data?.message || error.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.safe, (darkTheme || appDarkTheme) && styles.safeDark]}
      >
        <View
          style={[
            styles.modalHeader,
            (darkTheme || appDarkTheme) && styles.darkSurface,
          ]}
        >
          <Text style={[styles.listTitle, (darkTheme || appDarkTheme) && styles.darkText]}>Profile & Settings</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
        </View>
        <View
          style={[
            styles.profileCard,
            (darkTheme || appDarkTheme) && styles.darkSurface,
          ]}
        >
          <Pressable
            onPress={updateAvatar}
            disabled={busy}
            style={styles.profileAvatar}
          >
            {profile.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.profileAvatarImage}
              />
            ) : (
              <Text style={[styles.profileAvatarText, (darkTheme || appDarkTheme) && styles.darkText]}>
                {(
                  profile.displayName ||
                  profile.display_name ||
                  profile.name ||
                  profile.email ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            )}
          </Pressable>
          <TextInput
            value={
              displayName ||
              profile.displayName ||
              profile.display_name ||
              profile.name ||
              ""
            }
            onChangeText={setDisplayName}
            placeholder="Display name"
            style={[styles.profileNameInput, (darkTheme || appDarkTheme) && styles.darkInput, (darkTheme || appDarkTheme) && styles.darkText]}
          />
          <Text style={[styles.muted, (darkTheme || appDarkTheme) && styles.darkMuted]}>
            {profile.email || profile.username || ""}
          </Text>
          <Pressable
            style={styles.saveProfileButton}
            onPress={saveProfile}
            disabled={busy}
          >
            <Text style={styles.saveProfileText}>Update profile</Text>
          </Pressable>
          <Text style={[styles.statusHeading, (darkTheme || appDarkTheme) && styles.darkText]}>Presence</Text>
          <View style={styles.statusOptions}>
            {["online", "away", "busy", "offline"].map((item) => (
              <Pressable
                key={item}
                disabled={busy}
                onPress={() => updateStatus(item)}
                style={[
                  styles.statusOption,
                  status === item && styles.statusOptionActive,
                ]}
              >
                <Text
                  style={
                    status === item
                      ? styles.statusOptionTextActive
                      : [styles.statusOptionText, (darkTheme || appDarkTheme) && styles.darkText]
                  }
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View
          style={[
            styles.settingRow,
            (darkTheme || appDarkTheme) && styles.darkSurface,
          ]}
        >
          <Text
            style={[
              styles.settingLabel,
              (darkTheme || appDarkTheme) && styles.darkText,
            ]}
          >
            Enable notifications
          </Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) =>
              updateSetting("desktopNotifications", value)
            }
          />
        </View>
        <View
          style={[
            styles.settingRow,
            (darkTheme || appDarkTheme) && styles.darkSurface,
          ]}
        >
          <Text
            style={[
              styles.settingLabel,
              (darkTheme || appDarkTheme) && styles.darkText,
            ]}
          >
            Dark theme
          </Text>
          <Switch
            value={darkTheme}
            onValueChange={(value) =>
              updateSetting("themeMode", value ? "dark" : "light")
            }
          />
        </View>
        <View
          style={[
            styles.settingRow,
            (darkTheme || appDarkTheme) && styles.darkSurface,
          ]}
        >
          <Text
            style={[
              styles.settingLabel,
              (darkTheme || appDarkTheme) && styles.darkText,
            ]}
          >
            Enter to send
          </Text>
          <Switch
            value={enterSetting}
            onValueChange={(value) => updateSetting("enterToSend", value)}
          />
        </View>
        <Pressable
          style={styles.testNotificationButton}
          onPress={onTestNotification}
        >
          <Text style={styles.actionText}>Test notification</Text>
        </Pressable>
        <Pressable
          style={styles.settingsLogoutButton}
          onPress={() => {
            onClose();
            onLogout?.();
          }}
        >
          <Text style={styles.settingsLogoutText}>Log out</Text>
        </Pressable>
        <Text style={[styles.muted, (darkTheme || appDarkTheme) && styles.darkMuted]}>
          Tap your avatar to update your profile photo.
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

export { ProfileModal };
