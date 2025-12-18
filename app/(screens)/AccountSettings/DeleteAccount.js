import { View, Text, Alert, StyleSheet, TouchableOpacity } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import { useRouter } from "expo-router";

export default function DeleteAccount() {
  const router = useRouter();

  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      "This action is permanent. Your account and all data will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => console.log("Deleted"),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Go Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
        <Entypo name="chevron-left" size={28} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>Delete Account</Text>

      <Text style={styles.warningText}>
        This action cannot be undone. All your data will be permanently removed.
      </Text>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 20,
    paddingTop: 60,
    alignItems: "center",
  },
  goBack: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#333",
  },
  warningText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
