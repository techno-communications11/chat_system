import { Image, Text, View } from "react-native";
import { styles } from "../mobileStyles";

function Brand({ compact = false }) {
  return (
    <View style={[styles.brandRow, compact && styles.brandRowCompact]}>
      <Image
        source={require("../../assets/icon.png")}
        style={compact ? styles.navbarBrandIcon : styles.brandIconImage}
      />
      <Text style={compact ? styles.navbarBrandText : styles.brandText}>
        Pingly
      </Text>
    </View>
  );
}

export { Brand };
