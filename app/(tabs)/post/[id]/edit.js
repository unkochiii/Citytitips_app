// app/(tabs)/post/[id]/edit.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../../../context/AuthContext";
import axios from "axios";
import { Ionicons, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

const PostEdit = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [post, setPost] = useState({
    titre: "",
    content: "",
    categorie: "",
    type: "",
    lieu: "",
    dateEvent: "",
    nbParticipants: "",
    description: "",
    nbStar: 0,
  });
  const [originalPost, setOriginalPost] = useState(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Charger le token et user
  const { token: authToken, user: authUser } = useAuth();

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("userToken");
        const storedUser = await SecureStore.getItemAsync("userData");
        const usedToken = storedToken || authToken;

        if (!usedToken) {
          router.replace("/(auth)/login");
          return;
        }

        setToken(usedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else if (authUser) {
          setUser(authUser);
        }
      } catch (err) {
        console.error("Erreur auth:", err);
        router.replace("/(auth)/login");
      }
    };

    loadAuth();
  }, [authToken, authUser]);

  // Charger les données du post
  useEffect(() => {
    const fetchPost = async () => {
      if (!token || !id) return;

      try {
        const response = await axios.get(
          `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const postData = response.data;
        console.log("Post récupéré:", postData);

        const dateEvent = postData.dateEvent
          ? new Date(postData.dateEvent)
          : new Date();

        setPost({
          titre: postData.titre || "",
          content: postData.content || "",
          categorie: postData.categorie || "",
          type: postData.type || "",
          lieu: postData.lieu || "",
          dateEvent: postData.dateEvent || "",
          nbParticipants: postData.nbParticipants?.toString() || "",
          description: postData.description || "",
          nbStar: postData.nbStar || 0,
        });

        setSelectedDate(dateEvent);
        setOriginalPost(postData);

        if (postData.imgUrl) {
          setImagePreview(postData.imgUrl);
        }

        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement du post");
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [token, id]);

  const handleChange = (name, value) => {
    setPost({
      ...post,
      [name]: value,
    });
  };

  // Sélection d'image
  const handleImageChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à la galerie."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
      setImagePreview(result.assets[0].uri);
    }
  };

  // Gestion du DatePicker
  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      setPost({
        ...post,
        dateEvent: date.toISOString(),
      });
    }
  };

  // Formater la date pour l'affichage
  const formatDate = (date) => {
    if (!date) return "Sélectionner une date";
    const d = new Date(date);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Sélecteur d'étoiles
  const renderStarSelector = () => {
    return (
      <View style={styles.starsSelector}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setPost({ ...post, nbStar: star })}
            style={styles.starBtn}
          >
            <FontAwesome
              name={post.nbStar >= star ? "star" : "star-o"}
              size={28}
              color={post.nbStar >= star ? "#ffc107" : "#ddd"}
            />
          </TouchableOpacity>
        ))}
        <Text style={styles.noteValue}>({post.nbStar || 0}/5)</Text>
      </View>
    );
  };

  // Couleur selon le type
  const getTypeColor = () => {
    switch (post.type) {
      case "event":
        return "#4CAF50";
      case "recommandation":
        return "#FF9800";
      case "discussion":
        return "#2196F3";
      default:
        return "#999";
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("titre", post.titre);
      formData.append("content", post.content);

      if (post.type === "event") {
        formData.append("lieu", post.lieu);
        formData.append("dateEvent", post.dateEvent);
        formData.append("nbParticipants", post.nbParticipants);
        formData.append("description", post.description);
      }

      if (post.type === "recommandation") {
        formData.append("lieu", post.lieu);
        formData.append("nbStar", post.nbStar.toString());
        formData.append("description", post.description);
      }

      if (post.type === "discussion") {
        formData.append("description", post.description);
      }

      if (image) {
        const uri = image.uri;
        const filename = uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("picture", {
          uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
          name: filename,
          type: type,
        });
      }

      await axios.put(
        `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      Alert.alert("Succès", "Publication mise à jour avec succès !", [
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
        <ActivityIndicator size="large" color="#007bff" />
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
      {/* Bouton retour */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#007bff" />
        <Text style={styles.backBtnText}>Retour</Text>
      </TouchableOpacity>

      <Text style={styles.editTitle}>Modifier la publication</Text>

      {error && <Text style={styles.errorMessage}>{error}</Text>}

      {/* Article */}
      <View style={styles.editArticle}>
        {/* Sous-header avec type */}
        <View style={styles.sousHeader}>
          <View style={styles.typeContainer}>
            <View style={[styles.light, { backgroundColor: getTypeColor() }]} />
            <Text style={styles.postType}>{post.type}</Text>
          </View>
        </View>

        {/* Header du post - Avatar et infos */}
        <View style={styles.headerPost}>
          <View style={styles.profile}>
            {originalPost?.authorId?.account?.avatar?.secure_url ? (
              <Image
                source={{
                  uri: originalPost.authorId.account.avatar.secure_url,
                }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {originalPost?.authorId?.account?.username
                    ?.charAt(0)
                    .toUpperCase() ||
                    user?.account?.username?.charAt(0).toUpperCase() ||
                    "?"}
                </Text>
              </View>
            )}
            <View style={styles.avatarInfo}>
              <Text style={styles.username}>
                {originalPost?.authorId?.account?.username ||
                  user?.account?.username ||
                  "Vous"}
              </Text>
              <Text style={styles.dateText}>
                Publié le{" "}
                {originalPost?.createdAt
                  ? new Date(originalPost.createdAt).toLocaleDateString("fr-FR")
                  : new Date().toLocaleDateString("fr-FR")}
              </Text>
            </View>
          </View>
        </View>

        {/* Champ Titre */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={[styles.editInput, styles.editTitre]}
            value={post.titre}
            onChangeText={(value) => handleChange("titre", value)}
            placeholder="Titre de la publication"
            placeholderTextColor="#999"
          />
        </View>

        {/* Champ Description */}
        {(post.type === "event" ||
          post.type === "recommandation" ||
          post.type === "discussion") && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.editInput, styles.editDescription]}
              value={post.description}
              onChangeText={(value) => handleChange("description", value)}
              placeholder="Description..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Champ Contenu */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Contenu</Text>
          <TextInput
            style={[styles.editInput, styles.editContent]}
            value={post.content}
            onChangeText={(value) => handleChange("content", value)}
            placeholder="Contenu de la publication..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Infos EVENT */}
        {post.type === "event" && (
          <View style={styles.editEventInfo}>
            {/* Lieu */}
            <View style={styles.inlineGroup}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <TextInput
                style={[styles.editInput, styles.inlineInput]}
                value={post.lieu}
                onChangeText={(value) => handleChange("lieu", value)}
                placeholder="Lieu de l'événement"
                placeholderTextColor="#999"
              />
            </View>

            {/* Date */}
            <View style={styles.inlineGroup}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <TouchableOpacity
                style={[styles.editInput, styles.inlineInput, styles.dateInput]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.dateInputText,
                    !post.dateEvent && styles.placeholderText,
                  ]}
                >
                  {formatDate(post.dateEvent)}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* Participants */}
            <View style={styles.inlineGroup}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <TextInput
                style={[styles.editInput, styles.inlineInput]}
                value={post.nbParticipants}
                onChangeText={(value) => handleChange("nbParticipants", value)}
                placeholder="Nombre max"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              <Text style={styles.inputSuffix}>participants max</Text>
            </View>
          </View>
        )}

        {/* Infos RECOMMANDATION */}
        {post.type === "recommandation" && (
          <View style={styles.editRecoInfo}>
            {/* Note avec étoiles */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Note</Text>
              {renderStarSelector()}
            </View>

            {/* Lieu */}
            <View style={styles.inlineGroup}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <TextInput
                style={[styles.editInput, styles.inlineInput]}
                value={post.lieu}
                onChangeText={(value) => handleChange("lieu", value)}
                placeholder="Lieu recommandé"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        )}

        {/* Section Image */}
        <View style={styles.imageSection}>
          {imagePreview && (
            <Image source={{ uri: imagePreview }} style={styles.postPreview} />
          )}
          <TouchableOpacity
            onPress={handleImageChange}
            style={styles.imageUploadBtn}
          >
            <Ionicons name="camera-outline" size={20} color="#555" />
            <Text style={styles.imageUploadBtnText}>
              {imagePreview ? "Changer l'image" : "Ajouter une image"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.editActions}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
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
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 16,
    color: "#007bff",
    marginLeft: 5,
    fontWeight: "600",
  },
  editTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  errorMessage: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    overflow: "hidden",
  },
  editArticle: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sousHeader: {
    marginBottom: 15,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  light: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  postType: {
    fontSize: 14,
    color: "#666",
    textTransform: "capitalize",
  },
  headerPost: {
    marginBottom: 20,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  avatarInfo: {
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  editInput: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fafafa",
    color: "#333",
  },
  editTitre: {
    fontSize: 18,
    fontWeight: "600",
  },
  editDescription: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  editContent: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  editEventInfo: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  editRecoInfo: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  inlineGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inlineInput: {
    flex: 1,
    marginLeft: 10,
  },
  dateInput: {
    justifyContent: "center",
  },
  dateInputText: {
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    color: "#999",
  },
  inputSuffix: {
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
  },
  starsSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  starBtn: {
    padding: 5,
  },
  noteValue: {
    fontSize: 14,
    color: "#666",
    marginLeft: 15,
  },
  imageSection: {
    marginTop: 20,
    alignItems: "center",
  },
  postPreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: "cover",
  },
  imageUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  imageUploadBtnText: {
    fontSize: 15,
    color: "#555",
    marginLeft: 8,
  },
  editActions: {
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  submitBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#007bff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PostEdit;
