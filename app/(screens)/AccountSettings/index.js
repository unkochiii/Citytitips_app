import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import { useRouter } from "expo-router";

const AccountSettings = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.goBack}>
        <TouchableOpacity
          onPress={() => {
            router.push("/profile");
          }}
          style={styles.goBack}
        >
          <Entypo name="chevron-left" size={24} color="black" />
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>Account Settings</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("AccountSettings/Editprofile")}
      >
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.deleteButton]}
        onPress={() => router.push("AccountSettings/DeleteAccount")}
      >
        <Text style={[styles.buttonText, styles.deleteText]}>
          Delete Account
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default AccountSettings;

const styles = StyleSheet.create({
  goBack: { paddingTop: 20 },
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },
  button: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  deleteButton: {
    backgroundColor: "#FFE5E5",
  },
  deleteText: {
    color: "#D11A2A",
  },
});
