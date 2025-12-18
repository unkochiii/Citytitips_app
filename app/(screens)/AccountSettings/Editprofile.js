import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../context/AuthContext";

export default function EditProfile() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [openName, setOpenName] = useState(false);
  const [name, setName] = useState("");
  const [openBio, setOpenBio] = useState(false);
  const [bio, setBio] = useState("");

  const BACKEND_URL = "https://site--en2versv0-backend--ftkq8hkxyc7l.code.run";

  if (!user) {
    return (
      <View style={styles.loaderContainer}>
        <Text>Loading user...</Text>
      </View>
    );
  }

  // Avatar picker
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (image) => {
    if (!user || !token) {
      Alert.alert("Error", "User not authenticated!");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("image", {
        uri: image.uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      });

      const response = await fetch(`${BACKEND_URL}/user/avatar/${user._id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        Alert.alert("Success", "Avatar updated successfully!");
      } else {
        Alert.alert("Error", data.message || "Failed to upload avatar");
      }
    } catch (error) {
      setLoading(false);
      console.log(error);
      Alert.alert("Error", "Something went wrong while uploading avatar");
    }
  };

  return (
    <View style={styles.container}>
      {/* Go Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
        <Entypo name="chevron-left" size={28} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>Edit Profile</Text>

      {/* Bio */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => setOpenBio(!openBio)}
      >
        <Text style={styles.cardText}>Change your bio</Text>
      </TouchableOpacity>
      {openBio && (
        <TextInput
          style={styles.input}
          placeholder="Enter your new bio"
          value={bio}
          onChangeText={setBio}
        />
      )}

      {/* Name */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => setOpenName(!openName)}
      >
        <Text style={styles.cardText}>Change your name</Text>
      </TouchableOpacity>
      {openName && (
        <TextInput
          style={styles.input}
          placeholder="Enter your new name"
          value={name}
          onChangeText={setName}
        />
      )}

      {/* Avatar */}
      <TouchableOpacity
        style={[styles.card, loading && { opacity: 0.6 }]}
        onPress={pickImage}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#555" />
        ) : (
          <Text style={styles.cardText}>Change your avatar</Text>
        )}
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
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  goBack: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 25,
    color: "#333",
  },
  card: {
    backgroundColor: "#FFF",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical:20,
    fontSize: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
});
