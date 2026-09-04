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

import { MaterialCommunityIcons } from "@expo/vector-icons";

function ConversationList({
  user,
  conversations,
  onSelect,
  onLogout,
  refreshing,
  onRefresh,
  onNewChat,
  onProfile,
  onCalls,
  onMedia,
  onNotes,
  onScheduleMeet,
  onNotifications,
  onAdmin,
  presenceByUserId = {},
  darkTheme = false,
}) {
  const [query, setQuery] = useState("");
  const [conversationFilter, setConversationFilter] = useState("direct");
  const isAdmin =
    (user?.roles || []).some((role) =>
      ["admin", "superadmin"].includes(String(role).toLowerCase()),
    ) ||
    ["admin", "superadmin"].includes(String(user?.role || "").toLowerCase());
  const isGroupConversation = (item) =>
    ["group", "channel"].includes(
      String(
        item?.type || item?.conversationType || item?.conversation_type || "",
      ).toLowerCase(),
    );
  const getConversationStatus = (item) => {
    const directStatus = item?.presence || item?.status || item?.participant?.presence || item?.participant?.status;
    if (directStatus && !["active", "open"].includes(String(directStatus).toLowerCase())) return String(directStatus).toLowerCase();
    const otherParticipant = (item?.participants || []).find(
      (participant) => String(userIdOf(participant)) !== String(userIdOf(user)),
    );
    return String(presenceByUserId[String(userIdOf(otherParticipant))] || "offline").toLowerCase();
  };
  const filteredConversations = conversations.filter((item) => {
    if (conversationFilter === "groups" && !isGroupConversation(item))
      return false;
    if (conversationFilter === "direct" && isGroupConversation(item))
      return false;
    const value =
      `${titleOf(item)} ${item?.lastMessage?.text || item?.last_message?.text || ""}`.toLowerCase();
    return value.includes(query.trim().toLowerCase());
  });
  const directCount = conversations.filter(
    (item) => !isGroupConversation(item),
  ).length;
  const groupCount = conversations.filter(isGroupConversation).length;
  return (
    <>
      <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
        <StatusBar style={darkTheme ? "light" : "dark"} />
        <View style={styles.listSearchRow}>
          <View
            style={[
              styles.conversationSearchField,
              darkTheme && styles.darkInput,
            ]}
          >
            <MaterialCommunityIcons name="magnify" size={20} color="#888294" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search conversations"
              placeholderTextColor={darkTheme ? "#aaa2b3" : undefined}
              style={[styles.listSearchInput, darkTheme && styles.darkText]}
            />
          </View>
          <Pressable
            onPress={onProfile}
            accessibilityLabel="Profile"
            style={styles.headerProfileButton}
          >
            <Text style={styles.headerProfileText}>
              {(
                user?.displayName ||
                user?.display_name ||
                user?.name ||
                user?.email ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </Text>
          </Pressable>
        </View>
        <View
          style={[styles.conversationTabs, darkTheme && styles.darkSurface]}
        >
          {[
            ["direct", "Chats", directCount, "chat-outline"],
            ["groups", "Groups", groupCount, "account-group-outline"],
          ].map(([key, label, count, icon]) => (
            <Pressable
              key={key}
              onPress={() => setConversationFilter(key)}
              style={[
                styles.conversationTab,
                conversationFilter === key && styles.conversationTabActive,
                darkTheme &&
                  conversationFilter === key &&
                  styles.darkConversationTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: conversationFilter === key }}
            >
              <MaterialCommunityIcons
                name={icon}
                size={17}
                color={
                  conversationFilter === key
                    ? "#6f2da8"
                    : darkTheme
                      ? "#aaa2b3"
                      : "#777184"
                }
              />
              <Text
                style={[
                  styles.conversationTabText,
                  conversationFilter === key &&
                    styles.conversationTabTextActive,
                  darkTheme && styles.darkMuted,
                ]}
              >
                {label}
              </Text>
              <View
                style={[
                  styles.conversationTabCount,
                  conversationFilter === key &&
                    styles.conversationTabCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.conversationTabCountText,
                    conversationFilter === key &&
                      styles.conversationTabCountTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        <FlatList
          data={filteredConversations}
          keyExtractor={(item, index) => chatIdOf(item) || String(index)}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={
            filteredConversations.length
              ? styles.listContent
              : styles.emptyContent
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.conversationRow, darkTheme && styles.darkNoteRow]}
              onPress={() => onSelect(item)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {titleOf(item).charAt(0).toUpperCase()}
                </Text>
                {!isGroupConversation(item) && (() => { const status = getConversationStatus(item); const statusName = status === "dnd" ? "busy" : ["online", "away", "busy", "offline"].includes(status) ? status : "offline"; return <View style={[styles.presenceDot, darkTheme && styles.darkPresenceDot, styles[`presence${statusName.charAt(0).toUpperCase()}${statusName.slice(1)}`]]} />; })()}
              </View>
              <View style={styles.conversationCopy}>
                <Text
                  style={[
                    styles.conversationTitle,
                    darkTheme && styles.darkText,
                  ]}
                  numberOfLines={1}
                >
                  {titleOf(item)}
                </Text>
                <Text
                  style={[styles.mutedSmall, darkTheme && styles.darkMuted]}
                  numberOfLines={1}
                >
                  {item?.lastMessage?.text ||
                    item?.last_message?.text ||
                    "Open conversation"}
                </Text>
              </View>
              {(item?.unreadCount || item?.unread_count) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.unreadCount || item.unread_count}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[styles.muted, darkTheme && styles.darkMuted]}>
              {query
                ? "No matching conversations."
                : conversationFilter === "groups"
                  ? "No groups yet."
                  : "No direct conversations yet."}
            </Text>
          }
        />
        <Pressable
          style={styles.newChatFab}
          onPress={onNewChat}
          accessibilityLabel="New chat"
        >
          <MaterialCommunityIcons
            name="chat-plus-outline"
            size={27}
            color="#fff"
          />
        </Pressable>
        <View style={[styles.bottomNavbar, darkTheme && styles.darkSurface]}>
          <Pressable
            style={styles.bottomNavItem}
            onPress={onScheduleMeet}
            accessibilityLabel="Schedule a meet"
          >
            <MaterialCommunityIcons
              name="calendar-plus-outline"
              size={22}
              color="#777184"
            />
            <Text style={[styles.bottomNavLabel, darkTheme && styles.darkBottomNavLabel]}>Meet</Text>
          </Pressable>
          <Pressable
            style={styles.bottomNavItem}
            onPress={onCalls}
            accessibilityLabel="Calls history"
          >
            <MaterialCommunityIcons
              name="phone-outline"
              size={22}
              color="#777184"
            />
            <Text style={[styles.bottomNavLabel, darkTheme && styles.darkBottomNavLabel]}>Calls</Text>
          </Pressable>
          <Pressable
            style={styles.bottomNavItem}
            onPress={onMedia}
            accessibilityLabel="Media"
          >
            <MaterialCommunityIcons
              name="paperclip"
              size={22}
              color="#777184"
            />
            <Text style={[styles.bottomNavLabel, darkTheme && styles.darkBottomNavLabel]}>Media</Text>
          </Pressable>
          <Pressable
            style={styles.bottomNavItem}
            onPress={onNotes}
            accessibilityLabel="Notes"
          >
            <MaterialCommunityIcons
              name="note-text-outline"
              size={22}
              color="#777184"
            />
            <Text style={[styles.bottomNavLabel, darkTheme && styles.darkBottomNavLabel]}>Notes</Text>
          </Pressable>
          {isAdmin && (
            <Pressable
              style={styles.bottomNavItem}
              onPress={onAdmin}
              accessibilityLabel="Admin space"
            >
              <MaterialCommunityIcons
                name="shield-crown-outline"
                size={22}
                color="#777184"
              />
              <Text style={[styles.bottomNavLabel, darkTheme && styles.darkBottomNavLabel]}>Admin</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

export { ConversationList };
