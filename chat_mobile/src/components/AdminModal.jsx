import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api, dataOf, requestOptions } from "../mobileConfig";
import { styles } from "../mobileStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const roles = ["member", "admin", "superadmin"];
const emptyForm = {
  displayName: "",
  email: "",
  username: "",
  password: "",
  roleName: "member",
  designation: "",
  marketBackoffice: "",
  manager: "",
};
const getValue = (user, ...keys) =>
  keys
    .map((key) => user?.[key])
    .find((value) => value !== undefined && value !== null) || "";

function AdminModal({ token, visible, onClose, darkTheme = false }) {
  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    disabled: 0,
    admins: 0,
  });
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newPassword, setNewPassword] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboard, userResult] = await Promise.all([
        api.get("/chat-service/admin/dashboard", requestOptions(token)),
        api.get("/chat-service/admin/users", {
          ...requestOptions(token),
          params: { search: query.trim() || undefined, page: 1, limit: 50 },
        }),
      ]);
      setStats(dataOf(dashboard));
      const data = dataOf(userResult);
      setUsers(data.users || data.data || (Array.isArray(data) ? data : []));
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to load admin data.",
      );
    } finally {
      setLoading(false);
    }
  }, [query, token]);
  useEffect(() => {
    if (visible) load();
  }, [visible, load]);
  const createUser = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/chat-service/admin/users", form, requestOptions(token));
      setForm(emptyForm);
      setNotice("User created successfully.");
      setTab("users");
      await load();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to create user.",
      );
    } finally {
      setSaving(false);
    }
  };
  const openUser = async (user) => {
    setSelectedUser(user);
    setEditForm({
      displayName: getValue(user, "name", "displayName"),
      email: getValue(user, "email"),
      username: getValue(user, "username"),
      designation: getValue(user, "designation"),
      marketBackoffice: getValue(
        user,
        "marketBackoffice",
        "market",
        "backoffice",
      ),
      manager: getValue(user, "managerName", "manager"),
      roleName: getValue(user, "role") || "member",
      status: getValue(user, "status") || "active",
    });
    try {
      const result = await api.get(
        `/chat-service/admin/users/${encodeURIComponent(user.id)}`,
        requestOptions(token),
      );
      const details = dataOf(result);
      setSelectedUser(details);
      setEditForm((current) => ({
        ...current,
        displayName:
          getValue(details, "name", "displayName") || current.displayName,
        email: getValue(details, "email") || current.email,
        username: getValue(details, "username") || current.username,
        designation: getValue(details, "designation") || current.designation,
        marketBackoffice:
          getValue(details, "marketBackoffice", "market", "backoffice") ||
          current.marketBackoffice,
        manager: getValue(details, "managerName", "manager") || current.manager,
        roleName: getValue(details, "role") || current.roleName,
        status: getValue(details, "status") || current.status,
      }));
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to load user details.",
      );
    }
  };
  const updateUser = async () => {
    setSaving(true);
    try {
      const result = await api.patch(
        `/chat-service/admin/users/${encodeURIComponent(selectedUser.id)}`,
        editForm,
        requestOptions(token),
      );
      setSelectedUser(dataOf(result));
      setNotice("User updated successfully.");
      await load();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to update user.",
      );
    } finally {
      setSaving(false);
    }
  };
  const changeStatus = async (user) => {
    setSaving(true);
    try {
      await api.patch(
        `/chat-service/admin/users/${encodeURIComponent(user.id)}`,
        { status: user.status === "active" ? "disabled" : "active" },
        requestOptions(token),
      );
      setNotice(
        user.status === "active" ? "User restricted." : "User restored.",
      );
      await load();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to update status.",
      );
    } finally {
      setSaving(false);
    }
  };
  const changePassword = async () => {
    if (!selectedUser || newPassword.length < 8) return;
    setSaving(true);
    try {
      await api.patch(
        `/chat-service/admin/users/${encodeURIComponent(selectedUser.id)}/password`,
        { password: newPassword },
        requestOptions(token),
      );
      setNewPassword("");
      setNotice("Password changed successfully.");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to change password.",
      );
    } finally {
      setSaving(false);
    }
  };
  const uploadBulk = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/comma-separated-values"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    setSaving(true);
    try {
      const csv = await (await fetch(picked.assets[0].uri)).text();
      const [header, ...rows] = csv
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const headers = header.split(",").map((item) => item.trim());
      const imported = rows.map((line) =>
        headers.reduce(
          (record, key, index) => ({
            ...record,
            [key]: (line.split(",")[index] || "").trim().replace(/^"|"$/g, ""),
          }),
          {},
        ),
      );
      await api.post(
        "/chat-service/admin/users/bulk",
        { users: imported },
        requestOptions(token),
      );
      setNotice(`${imported.length} user(s) imported.`);
      setTab("users");
      await load();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to import CSV.",
      );
    } finally {
      setSaving(false);
    }
  };
  const setFormValue = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
        <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}>
          <View style={styles.adminHeaderTitle}>
            <MaterialCommunityIcons
              name="shield-crown-outline"
              size={25}
              color="#6f2da8"
            />
            <View>
              <Text style={[styles.listTitle, darkTheme && styles.darkText]}>
                Admin space
              </Text>
              <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>Manage users and access</Text>
            </View>
          </View>
          <Pressable onPress={onClose}>
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
        </View>
        <View style={styles.adminStats}>
          {[
            [stats.total, "Total"],
            [stats.active, "Active"],
            [stats.disabled, "Restricted"],
            [stats.admins, "Admins"],
          ].map(([value, label]) => (
            <View
              key={label}
              style={[styles.adminStat, darkTheme && styles.darkCard]}
            >
              <Text style={styles.adminStatValue}>{value || 0}</Text>
              <Text style={[styles.adminStatLabel, darkTheme && styles.darkMuted]}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.adminTabs}>
          {[
            ["users", "Users"],
            ["create", "Create user"],
            ["bulk", "Bulk upload"],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              style={[styles.adminTab, tab === value && styles.adminTabActive]}
            >
              <Text
                style={[
                  styles.adminTabText,
                  darkTheme && styles.darkMuted,
                  tab === value && styles.adminTabTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {!!error && (
          <View style={styles.adminError}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => setError("")}>
              <Text style={styles.actionText}>Dismiss</Text>
            </Pressable>
          </View>
        )}
        {!!notice && (
          <Pressable style={styles.adminNotice} onPress={() => setNotice("")}>
            <Text style={styles.adminNoticeText}>{notice}</Text>
          </Pressable>
        )}
        {tab === "users" && (
          <>
            <View style={[styles.adminSearch, darkTheme && styles.darkInput]}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color="#888294"
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search users"
                placeholderTextColor={darkTheme ? "#aaa2b3" : undefined}
                style={[styles.adminSearchInput, darkTheme && styles.darkText]}
              />
            </View>
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color="#6f2da8" />
              </View>
            ) : (
              <FlatList
                data={users}
                keyExtractor={(item, index) => String(item.id || index)}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.adminUserRow,
                      darkTheme && styles.darkNoteRow,
                    ]}
                  >
                    <View style={styles.adminUserAvatar}>
                      <Text style={styles.avatarText}>
                        {String(
                          item.name || item.displayName || item.email || "U",
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.conversationCopy}>
                      <Text
                        style={[
                          styles.conversationTitle,
                          darkTheme && styles.darkText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.name || item.displayName || item.email || "User"}
                      </Text>
                      <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>
                        {item.email || item.username || "No email"}
                      </Text>
                      <Text style={[styles.adminStatus, darkTheme && styles.darkMuted]}>
                        {item.role || "member"} · {item.status || "active"}
                      </Text>
                    </View>
                    <View style={styles.adminRowActions}>
                      <Pressable onPress={() => openUser(item)}>
                        <Text style={styles.actionText}>Details</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => changeStatus(item)}
                        disabled={saving}
                      >
                        <Text
                          style={
                            item.status === "active"
                              ? styles.adminRestrictText
                              : styles.actionText
                          }
                        >
                          {item.status === "active" ? "Restrict" : "Restore"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, darkTheme && styles.darkEmptyText]}>No users found.</Text>
                }
              />
            )}
          </>
        )}
        {tab === "create" && (
          <ScrollView contentContainerStyle={styles.adminForm}>
            <Text
              style={[styles.adminSectionTitle, darkTheme && styles.darkText]}
            >
              Register a user
            </Text>
            {Object.entries({
              displayName: "Display name",
              email: "Email",
              username: "Username",
              password: "Temporary password",
              designation: "Designation (optional)",
              marketBackoffice: "Market / Backoffice (optional)",
              manager: "Manager (optional)",
            }).map(([key, label]) => (
              <TextInput
                key={key}
                value={form[key]}
                onChangeText={(value) => setFormValue(key, value)}
                placeholder={label}
                placeholderTextColor="#aaa2b3"
                secureTextEntry={key === "password"}
                style={[
                  styles.adminFormInput,
                  darkTheme && styles.darkInput,
                  darkTheme && styles.darkText,
                ]}
              />
            ))}
            <Text style={styles.adminFieldLabel}>Role</Text>
            <View style={styles.adminRoleRow}>
              {roles.map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setFormValue("roleName", role)}
                  style={[
                    styles.statusOption,
                    form.roleName === role && styles.statusOptionActive,
                  ]}
                >
                  <Text
                    style={
                      form.roleName === role
                        ? styles.statusOptionTextActive
                        : styles.statusOptionText
                    }
                  >
                    {role}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.noteSaveButton}
              disabled={saving}
              onPress={createUser}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Creating..." : "Create user"}
              </Text>
            </Pressable>
          </ScrollView>
        )}
        {tab === "bulk" && (
          <View style={styles.adminBulk}>
            <MaterialCommunityIcons
              name="file-upload-outline"
              size={52}
              color="#6f2da8"
            />
            <Text
              style={[styles.adminSectionTitle, darkTheme && styles.darkText]}
            >
              Bulk register users
            </Text>
            <Text style={styles.muted}>
              CSV: email, username, displayName, password, roleName,
              designation, marketBackoffice, manager
            </Text>
            <Pressable
              style={styles.noteSaveButton}
              disabled={saving}
              onPress={uploadBulk}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Importing..." : "Choose CSV file"}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
      <Modal
        visible={Boolean(selectedUser)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.adminDetailCard, darkTheme && styles.darkCard]}>
            <ScrollView>
              <Text style={[styles.listTitle, darkTheme && styles.darkText]}>
                Edit user
              </Text>
              {[
                ["displayName", "Display name"],
                ["email", "Email"],
                ["username", "Username"],
                ["designation", "Designation"],
                ["marketBackoffice", "Market / Backoffice"],
                ["manager", "Manager"],
              ].map(([key, label]) => (
                <TextInput
                  key={key}
                  value={editForm[key] || ""}
                  onChangeText={(value) =>
                    setEditForm((current) => ({ ...current, [key]: value }))
                  }
                  placeholder={label}
                  placeholderTextColor="#aaa2b3"
                  style={[
                    styles.adminFormInput,
                    darkTheme && styles.darkInput,
                    darkTheme && styles.darkText,
                  ]}
                />
              ))}
              <Text style={styles.adminFieldLabel}>Role</Text>
              <View style={styles.adminRoleRow}>
                {roles.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() =>
                      setEditForm((current) => ({ ...current, roleName: role }))
                    }
                    style={[
                      styles.statusOption,
                      editForm.roleName === role && styles.statusOptionActive,
                    ]}
                  >
                    <Text
                      style={
                        editForm.roleName === role
                          ? styles.statusOptionTextActive
                          : styles.statusOptionText
                      }
                    >
                      {role}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.adminFieldLabel}>Status</Text>
              <View style={styles.adminRoleRow}>
                {["active", "disabled"].map((status) => (
                  <Pressable
                    key={status}
                    onPress={() =>
                      setEditForm((current) => ({ ...current, status }))
                    }
                    style={[
                      styles.statusOption,
                      editForm.status === status && styles.statusOptionActive,
                    ]}
                  >
                    <Text
                      style={
                        editForm.status === status
                          ? styles.statusOptionTextActive
                          : styles.statusOptionText
                      }
                    >
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={styles.noteSaveButton}
                disabled={saving}
                onPress={updateUser}
              >
                <Text style={styles.primaryButtonText}>Save user details</Text>
              </Pressable>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password (8+ characters)"
                placeholderTextColor="#aaa2b3"
                secureTextEntry
                style={[
                  styles.adminFormInput,
                  darkTheme && styles.darkInput,
                  darkTheme && styles.darkText,
                ]}
              />
              <Pressable
                style={[
                  styles.noteSaveButton,
                  newPassword.length < 8 && styles.disabled,
                ]}
                disabled={saving || newPassword.length < 8}
                onPress={changePassword}
              >
                <Text style={styles.primaryButtonText}>Change password</Text>
              </Pressable>
              <Pressable
                style={styles.noteCancelButton}
                onPress={() => setSelectedUser(null)}
              >
                <Text style={styles.actionText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

export { AdminModal };
