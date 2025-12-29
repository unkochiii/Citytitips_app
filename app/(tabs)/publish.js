// app/(tabs)/publish.js
import React, { useState } from "react";
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
  Platform,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export default function Publish() {
  const router = useRouter();
  const { token, user, logout } = useAuth();

  const [formData, setFormData] = useState({
    type: "question",
    titre: "",
    content: "",
    lieu: "",
    dateEvent: "",
    description: "",
    nbParticipants: "",
    nbStar: "",
  });

  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // ✅ State pour le menu burger
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-DRAWER_WIDTH));

  const isAdmin = user?.role === "admin";

  // ✅ Ouvrir le menu
  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  // ✅ Fermer le menu
  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
    });
  };

  // ✅ Fonction de déconnexion
  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          closeMenu();
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const typeOptions = [
    {
      value: "question",
      label: "Question",
      icon: "help-circle",
      color: "#142247",
    },
    { value: "event", label: "Événement", icon: "calendar", color: "#ffdd11" },
    {
      value: "recommandation",
      label: "Recommandation",
      icon: "star",
      color: "#eca305",
    },
    { value: "vente", label: "Vente", icon: "pricetag", color: "#0d7dca" },
  ];

  const handleTypeSelect = (type) => {
    setFormData((prev) => ({
      ...prev,
      type: type,
      lieu: "",
      dateEvent: "",
      description: "",
      nbParticipants: "",
      nbStar: "",
    }));
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Sélection d'images avec expo-image-picker
  const pickImages = async () => {
    const maxImages = 5;

    if (images.length >= maxImages) {
      Alert.alert("Limite atteinte", `Maximum ${maxImages} images autorisées.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin de la permission pour accéder à vos photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: maxImages - images.length,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        type: "image/jpeg",
        name: asset.fileName || `image_${Date.now()}.jpg`,
      }));

      setImages((prev) => [...prev, ...newImages].slice(0, maxImages));
      setMessage({ type: "", text: "" });
    }
  };

  // ✅ Prendre une photo
  const takePhoto = async () => {
    const maxImages = 5;

    if (images.length >= maxImages) {
      Alert.alert("Limite atteinte", `Maximum ${maxImages} images autorisées.`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin de la permission pour accéder à la caméra."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newImage = {
        uri: result.assets[0].uri,
        type: "image/jpeg",
        name: `photo_${Date.now()}.jpg`,
      };

      setImages((prev) => [...prev, newImage]);
      setMessage({ type: "", text: "" });
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveAllImages = () => {
    setImages([]);
  };

  const showImageOptions = () => {
    Alert.alert("Ajouter une image", "Choisissez une option", [
      { text: "Annuler", style: "cancel" },
      { text: "Prendre une photo", onPress: takePhoto },
      { text: "Galerie", onPress: pickImages },
    ]);
  };

  const handleSubmit = async () => {
    if (!formData.type) {
      setMessage({
        type: "error",
        text: "Veuillez sélectionner un type de publication",
      });
      return;
    }

    if (!formData.titre.trim()) {
      setMessage({ type: "error", text: "Le titre est obligatoire" });
      return;
    }

    if (!formData.content.trim()) {
      setMessage({ type: "error", text: "Le contenu est obligatoire" });
      return;
    }

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const data = new FormData();

      Object.keys(formData).forEach((key) => {
        if (formData[key]) {
          data.append(key, formData[key]);
        }
      });

      images.forEach((image) => {
        data.append("images", {
          uri: image.uri,
          type: image.type || "image/jpeg",
          name: image.name || `image_${Date.now()}.jpg`,
        });
      });

      const response = await axios.post(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/post",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage({
        type: "success",
        text: response.data.message || "Publication créée avec succès !",
      });

      setFormData({
        type: "question",
        titre: "",
        content: "",
        lieu: "",
        dateEvent: "",
        description: "",
        nbParticipants: "",
        nbStar: "",
      });
      setImages([]);

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.log("Erreur:", error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.message || "Erreur lors de la création du post",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    router.replace("/(auth)/login");
    return null;
  }

  return (
    <View style={styles.mainContainer}>
      {/* ✅ HEADER avec menu burger */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.burgerBtn}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Publier</Text>
        </View>

        <View style={styles.headerRight}>
          {isAdmin ? (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ✅ CONTENU PRINCIPAL */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.publishCard}>
          {/* Message */}
          {message.text ? (
            <View
              style={[
                styles.message,
                message.type === "success"
                  ? styles.successMessage
                  : styles.errorMessage,
              ]}
            >
              <Text style={styles.messageText}>
                {message.type === "success" ? "✅" : "❌"} {message.text}
              </Text>
            </View>
          ) : null}

          {/* BOUTONS DE TYPE */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Type de publication *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeButtonsContainer}
              contentContainerStyle={styles.typeButtons}
            >
              {typeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.typeBtn,
                    formData.type === option.value && styles.typeBtnSelected,
                  ]}
                  onPress={() => handleTypeSelect(option.value)}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={
                      formData.type === option.value ? option.color : "#999"
                    }
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      formData.type === option.value && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {formData.type && (
            <>
              {/* Titre */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Titre *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.titre}
                  onChangeText={(value) => handleChange("titre", value)}
                  placeholder="Entrez le titre"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Contenu */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Contenu *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.content}
                  onChangeText={(value) => handleChange("content", value)}
                  placeholder="Écrivez votre contenu ici..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              {/* ✅ UPLOAD IMAGES */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Images ({images.length}/5)</Text>
                  {images.length > 0 && (
                    <TouchableOpacity onPress={handleRemoveAllImages}>
                      <Text style={styles.clearAllBtn}>Tout supprimer</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.imagesContainer}>
                  {images.map((image, index) => (
                    <View key={index} style={styles.imagePreviewItem}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.imgPreview}
                      />
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                      <View style={styles.imageNumber}>
                        <Text style={styles.imageNumberText}>{index + 1}</Text>
                      </View>
                    </View>
                  ))}

                  {images.length < 5 && (
                    <TouchableOpacity
                      style={styles.uploadZone}
                      onPress={showImageOptions}
                    >
                      <Ionicons name="image-outline" size={40} color="#999" />
                      <Text style={styles.uploadText}>
                        {images.length === 0
                          ? "Ajouter des images"
                          : "Ajouter plus"}
                      </Text>
                      <Text style={styles.uploadInfo}>JPG, PNG • Max 5MB</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Champs spécifiques aux événements */}
              {formData.type === "event" && (
                <View style={styles.eventFields}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Lieu *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.lieu}
                      onChangeText={(value) => handleChange("lieu", value)}
                      placeholder="Adresse de l'événement"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Date de l'événement *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.dateEvent}
                      onChangeText={(value) => handleChange("dateEvent", value)}
                      placeholder="YYYY-MM-DD HH:MM"
                      placeholderTextColor="#999"
                    />
                    <Text style={styles.helperText}>
                      Format: 2025-01-15 14:30
                    </Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Nombre de participants max *
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={formData.nbParticipants}
                      onChangeText={(value) =>
                        handleChange("nbParticipants", value)
                      }
                      placeholder="Ex: 50"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description détaillée *</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaSmall]}
                      value={formData.description}
                      onChangeText={(value) =>
                        handleChange("description", value)
                      }
                      placeholder="Description de l'événement..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}

              {/* Champs spécifiques aux recommandations */}
              {formData.type === "recommandation" && (
                <View style={styles.eventFields}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Lieu *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.lieu}
                      onChangeText={(value) => handleChange("lieu", value)}
                      placeholder="Adresse du lieu recommandé"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description *</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaSmall]}
                      value={formData.description}
                      onChangeText={(value) =>
                        handleChange("description", value)
                      }
                      placeholder="Décrivez votre recommandation..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Note (0-5) *</Text>
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() =>
                            handleChange("nbStar", star.toString())
                          }
                        >
                          <FontAwesome
                            name={
                              parseInt(formData.nbStar) >= star
                                ? "star"
                                : "star-o"
                            }
                            size={30}
                            color="#eca305"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Bouton Submit */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isLoading && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Publier</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.infoText}>
                Votre publication sera visible après validation par un
                administrateur.
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* ✅ MENU BURGER (Drawer) */}
      {/* ✅ MENU BURGER (Drawer) */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        {/* Overlay sombre */}
        <Pressable style={styles.overlay} onPress={closeMenu} />

        {/* Panneau latéral */}
        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          {/* Header du menu */}
          <View style={styles.drawerHeader}>
            <View style={styles.drawerProfile}>
              {/* ✅ CORRECTION : user.avatar au lieu de user.account.avatar */}
              {user?.avatar?.secure_url ? (
                <Image
                  source={{ uri: user.avatar.secure_url }}
                  style={styles.drawerAvatar}
                />
              ) : (
                <View style={styles.drawerAvatarPlaceholder}>
                  <Text style={styles.drawerAvatarText}>
                    {/* ✅ CORRECTION : user.username au lieu de user.account.username */}
                    {user?.username?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <View style={styles.drawerUserInfo}>
                {/* ✅ CORRECTION : user.username */}
                <Text style={styles.drawerUsername}>
                  {user?.username || "Utilisateur"}
                </Text>
                {/* ✅ CORRECTION : user.city (pas d'email dans la réponse API) */}
                <Text style={styles.drawerEmail}>{user?.city || ""}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeMenu}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Items du menu */}
          <ScrollView style={styles.drawerContent}>
            {/* Profil */}
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                closeMenu();
                router.push("/profile");
              }}
            >
              <Ionicons name="person-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Mon profil</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Paramètres */}
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                closeMenu();
                router.push("/settings");
              }}
            >
              <Ionicons name="settings-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Paramètres</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.drawerSeparator} />

            {/* Section Admin (si admin) */}
            {isAdmin ? (
              <>
                <Text style={styles.drawerSectionTitle}>Administration</Text>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/admin/pending-posts");
                  }}
                >
                  <Ionicons name="time-outline" size={24} color="#007bff" />
                  <Text style={[styles.drawerItemText, { color: "#007bff" }]}>
                    Posts en attente
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#007bff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/admin/users");
                  }}
                >
                  <Ionicons name="people-outline" size={24} color="#007bff" />
                  <Text style={[styles.drawerItemText, { color: "#007bff" }]}>
                    Gérer les utilisateurs
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#007bff" />
                </TouchableOpacity>

                <View style={styles.drawerSeparator} />
              </>
            ) : null}

            {/* À propos */}
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                closeMenu();
                router.push("/about");
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color="#333"
              />
              <Text style={styles.drawerItemText}>À propos</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Aide */}
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                closeMenu();
                router.push("/help");
              }}
            >
              <Ionicons name="help-circle-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Aide</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </ScrollView>

          {/* Footer du menu - Déconnexion */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // ✅ Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  burgerBtn: {
    padding: 5,
    width: 50,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  headerRight: {
    width: 50,
    alignItems: "flex-end",
  },
  adminBadge: {
    backgroundColor: "#007bff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  adminBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  // ✅ Drawer
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  drawerProfile: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  drawerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  drawerAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  drawerUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  drawerUsername: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  drawerEmail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 10,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 15,
  },
  drawerItemText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  drawerSeparator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
    marginHorizontal: 20,
  },
  drawerSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#999",
    paddingHorizontal: 20,
    paddingVertical: 10,
    textTransform: "uppercase",
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 16,
    color: "#e74c3c",
    fontWeight: "600",
  },
  versionText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 15,
  },

  // ✅ Container & Content
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 50,
  },
  publishCard: {
    gap: 15,
  },

  // Message
  message: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  successMessage: {
    backgroundColor: "#d4edda",
  },
  errorMessage: {
    backgroundColor: "#f8d7da",
  },
  messageText: {
    textAlign: "center",
    fontSize: 14,
  },

  // Form Group
  formGroup: {
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 15,
  },
  label: {
    fontWeight: "bold",
    color: "#666",
    fontSize: 14,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearAllBtn: {
    color: "#e74c3c",
    fontSize: 12,
  },

  // Type Buttons
  typeButtonsContainer: {
    flexGrow: 0,
  },
  typeButtons: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 5,
  },
  typeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  typeBtnSelected: {
    borderColor: "#142247",
    backgroundColor: "#f3f3f3",
  },
  typeLabel: {
    fontWeight: "600",
    color: "#999",
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  textArea: {
    height: 150,
    textAlignVertical: "top",
  },
  textAreaSmall: {
    height: 100,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },

  // Images
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imagePreviewItem: {
    position: "relative",
  },
  imgPreview: {
    width: 100,
    height: 100,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  imageNumber: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  imageNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  uploadZone: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  uploadText: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
    marginTop: 5,
  },
  uploadInfo: {
    fontSize: 8,
    color: "#bbb",
    textAlign: "center",
  },

  // Event Fields
  eventFields: {
    gap: 15,
  },

  // Stars
  starsContainer: {
    flexDirection: "row",
    gap: 10,
  },

  // Submit Button
  submitBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnDisabled: {
    backgroundColor: "#7fb8ff",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Info Text
  infoText: {
    color: "rgb(212, 87, 87)",
    fontStyle: "italic",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 25,
  },
});
