import { useState } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../mobileStyles";
import { chatIdOf, titleOf } from "../mobileConfig";

function ScheduleMeetModal({ visible, onClose, onSchedule, conversations = [], darkTheme = false }) {
  const [title, setTitle] = useState("Team meet");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [personQuery, setPersonQuery] = useState("");
  const directConversations = conversations.filter((item) => !["group", "channel"].includes(String(item?.type || item?.conversationType || "").toLowerCase()));
  const matchingPeople = directConversations.filter((item) => titleOf(item).toLowerCase().includes(personQuery.trim().toLowerCase()));

  const submit = async () => {
    const start = new Date(`${date}T${time || "09:00"}`);
    if (!date || Number.isNaN(start.getTime()) || start <= new Date()) {
      setError("Choose a future date and time.");
      return;
    }
    await onSchedule({ title: title.trim() || "Team meet", start });
    setError("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
        <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}>
          <View style={styles.scheduleTitleRow}><View style={styles.scheduleIcon}><MaterialCommunityIcons name="calendar-plus" size={21} color="#fff" /></View><View><Text style={[styles.listTitle, darkTheme && styles.darkText]}>Schedule meet</Text><Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>Plan a meeting and get a reminder</Text></View></View>
          <Pressable onPress={onClose}><Text style={styles.actionText}>Close</Text></Pressable>
        </View>
        <ScrollView style={[styles.scheduleForm, darkTheme && styles.darkSurface]} contentContainerStyle={styles.scheduleFormContent}>
          <Text style={[styles.scheduleLabel, darkTheme && styles.darkMuted]}>Meet with</Text>
          <View style={[styles.schedulePersonSearch, darkTheme && styles.darkInput]}><MaterialCommunityIcons name="magnify" size={19} color="#888294" /><TextInput value={personQuery} onChangeText={setPersonQuery} placeholder="Search users" placeholderTextColor="#aaa2b3" style={[styles.schedulePersonSearchInput, darkTheme && styles.darkText]} /></View>
          <View style={styles.schedulePeople}>{matchingPeople.map((item) => {
            const selected = String(chatIdOf(selectedConversation)) === String(chatIdOf(item));
            return <Pressable key={chatIdOf(item)} onPress={() => { setSelectedConversation(item); setTitle(`Meet with ${titleOf(item)}`); }} style={[styles.schedulePerson, selected && styles.schedulePersonActive, darkTheme && styles.darkRow]}><View style={styles.schedulePersonAvatar}><Text style={styles.avatarText}>{titleOf(item).charAt(0).toUpperCase()}</Text></View><Text style={[styles.conversationTitle, darkTheme && styles.darkText]} numberOfLines={1}>{titleOf(item)}</Text>{selected && <MaterialCommunityIcons name="check-circle" size={20} color="#6f2da8" />}</Pressable>;
          })}</View>
          {!directConversations.length && <Text style={[styles.muted, darkTheme && styles.darkMuted]}>No conversations available. You can still schedule a personal reminder.</Text>}
          {!!directConversations.length && !matchingPeople.length && <Text style={[styles.muted, darkTheme && styles.darkMuted]}>No users match your search.</Text>}
          <Text style={[styles.scheduleLabel, darkTheme && styles.darkMuted]}>Meeting title</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Meeting title" placeholderTextColor="#aaa2b3" style={[styles.adminFormInput, darkTheme && styles.darkInput, darkTheme && styles.darkText]} />
          <Text style={[styles.scheduleLabel, darkTheme && styles.darkMuted]}>Date</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#aaa2b3" keyboardType="numbers-and-punctuation" style={[styles.adminFormInput, darkTheme && styles.darkInput, darkTheme && styles.darkText]} />
          <Text style={[styles.scheduleLabel, darkTheme && styles.darkMuted]}>Time</Text>
          <TextInput value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor="#aaa2b3" keyboardType="numbers-and-punctuation" style={[styles.adminFormInput, darkTheme && styles.darkInput, darkTheme && styles.darkText]} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.primaryButton} onPress={submit}><Text style={styles.primaryButtonText}>Schedule meet</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export { ScheduleMeetModal };
