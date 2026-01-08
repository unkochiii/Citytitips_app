// app/profile/edit.js (ou là où tu as placé ce fichier)
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

// ========== LISTE DES VILLES MAROCAINES ==========
const CITIES = [
  "Tanger",
  "Tétouan",
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fès",
  "Meknès",
  "Agadir",
  "Oujda",
  "Kenitra",
  "El Jadida",
  "Safi",
  "Mohammedia",
  "Khouribga",
  "Béni Mellal",
  "Nador",
  "Taza",
  "Settat",
  "Berrechid",
  "Khemisset",
  "Larache",
  "Ksar El Kebir",
  "Guelmim",
  "Errachidia",
  "Ouarzazate",
];

const editProfile = () => {
  // ✅ Utiliser useRouter() au lieu de navigation
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    city: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Charger le token depuis SecureStore
  const { token: authToken } = useAuth();

  useEffect(() => {
    const loadTokenAndFetchProfile = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("userToken");
        const usedToken = storedToken || authToken;

        if (!usedToken) {
          router.replace("/(auth)/login");
          return;
        }

        setToken(usedToken);

        // Charger le profil
        const response = await axios.get(
          "https://api--tanjablabla--t4nqvl4d28d8.code.run/profile",
          {
            headers: { Authorization: `Bearer ${usedToken}` },
          }
        );

        console.log("Réponse API:", response.data);

        const cityFromAPI =
          response.data.account?.city ||
          response.data.city ||
          response.data.user?.account?.city ||
          response.data.user?.city ||
          "";

        setUserData({
          username: response.data.account?.username || "",
          email: response.data.email || "",
          city: cityFromAPI,
        });

        if (response.data.account?.avatar?.secure_url) {
          setAvatarPreview(response.data.account.avatar.secure_url);
        }

        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement du profil");
        setIsLoading(false);
      }
    };

    loadTokenAndFetchProfile();
  }, [authToken]);

  const handleChange = (name, value) => {
    setUserData({
      ...userData,
      [name]: value,
    });
  };

  // ✅ Sélection d'image avec Expo
  const handleAvatarChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à la galerie pour changer votre avatar."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const selectedImage = result.assets[0];
      setAvatar(selectedImage);
      setAvatarPreview(selectedImage.uri);
    }
  };

  // ✅ Envoi du formulaire
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("username", userData.username);
      formData.append("email", userData.email);
      formData.append("city", userData.city);

      if (avatar) {
        const uri = avatar.uri;
        const filename = uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("avatar", {
          uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
          name: filename,
          type: type,
        });
      }

      const response = await axios.put(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/user/update",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const updatedUser = response.data.user || response.data;

      // ✅ Sauvegarder les nouvelles données utilisateur
      await SecureStore.setItemAsync("userData", JSON.stringify(updatedUser));

      Alert.alert("Succès", "Profil mis à jour avec succès !", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5d5db8" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileEdit}>
        {/* Bouton Retour */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Modifier mon profil</Text>

        {error && <Text style={styles.errorMessage}>{error}</Text>}

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handleAvatarChange}
            style={styles.avatarPreviewContainer}
          >
            {avatarPreview ? (
              <Image
                source={{ uri: avatarPreview }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {userData.username?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>📷</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAvatarChange}>
            <Text style={styles.avatarUploadBtnText}>Changer l'avatar</Text>
          </TouchableOpacity>
        </View>

        {/* Username */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nom d'utilisateur</Text>
          <TextInput
            style={styles.input}
            value={userData.username}
            onChangeText={(value) => handleChange("username", value)}
            placeholder="Nom d'utilisateur"
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
        </View>

        {/* Email */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={userData.email}
            onChangeText={(value) => handleChange("email", value)}
            placeholder="Email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Ville - Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ville</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={userData.city}
              onValueChange={(value) => handleChange("city", value)}
              style={styles.picker}
              dropdownIconColor="#5d5db8"
            >
              <Picker.Item
                label="-- Sélectionne ta ville --"
                value=""
                color="#999"
              />
              {CITIES.map((cityName) => (
                <Picker.Item key={cityName} label={cityName} value={cityName} />
              ))}
            </Picker>
          </View>
          {userData.city !== "" && (
            <Text style={styles.cityInfo}>
              Ville actuelle : {userData.city}
            </Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              Enregistrer les modifications
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  profileEdit: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  backBtnText: {
    fontSize: 16,
    color: "#5d5db8",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 25,
    color: "#333",
  },
  errorMessage: {
    color: "#d32f2f",
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    textAlign: "center",
    width: "100%",
    overflow: "hidden",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  avatarPreviewContainer: {
    position: "relative",
    marginBottom: 10,
  },
  avatarImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#5d5db8",
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#5d5db8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#4a4a9e",
  },
  avatarPlaceholderText: {
    fontSize: 50,
    color: "#fff",
    fontWeight: "bold",
  },
  editBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#fff",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#5d5db8",
  },
  editBadgeText: {
    fontSize: 14,
  },
  avatarUploadBtnText: {
    color: "#5d5db8",
    fontSize: 16,
    fontWeight: "600",
  },
  formGroup: {
    width: "100%",
    marginBottom: 20,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
    alignSelf: "center",
  },
  input: {
    width: "85%",
    maxWidth: 300,
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  pickerContainer: {
    width: "85%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: Platform.OS === "ios" ? 150 : 50,
    color: "#333",
  },
  cityInfo: {
    color: "#666",
    marginTop: 8,
    fontSize: 14,
    fontStyle: "italic",
  },
  submitBtn: {
    backgroundColor: "#5d5db8",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 25,
    width: "85%",
    maxWidth: 300,
    alignItems: "center",
    shadowColor: "#5d5db8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: "#a0a0cc",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default editProfile;
