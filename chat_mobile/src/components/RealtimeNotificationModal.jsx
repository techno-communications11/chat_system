import { Modal, Pressable, Text, View } from "react-native";
import { styles } from "../mobileStyles";

function RealtimeNotificationModal({
  notification,
  onClose,
  onOpen,
  darkTheme = false,
}) {
  if (!notification) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogOverlay}>
        <View style={[styles.dialogCard, darkTheme && styles.darkCard]}>
          <Text style={[styles.dialogTitle, darkTheme && styles.darkText]}>
            {notification.title}
          </Text>
          <Text style={[styles.dialogMessage, darkTheme && styles.darkMuted]}>
            {notification.body}
          </Text>
          <View style={styles.dialogButtons}>
            <Pressable style={styles.dialogButton} onPress={onClose}>
              <Text style={[styles.dialogButtonText, darkTheme && styles.darkText]}>Close</Text>
            </Pressable>
            {notification.chat && (
              <Pressable
                style={styles.dialogButton}
                onPress={() => {
                  onOpen(notification.chat);
                  onClose();
                }}
              >
                <Text style={[styles.dialogButtonText, darkTheme && styles.darkText]}>Open chat</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export { RealtimeNotificationModal };
