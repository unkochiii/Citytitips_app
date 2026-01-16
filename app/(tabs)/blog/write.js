// ✅ FRONTEND CORRIGÉ : app/(tabs)/blog/write.js
import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../context/AuthContext";

const API_BASE_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

const log = (label, data) => {
  console.log(`[BlogCreate] ${label}:`, JSON.stringify(data, null, 2));
};

export default function BlogCreateScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const timeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    categorie: "",
    readSpeed: "225",
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userCity = useMemo(() => {
    const city = user?.location?.city || user?.city;
    log("UserCity calculée:", { city, user: user?._id });
    return city;
  }, [user]);

  const validateForm = useCallback(() => {
    if (!formData.title.trim()) return "Le titre est obligatoire";
    if (!formData.content.trim()) return "Le contenu est obligatoire";
    if (!formData.categorie.trim()) return "La catégorie est obligatoire";
    if (!userCity || typeof userCity !== "string" || userCity.trim() === "") {
      return "Vous devez définir une ville dans votre profil";
    }
    if (selectedImages.length > 5) return "Maximum 5 images autorisées";
    return null;
  }, [formData, userCity, selectedImages]);

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  // ✅ CORRIGÉ : Sélection optimisée d'images avec validation
  const pickImages = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "Nous avons besoin d'accéder à vos photos"
        );
        return;
      }

      const remainingSlots = 5 - selectedImages.length;
      if (remainingSlots <= 0) {
        Alert.alert(
          "Limite atteinte",
          "Vous ne pouvez sélectionner que 5 images maximum"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newImages = result.assets.map((asset, index) => {
          // ✅ VALIDATION : Vérifier que l'URI existe
          if (!asset.uri) {
            throw new Error(`Image ${index} sans URI valide`);
          }

          // ✅ CORRIGÉ : Format d'URI pour iOS/Android
          let uri = asset.uri;
          if (Platform.OS === "ios" && !uri.startsWith("file://")) {
            uri = `file://${uri}`;
          }

          // ✅ EXTRACTION du nom de fichier
          const filename =
            asset.uri.split("/").pop() || `image_${Date.now()}.jpg`;
          const fileExtension = filename.split(".").pop() || "jpeg";

          return {
            uri,
            type: asset.mimeType || `image/${fileExtension}`,
            name: asset.fileName || filename,
          };
        });

        setSelectedImages((prev) => [...prev, ...newImages]);
      }
    } catch (err) {
      console.error("❌ Erreur sélection d'images:", err);
      Alert.alert("Erreur", "Impossible d'accéder à la galerie");
    }
  }, [selectedImages.length]);

  const removeImage = useCallback((index) => {
    log("Suppression image", { index });
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadBlog = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    timeoutRef.current = setTimeout(() => {
      controller.abort();
      setError("Le serveur met trop longtemps à répondre (timeout)");
      setLoading(false);
    }, 25000);

    try {
      log("=== Préparation FormData ===");

      const formDataToSend = new FormData();

      // ✅ Champs texte (explicitement en string)
      formDataToSend.append("title", String(formData.title).trim());
      formDataToSend.append("content", String(formData.content).trim());
      formDataToSend.append("categorie", String(formData.categorie).trim());
      formDataToSend.append(
        "readSpeed",
        String(parseInt(formData.readSpeed) || 225)
      );

      // ✅ ENVOYER LES IMAGES COMME JSON STRINGIFIÉ
      if (selectedImages.length > 0) {
        const imagesJson = JSON.stringify(selectedImages);
        formDataToSend.append("images", imagesJson);
        log("Images JSON envoyé:", imagesJson.substring(0, 100) + "...");
      }

      log("FormData finalisé:", {
        title: formData.title,
        categorie: formData.categorie,
        imagesCount: selectedImages.length,
      });

      const response = await fetch(`${API_BASE_URL}/blog`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // ✅ PAS DE Content-Type (FormData le définit automatiquement)
        },
        body: formDataToSend,
        signal: controller.signal,
      });

      clearTimeout(timeoutRef.current);

      const result = await response.json();
      log("Réponse API:", { status: response.status, result });

      if (!response.ok) {
        const errorMsg =
          result?.error || result?.details || `Erreur HTTP ${response.status}`;
        log("❌ Erreur backend:", errorMsg);
        throw new Error(errorMsg);
      }

      Alert.alert("✅ Succès", "Blog créé et en attente de validation");
      router.back();
    } catch (err) {
      clearTimeout(timeoutRef.current);
      console.error("❌ ERREUR COMPLÈTE:", err);

      // ✅ Messages d'erreur spécifiques
      let userMessage = "Impossible de créer le blog";
      if (err.name === "AbortError") userMessage = "Timeout du serveur";
      else if (err.message?.includes("ville"))
        userMessage = "⚠️ Ville invalide";
      else if (err.message?.includes("obligatoire"))
        userMessage = "Champs manquants";
      else if (err.message?.includes("Maximum")) userMessage = "5 images max";
      else if (err.message?.includes("401")) userMessage = "Session expirée";
      else if (err.message?.includes("404"))
        userMessage = "Endpoint introuvable";
      else if (err.message?.includes("413"))
        userMessage = "Images trop lourdes";
      else if (err.message) userMessage = err.message;

      setError(userMessage);
      Alert.alert("❌ Erreur", userMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, selectedImages, token, userCity, router, validateForm]);

  const renderImagePicker = useCallback(() => {
    const remainingSlots = 5 - selectedImages.length;

    return (
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>
          Images ({selectedImages.length}/5)
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesScroll}
        >
          {selectedImages.map((image, index) => (
            <View key={`${image.uri}-${index}`} style={styles.imageWrapper}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={24} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}

          {remainingSlots > 0 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
              <Ionicons name="add" size={32} color="#3498db" />
              <Text style={styles.addImageText}>{remainingSlots}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {selectedImages.length === 0 && (
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImages}>
            <Ionicons name="image-outline" size={24} color="#fff" />
            <Text style={styles.imagePickerBtnText}>
              Sélectionner des images
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [selectedImages, pickImages, removeImage]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un blog</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </View>
        )}

        {/* Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formGroup}>
            <Text style={styles.label}>Titre *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => handleInputChange("title", text)}
              placeholder="Titre de votre blog"
              maxLength={100}
              returnKeyType="next"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contenu *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.content}
              onChangeText={(text) => handleInputChange("content", text)}
              placeholder="Écrivez votre contenu ici..."
              multiline
              textAlignVertical="top"
              numberOfLines={8}
              returnKeyType="next"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Catégorie *</Text>
            <TextInput
              style={styles.input}
              value={formData.categorie}
              onChangeText={(text) => handleInputChange("categorie", text)}
              placeholder="Ex: Voyages, Cuisine, Tech..."
              returnKeyType="next"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Vitesse de lecture (mots/min)</Text>
            <TextInput
              style={styles.input}
              value={formData.readSpeed}
              onChangeText={(text) =>
                handleInputChange("readSpeed", text.replace(/[^0-9]/g, ""))
              }
              placeholder="225"
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>

          {/* Image picker */}
          {renderImagePicker()}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={uploadBlog}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Publier le blog</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.infoText}>
            * Champs obligatoires. Votre blog sera soumis à validation avant
            publication.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 8,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a2e",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e74c3c",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  imagesScroll: {
    flexDirection: "row",
    marginBottom: 12,
  },
  imageWrapper: {
    position: "relative",
    marginRight: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
  },
  removeImageBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#3498db",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addImageText: {
    position: "absolute",
    top: 4,
    right: 8,
    fontSize: 12,
    color: "#3498db",
    fontWeight: "bold",
  },
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3498db",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  imagePickerBtnText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: "#2ecc71",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  submitBtnDisabled: {
    backgroundColor: "#95a5a6",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 18,
  },
});
