// app/(tabs)/publish.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  SafeAreaView, // ✅ AJOUTÉ
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

// ✅ Liste des villes valides (doit correspondre au backend)
const VALID_CITIES = ["Tanger", "Thue & Mue"];

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

  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-DRAWER_WIDTH));

  // ✅ Vérifier roles (array)
  const userRoles = user?.roles || [];
  const isAdmin =
    userRoles.includes("admin") || userRoles.includes("superAdmin");

  // ✅ NOUVEAU : Vérification du rôle commerce
  const isCommerce =
    userRoles.includes("commerce") || user?.roles === "commerce";
  const isBlog = userRoles.includes("blog") || user?.roles === "blog";
  // ✅ CORRECTION : Redirection dans useEffect (pas pendant le rendu)
  useEffect(() => {
    if (!token) {
      router.replace("/login"); // ✅ CORRIGÉ : sans (auth)
    }
  }, [token, router]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
    });
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          closeMenu();
          await logout();
          router.replace("/login"); // ✅ CORRIGÉ : sans (auth)
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

  // ✅ Fonction pour trouver la ville valide
  const findValidCity = (cityInput) => {
    if (!cityInput) return null;

    const inputLower = cityInput.toString().trim().toLowerCase();

    // Chercher une correspondance exacte (insensible à la casse)
    const exactMatch = VALID_CITIES.find((c) => c.toLowerCase() === inputLower);
    if (exactMatch) return exactMatch;

    // Chercher si la ville est contenue dans l'input
    const partialMatch = VALID_CITIES.find((c) =>
      inputLower.includes(c.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    return null;
  };

  const handleSubmit = async () => {
    console.log("==================");
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

      // ✅ Déterminer la ville correctement
      let derivedCity = null;

      // 1. Essayer d'extraire depuis le champ 'lieu'
      if (formData.lieu) {
        derivedCity = findValidCity(formData.lieu);
      }

      // 2. Sinon, utiliser la ville de l'utilisateur
      if (!derivedCity && user?.city) {
        derivedCity = findValidCity(user.city);
      }

      console.log("=== DEBUG CITY ===");
      console.log("user.city:", user?.city);
      console.log("formData.lieu:", formData.lieu);
      console.log("derivedCity:", derivedCity);

      // ✅ Vérifier qu'on a une ville valide
      if (!derivedCity) {
        setMessage({
          type: "error",
          text: "Impossible de déterminer la ville. Vérifiez votre profil ou le lieu saisi.",
        });
        setIsLoading(false);
        return;
      }

      console.log("=== DEBUG FINAL ===");
      console.log("user.city:", user?.city);
      console.log("derivedCity:", derivedCity);

      // Ajouter la ville au FormData
      data.append("city", derivedCity);

      // Ajouter les autres champs du formulaire
      Object.keys(formData).forEach((key) => {
        if (formData[key] && formData[key].toString().trim()) {
          data.append(key, formData[key]);
        }
      });

      // Ajouter les images
      images.forEach((image) => {
        data.append("images", {
          uri: image.uri,
          type: image.type || "image/jpeg",
          name: image.name || `image_${Date.now()}.jpg`,
        });
      });

      console.log("=== ENVOI POST ===");
      console.log("City envoyée:", derivedCity);
      console.log("==================");

      const response = await axios.post(
        "https://site--citytitipsback--fp64tcf5fhqm.code.run/post",
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
      console.error("Erreur création post:", error);
      console.error(
        "error.response?.data:",
        JSON.stringify(error.response?.data, null, 2)
      );

      const serverMessage =
        error.response?.data?.message || error.response?.data?.error || null;

      setMessage({
        type: "error",
        text: serverMessage || "Erreur lors de la création du post",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ CORRECTION : Afficher un loader pendant la redirection
  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Redirection...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      {/* ✅ CHANGÉ */}
      {/* ✅ HEADER avec menu burger */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.burgerBtn}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Publier</Text>
        </View>

        <View style={styles.headerRight}>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
          {isCommerce && !isAdmin && (
            <View style={[styles.adminBadge, { backgroundColor: "#10b981" }]}>
              <Text style={styles.adminBadgeText}>Commerce</Text>
            </View>
          )}
        </View>
      </View>
      {/* ✅ CONTENU PRINCIPAL avec KeyboardAwareScrollView */}
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={30}
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
      </KeyboardAwareScrollView>
      {/* ✅ MENU BURGER (Drawer) */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.overlay} onPress={closeMenu} />

        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          {/* Header du menu */}
          <View style={styles.drawerHeader}>
            <View style={styles.drawerProfile}>
              {user?.avatar?.secure_url ? (
                <Image
                  source={{ uri: user.avatar.secure_url }}
                  style={styles.drawerAvatar}
                />
              ) : (
                <View style={styles.drawerAvatarPlaceholder}>
                  <Text style={styles.drawerAvatarText}>
                    {user?.username?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <View style={styles.drawerUserInfo}>
                <Text style={styles.drawerUsername}>
                  {user?.username || "Utilisateur"}
                </Text>
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

            <View style={styles.drawerSeparator} />

            {/* Section Commerce */}
            {isCommerce && (
              <>
                <Text style={styles.drawerSectionTitle}>Mon Commerce</Text>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/commerce/dashboardC");
                  }}
                >
                  <Ionicons name="stats-chart" size={24} color="#10b981" />
                  <Text style={[styles.drawerItemText, { color: "#10b981" }]}>
                    Dashboard Commerce
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#10b981" />
                </TouchableOpacity>
                <View style={styles.drawerSeparator} />
              </>
            )}

            {/* Section Bog */}
            {isBlog && (
              <>
                <Text style={styles.drawerSectionTitle}>Mes Blogs</Text>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/blog/selector");
                  }}
                >
                  <Ionicons name="stats-chart" size={24} color="#10b981" />
                  <Text style={[styles.drawerItemText, { color: "#10b981" }]}>
                    Dashboard Blog
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#10b981" />
                </TouchableOpacity>
                <View style={styles.drawerSeparator} />
              </>
            )}

            {/* Section Admin (si admin) */}
            {isAdmin && (
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

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/admin/pending-commerce");
                  }}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={24}
                    color="#007bff"
                  />
                  <Text style={[styles.drawerItemText, { color: "#007bff" }]}>
                    Commerces en attente
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/admin/pending-blog");
                  }}
                >
                  <Ionicons name="time-outline" size={24} color="#007bff" />
                  <Text style={[styles.drawerItemText, { color: "#007bff" }]}>
                    Blogs en attente
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#007bff" />
                </TouchableOpacity>

                <View style={styles.drawerSeparator} />
              </>
            )}

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

          {/* Footer du menu */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ NOUVEAU : Styles pour le loading et modalContainer
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1, // ✅ CRUCIAL : permet à l'overlay de s'étendre
  },

  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
    zIndex: 10,
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
    width: 70,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1, // ✅ Derrière le drawer
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
    zIndex: 2, // ✅ Devant l'overlay
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 100,
  },
  publishCard: {
    gap: 15,
  },
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
  eventFields: {
    gap: 15,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 10,
  },
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
  infoText: {
    color: "rgb(212, 87, 87)",
    fontStyle: "italic",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 25,
  },
});
