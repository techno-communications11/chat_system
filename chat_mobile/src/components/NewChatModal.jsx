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

function NewChatModal({ token, visible, onClose, onOpen, darkTheme = false }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [channelMode, setChannelMode] = useState(false);
  const [channels, setChannels] = useState([]);
  const [title, setTitle] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visible) return;
    if (channelMode) {
      api
        .get("/chat-service/channels", requestOptions(token))
        .then((result) => {
          const data = dataOf(result);
          setChannels(
            data.channels || data.data || (Array.isArray(data) ? data : []),
          );
        })
        .catch(() => setChannels([]));
      return;
    }
    api
      .get("/chat-service/users", {
        ...requestOptions(token),
        params: { limit: 100, search: query.trim() || undefined },
      })
      .then((result) => {
        const data = dataOf(result);
        setUsers(data.users || data.data || (Array.isArray(data) ? data : []));
      })
      .catch(() => setUsers([]));
  }, [token, visible, query]);
  const toggleUser = (id) =>
    setSelectedUsers((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const create = async (person) => {
    setBusy(true);
    try {
      const result = groupMode
        ? await api.post(
            "/chat-service/conversations/groups",
            {
              title: title.trim() || "New group",
              userIds: selectedUsers,
            },
            requestOptions(token),
          )
        : await api.post(
            `/chat-service/conversations/direct/${encodeURIComponent(userIdOf(person))}`,
            {},
            requestOptions(token),
          );
      onOpen(dataOf(result).conversation || dataOf(result));
      onClose();
    } catch (error) {
      Alert.alert(
        "Unable to create chat",
        error?.response?.data?.message || error.message,
      );
    } finally {
      setBusy(false);
    }
  };
  const joinChannel = async (channel) => {
    try {
      const id = chatIdOf(channel);
      const result = await api.post(
        `/chat-service/channels/${encodeURIComponent(id)}/join`,
        {},
        requestOptions(token),
      );
      onOpen(dataOf(result).conversation || dataOf(result) || channel);
      onClose();
    } catch (error) {
      Alert.alert(
        "Unable to join channel",
        error?.response?.data?.message || error.message,
      );
    }
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
        <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}>
          <Text style={[styles.listTitle, darkTheme && styles.darkText]}>
            {groupMode ? "New group" : "New chat"}
          </Text>
          <Pressable onPress={onClose}>
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
        </View>
        <View style={[styles.modalTools, darkTheme && styles.darkSurface]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people"
            placeholderTextColor={darkTheme ? "#aaa2b3" : undefined}
            style={[
              styles.searchInput,
              darkTheme && styles.darkInput,
              darkTheme && styles.darkText,
            ]}
          />
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => {
                setChannelMode(false);
                setGroupMode(false);
              }}
            >
              <Text style={!channelMode ? styles.actionText : [styles.muted, darkTheme && styles.darkMuted]}>
                People
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setChannelMode(true);
                setGroupMode(false);
              }}
            >
              <Text style={channelMode ? styles.actionText : [styles.muted, darkTheme && styles.darkMuted]}>
                Channels
              </Text>
            </Pressable>
          </View>
          {!channelMode && (
            <>
              <View style={styles.modeRow}>
                <Text style={[styles.muted, darkTheme && styles.darkMuted]}>
                  Group chat
                </Text>
                <Switch value={groupMode} onValueChange={setGroupMode} />
              </View>
              {groupMode && (
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Group name"
                  style={styles.searchInput}
                />
              )}
            </>
          )}
        </View>
        {channelMode ? (
          <FlatList
            data={channels}
            keyExtractor={(item, index) => chatIdOf(item) || String(index)}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.userRow, darkTheme && styles.darkRow]}
                onPress={() => joinChannel(item)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>#</Text>
                </View>
                <View style={styles.conversationCopy}>
                  <Text
                    style={[
                      styles.conversationTitle,
                      darkTheme && styles.darkText,
                    ]}
                  >
                    {titleOf(item)}
                  </Text>
                    <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>Join channel</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, darkTheme && styles.darkEmptyText]}>No channels found.</Text>
            }
          />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item, index) => userIdOf(item) || String(index)}
            renderItem={({ item }) => {
              const id = userIdOf(item);
              const name =
                item.displayName ||
                item.display_name ||
                item.name ||
                item.email ||
                item.username ||
                "User";
              return (
                <Pressable
                  style={[styles.userRow, darkTheme && styles.darkRow]}
                  onPress={() => (groupMode ? toggleUser(id) : create(item))}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.conversationCopy}>
                    <Text
                      style={[
                        styles.conversationTitle,
                        darkTheme && styles.darkText,
                      ]}
                    >
                      {name}
                    </Text>
                    <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>
                      {item.email || item.username || "Chat user"}
                    </Text>
                  </View>
                  {groupMode && (
                    <Text style={styles.actionText}>
                      {selectedUsers.includes(id) ? "Selected" : "Add"}
                    </Text>
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, darkTheme && styles.darkEmptyText]}>No people found.</Text>
            }
          />
        )}
        {groupMode && (
          <Pressable
            style={[
              styles.primaryButton,
              (busy || selectedUsers.length === 0) && styles.disabled,
            ]}
            disabled={busy || selectedUsers.length === 0}
            onPress={() => create({})}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? "Creating..." : `Create group (${selectedUsers.length})`}
            </Text>
          </Pressable>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export { NewChatModal };
