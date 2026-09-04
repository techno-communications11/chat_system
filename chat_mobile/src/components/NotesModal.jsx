import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { styles } from "../mobileStyles";

const keyFor = (user) =>
  `pingly.mobile.notes.${user?.id || user?.userId || user?.user_id || user?.email || "guest"}`;

function NotesModal({ tokenUser, visible, onClose, darkTheme = false }) {
  const storageKey = useMemo(() => keyFor(tokenUser), [tokenUser]);
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deleteNote, setDeleteNote] = useState(null);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(storageKey)
      .then((value) => setNotes(value ? JSON.parse(value) : []))
      .catch(() => setNotes([]));
  }, [storageKey, visible]);

  const persist = async (next) => {
    setNotes(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  };
  const reset = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setReminderAt("");
  };
  const save = async () => {
    if (!title.trim() && !body.trim()) return;
    const now = new Date().toISOString();
    const note = {
      id: editingId || `${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      reminderAt: reminderAt.trim(),
      updatedAt: now,
    };
    await persist(
      editingId
        ? notes.map((item) =>
            item.id === editingId ? { ...item, ...note } : item,
          )
        : [{ ...note, createdAt: now }, ...notes],
    );
    reset();
  };
  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
          <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}>
            <View>
              <Text style={[styles.listTitle, darkTheme && styles.darkText]}>
                My notes
              </Text>
              <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>
                Private reminders and quick thoughts
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.actionText}>Close</Text>
            </Pressable>
          </View>
          <View style={[styles.noteEditor, darkTheme && styles.darkSurface]}>
            <Text
              style={[styles.noteEditorHeading, darkTheme && styles.darkText]}
            >
              {editingId ? "Edit note" : "New note"}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Note title"
              placeholderTextColor="#aaa2b3"
              style={[
                styles.noteTitleInput,
                darkTheme && styles.darkInput,
                darkTheme && styles.darkText,
              ]}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write something..."
              placeholderTextColor="#aaa2b3"
              multiline
              textAlignVertical="top"
              style={[styles.noteBodyInput, darkTheme && styles.darkText]}
            />
            <View
              style={[styles.reminderInputRow, darkTheme && styles.darkInput]}
            >
              <Text style={styles.reminderIcon}>◷</Text>
              <TextInput
                value={reminderAt}
                onChangeText={setReminderAt}
                placeholder="Add a reminder (optional)"
                placeholderTextColor="#aaa2b3"
                style={[styles.reminderInput, darkTheme && styles.darkText]}
              />
            </View>
            <View style={styles.noteButtons}>
              {editingId && (
                <Pressable onPress={reset} style={styles.noteCancelButton}>
                  <Text style={styles.actionText}>Cancel</Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.noteSaveButton,
                  !title.trim() && !body.trim() && styles.disabled,
                ]}
                onPress={save}
                disabled={!title.trim() && !body.trim()}
              >
                <Text style={styles.primaryButtonText}>
                  {editingId ? "Save changes" : "Add note"}
                </Text>
              </Pressable>
            </View>
          </View>
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              notes.length ? styles.notesList : styles.notesEmptyList
            }
            ListEmptyComponent={
              <View style={styles.notesEmpty}>
                <Text style={styles.notesEmptyIcon}>✎</Text>
                <Text
                  style={[styles.notesEmptyTitle, darkTheme && styles.darkText]}
                >
                  No notes yet
                </Text>
                <Text style={[styles.muted, darkTheme && styles.darkMuted]}>
                  Create a note above to keep a quick reminder.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.noteRow, darkTheme && styles.darkNoteRow]}>
                <View style={styles.noteAccent} />
                <View style={styles.noteContent}>
                  <Text
                    style={[styles.noteTitle, darkTheme && styles.darkText]}
                  >
                    {item.title || "Untitled note"}
                  </Text>
                  <Text
                    style={[styles.noteBody, darkTheme && styles.darkMuted]}
                    numberOfLines={4}
                  >
                    {item.body || "No details"}
                  </Text>
                  {item.reminderAt ? (
                    <View style={styles.reminderBadge}>
                      <Text style={styles.reminderBadgeText}>
                        ◷ {item.reminderAt}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.noteActions}>
                  <Pressable
                    onPress={() => {
                      setEditingId(item.id);
                      setTitle(item.title);
                      setBody(item.body);
                      setReminderAt(item.reminderAt || "");
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => setDeleteNote(item)} hitSlop={8}>
                    <Text style={styles.logoutText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
      <Modal
        visible={Boolean(deleteNote)}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteNote(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogCard, darkTheme && styles.darkCard]}>
            <Text style={[styles.dialogTitle, darkTheme && styles.darkDialogTitle]}>Delete note?</Text>
            <Text style={[styles.dialogMessage, darkTheme && styles.darkDialogMessage]}>
              This note will be permanently removed.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                style={[styles.dialogButton, darkTheme && styles.darkInput]}
                onPress={() => setDeleteNote(null)}
              >
                <Text style={[styles.dialogButtonText, darkTheme && styles.darkText]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.dialogDangerButton}
                onPress={() => {
                  persist(notes.filter((note) => note.id !== deleteNote.id));
                  setDeleteNote(null);
                }}
              >
                <Text style={styles.dialogDangerText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export { NotesModal };
