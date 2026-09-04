import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppContent } from "./src/components/AppContent";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
