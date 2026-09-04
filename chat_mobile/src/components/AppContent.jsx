import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { io } from "socket.io-client";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
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

import { LoginScreen } from "./LoginScreen";
import { NewChatModal } from "./NewChatModal";
import { ProfileModal } from "./ProfileModal";
import { ConversationList } from "./ConversationList";
import { ChatScreen } from "./ChatScreen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NotesModal } from "./NotesModal";
import { AdminModal } from "./AdminModal";
import { RealtimeNotificationModal } from "./RealtimeNotificationModal";
import { ScheduleMeetModal } from "./ScheduleMeetModal";

const scheduleMobileNotification = async ({
  title,
  body,
  data = {},
  trigger = null,
}) => {
  if (Constants.appOwnership === "expo") return false;
  const module = await import("expo-notifications");
  const Notifications = module.default || module;
  if (Platform.OS === "android" && Notifications.setNotificationChannelAsync) {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance?.HIGH || 4,
      sound: "default",
    });
  }
  const permissions = await Notifications.getPermissionsAsync?.();
  if (permissions?.status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync?.();
    if (requested?.status !== "granted") return false;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: "default" },
    trigger,
  });
  return true;
};

const attachmentsOf = (message) => {
  const metadata = message?.metadata || {};
  const content = message?.content || {};
  const files = [
    metadata.file,
    metadata.attachment,
    content.file,
    content.attachment,
    ...(Array.isArray(metadata.files) ? metadata.files : []),
    ...(Array.isArray(metadata.attachments) ? metadata.attachments : []),
    ...(Array.isArray(content.files) ? content.files : []),
    ...(Array.isArray(content.attachments) ? content.attachments : []),
  ].filter(Boolean);
  if (metadata.type === "file" && files.length === 0) files.push(metadata);
  return files.map((file, index) => ({
    ...file,
    id: file.id || file.key || file.url || `${file.name || "file"}-${index}`,
    name:
      file.name ||
      file.fileName ||
      file.file_name ||
      file.originalName ||
      "Document",
    url:
      file.url ||
      file.fileUrl ||
      file.file_url ||
      file.downloadUrl ||
      file.download_url ||
      file.publicUrl ||
      file.public_url ||
      "",
    contentType:
      file.contentType ||
      file.content_type ||
      file.mimeType ||
      file.mime_type ||
      metadata.contentType ||
      "",
  }));
};

function AppContent() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [callsOpen, setCallsOpen] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [enterToSend, setEnterToSend] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [notification, setNotification] = useState(null);
  const [presenceByUserId, setPresenceByUserId] = useState({});
  const [scheduleMeetOpen, setScheduleMeetOpen] = useState(false);
  const selectedRef = useRef(null);
  const conversationsRef = useRef([]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    if (!token) return;
    api
      .get("/chat-service/me/settings", requestOptions(token))
      .then((result) => {
        const settings = dataOf(result);
        setEnterToSend(settings.enterToSend === true);
        setDarkTheme((settings.themeMode || settings.theme) === "dark");
      })
      .catch(() => {});
  }, [token]);
  useEffect(() => {
    if (Constants.appOwnership === "expo") return;
    import("expo-notifications")
      .then(
        async ({
          default: Notifications,
          requestPermissionsAsync,
          setNotificationHandler,
          setNotificationChannelAsync,
          AndroidImportance,
        }) => {
          if (setNotificationHandler)
            setNotificationHandler({
              handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
              }),
            });
          if (Platform.OS === "android" && setNotificationChannelAsync)
            await setNotificationChannelAsync("messages", {
              name: "Messages",
              importance: AndroidImportance?.HIGH || 4,
              sound: "default",
            });
          await requestPermissionsAsync?.();
        },
      )
      .catch(() => {});
  }, []);
  const loadConversations = useCallback(
    async (accessToken = token, isRefresh = false) => {
      if (!accessToken) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const result = await api.get("/chat-service/conversations", {
          headers: authHeaders(accessToken),
        });
        const data = dataOf(result);
        setConversations(
          data.conversations || data.data || (Array.isArray(data) ? data : []),
        );
      } catch {
        setConversations([]);
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [token],
  );
  useEffect(() => {
    AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]).then((values) => {
      const savedToken = values[0][1];
      if (savedToken) {
        setToken(savedToken);
        setUser(values[1][1] ? JSON.parse(values[1][1]) : {});
      } else setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (token) loadConversations(token);
  }, [token, loadConversations]);
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(API_URL, {
      auth: { token, appName: APP_NAME },
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 15000,
    });
    socket.on("connect", () =>
      setNotification((current) =>
        current?.title === "Realtime connection problem" ? null : current,
      ),
    );
    socket.on("connect_error", (socketError) =>
      setNotification({
        title: "Realtime connection problem",
        body: `${socketError?.message || "Unable to connect"}. API: ${API_URL}`,
      }),
    );
    socket.on("presence:update", (payload) => {
      const presenceUser = payload?.user || {};
      const presenceUserId = payload?.userId || payload?.user_id || presenceUser.id || presenceUser.userId || presenceUser.user_id || presenceUser.appUserId || presenceUser.app_user_id;
      if (!presenceUserId) return;
      setPresenceByUserId((current) => ({
        ...current,
        [String(presenceUserId)]: payload?.presence || payload?.status || presenceUser.presence || presenceUser.status || "offline",
      }));
    });
    socket.on("message:new", (payload) => {
      const message = payload?.message;
      if (!message) return;
      const senderId = userIdOf(message?.sender || message);
      if (senderId && senderId === userIdOf(user)) return;
      const incomingChatId = String(
        payload?.chatId || payload?.chat_id || chatIdOf(message),
      );
      if (String(chatIdOf(selectedRef.current)) === incomingChatId) return;
      const conversation = conversationsRef.current.find(
        (item) => String(chatIdOf(item)) === incomingChatId,
      );
      setNotification({
        title: titleOf(conversation) || "New message",
        body: textOf(message) || "New attachment",
        chat: conversation,
      });
      loadConversations(token, true);
      if (Constants.appOwnership !== "expo") {
        scheduleMobileNotification({
          title: titleOf(conversation) || "New message",
          body: textOf(message) || "New attachment",
          data: { chatId: incomingChatId },
        }).catch(() => {});
      }
    });
    return () => socket.disconnect();
  }, [token, user, loadConversations]);
  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
    setSelected(null);
    setConversations([]);
  };
  const openCalls = async () => {
    setCallsOpen(true);
    setCallsLoading(true);
    try {
      const result = await api.get("/chat-service/messages/search", {
        ...requestOptions(token),
        params: { type: "calls", limit: 100 },
      });
      const data = dataOf(result);
      setCallHistory(
        data.messages || data.data || (Array.isArray(data) ? data : []),
      );
    } catch (requestError) {
      setCallHistory([]);
      Alert.alert(
        "Calls",
        requestError?.response?.data?.message || "Unable to load call history.",
      );
    } finally {
      setCallsLoading(false);
    }
  };
  const openMedia = async () => {
    setMediaOpen(true);
    setMediaLoading(true);
    try {
      const result = await api.get("/chat-service/messages/search", {
        ...requestOptions(token),
        params: { type: "calls_media", limit: 100 },
      });
      const data = dataOf(result);
      const messages =
        data.messages || data.data || (Array.isArray(data) ? data : []);
      setMediaItems(
        messages.flatMap((message) =>
          attachmentsOf(message).map((file) => ({ ...file, message })),
        ),
      );
    } catch (requestError) {
      setMediaItems([]);
      Alert.alert(
        "Media",
        requestError?.response?.data?.message || "Unable to load media.",
      );
    } finally {
      setMediaLoading(false);
    }
  };
  if (!token)
    return (
      <LoginScreen
        onLogin={(accessToken, loggedInUser) => {
          setToken(accessToken);
          setUser(loggedInUser);
        }}
      />
    );
  if (loading)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color="#6f2da8" />
        </View>
      </SafeAreaView>
    );
  if (selected)
    return (
      <>
        <ChatScreen
          token={token}
          user={user}
          chat={selected}
          conversations={conversations}
          darkTheme={darkTheme}
          enterToSend={enterToSend}
          onBack={() => {
            setSelected(null);
            loadConversations(token, true);
          }}
        />
        <RealtimeNotificationModal
          notification={notification}
          darkTheme={darkTheme}
          onClose={() => setNotification(null)}
          onOpen={setSelected}
        />
      </>
    );
  return (
    <>
      <ConversationList
        user={user}
        darkTheme={darkTheme}
        conversations={conversations}
        onSelect={setSelected}
        onLogout={logout}
        refreshing={refreshing}
        onRefresh={() => loadConversations(token, true)}
        onNewChat={() => setNewChatOpen(true)}
        onScheduleMeet={() => setScheduleMeetOpen(true)}
        onProfile={() => setProfileOpen(true)}
        onCalls={openCalls}
        onMedia={openMedia}
        onNotes={() => setNotesOpen(true)}
        onNotifications={() =>
          Alert.alert(
            "Notifications",
            "In-app notifications are available in standalone/development builds. Expo Go does not support Android remote push notifications.",
          )
        }
        onAdmin={() => setAdminOpen(true)}
        presenceByUserId={presenceByUserId}
      />
      <NewChatModal
        token={token}
        visible={newChatOpen}
        darkTheme={darkTheme}
        onClose={() => setNewChatOpen(false)}
        onOpen={(conversation) => {
          setSelected(conversation);
          loadConversations(token, true);
        }}
      />
      <ScheduleMeetModal
        visible={scheduleMeetOpen}
        darkTheme={darkTheme}
        conversations={conversations}
        onClose={() => setScheduleMeetOpen(false)}
        onSchedule={({ title, start }) =>
          scheduleMobileNotification({
            title: "Meet reminder",
            body: title,
            trigger: start,
          })
        }
      />
      <ProfileModal
        token={token}
        user={user}
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onUserUpdated={(nextUser) => {
          setUser(nextUser);
          AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        }}
        enterToSend={enterToSend}
        onEnterToSendChange={setEnterToSend}
        darkTheme={darkTheme}
        onThemeChange={setDarkTheme}
        onTestNotification={() => {
          const test = {
            title: "Pingly Chat",
            body: "This is a mobile notification test.",
          };
          setNotification(test);
          scheduleMobileNotification(test).catch(() => {});
        }}
        onLogout={logout}
      />
      <Modal
        visible={callsOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCallsOpen(false)}
      >
        <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
          <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}>
            <View>
              <Text style={[styles.listTitle, darkTheme && styles.darkText]}>
                Calls
              </Text>
              <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>
                Your conversation call history
              </Text>
            </View>
            <Pressable onPress={() => setCallsOpen(false)}>
              <Text style={styles.actionText}>Close</Text>
            </Pressable>
          </View>
          {callsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#6f2da8" />
            </View>
          ) : (
            <FlatList
              data={callHistory}
              keyExtractor={(item, index) => `${idOf(item, index)}`}
              contentContainerStyle={
                callHistory.length ? styles.listContent : styles.emptyContent
              }
              renderItem={({ item }) => {
                const call =
                  item?.metadata?.callHistory ||
                  item?.metadata?.call_history ||
                  {};
                const chatId = chatIdOf(item);
                const conversation = conversations.find(
                  (entry) => chatIdOf(entry) === String(chatId),
                );
                const missed = ["missed", "cancelled", "failed"].includes(
                  String(call.status || "").toLowerCase(),
                );
                return (
                  <Pressable
                    style={[styles.callHistoryRow, darkTheme && styles.darkRow]}
                    onPress={() => {
                      if (conversation) {
                        setCallsOpen(false);
                        setSelected(conversation);
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        call.type === "video"
                          ? "video-outline"
                          : "phone-outline"
                      }
                      size={25}
                      color={missed ? "#c62828" : "#6f2da8"}
                    />
                    <View style={styles.conversationCopy}>
                      <Text
                        style={[
                          styles.conversationTitle,
                          missed && styles.callMissed,
                          darkTheme && styles.darkText,
                        ]}
                      >
                        {textOf(item) ||
                          `${call.type === "video" ? "Video" : "Voice"} call`}
                      </Text>
                      <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>
                        {item?.createdAt || item?.timestamp || ""}
                        {call.durationSeconds
                          ? ` · ${call.durationSeconds}s`
                          : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.muted, darkTheme && styles.darkMuted]}>No call history yet.</Text>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
      <Modal
        visible={mediaOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMediaOpen(false)}
      >
        <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
          <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}>
            <View>
              <Text style={[styles.listTitle, darkTheme && styles.darkText]}>
                Media
              </Text>
              <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>
                Shared across your conversations
              </Text>
            </View>
            <Pressable onPress={() => setMediaOpen(false)}>
              <Text style={styles.actionText}>Close</Text>
            </Pressable>
          </View>
          {mediaLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#6f2da8" />
            </View>
          ) : (
            <FlatList
              data={mediaItems}
              numColumns={2}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              contentContainerStyle={
                mediaItems.length ? styles.listContent : styles.emptyContent
              }
              renderItem={({ item }) => {
                const isImage =
                  String(item.contentType).startsWith("image/") ||
                  /\.(png|jpe?g|gif|webp|bmp)$/i.test(item.name);
                return (
                  <Pressable
                    style={[styles.mediaGridItem, darkTheme && styles.darkCard]}
                    onPress={() =>
                      item.url && Share.share({ message: item.url })
                    }
                  >
                    {isImage && item.url ? (
                      <Image
                        source={{ uri: item.url }}
                        style={styles.globalMediaImage}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="file-outline"
                        size={34}
                        color="#6f2da8"
                      />
                    )}
                    <Text style={[styles.mediaItemName, darkTheme && styles.darkText]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>
                      {titleOf(item.message)}
                    </Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.muted, darkTheme && styles.darkMuted]}>No media shared yet.</Text>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
      <NotesModal
        tokenUser={user}
        visible={notesOpen}
        darkTheme={darkTheme}
        onClose={() => setNotesOpen(false)}
      />
      <AdminModal
        token={token}
        visible={adminOpen}
        darkTheme={darkTheme}
        onClose={() => setAdminOpen(false)}
      />
      <RealtimeNotificationModal
        notification={notification}
        darkTheme={darkTheme}
        onClose={() => setNotification(null)}
        onOpen={setSelected}
      />
    </>
  );
}

export { AppContent };
