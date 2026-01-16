// screens/blog/BlogDetailScreen.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";

const API_BASE_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

export default function BlogDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, token } = useAuth();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== FORMATTERS =====
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatContent = (content) => {
    return content?.replace(/<[^>]*>/g, "") || "";
  };

  const calculateReadTime = (content, speed = 225) => {
    const words = content?.split(/\s+/).length || 0;
    return Math.ceil(words / speed);
  };

  // ===== GET USER DATA (Comme dans BlogCard.js) =====
  const getUserData = (author) => {
    if (!author) return { name: "Anonyme", avatar: null, city: null };

    // Structure avec account
    if (author.account) {
      return {
        name: author.account.username || "Anonyme",
        avatar: author.account.avatar?.secure_url || null,
        city: author.location?.city || null,
      };
    }

    // Structure simple (fallback)
    return {
      name: author.name || "Anonyme",
      avatar: author.avatar?.secure_url || author.avatar || null,
      city: author.city || null,
    };
  };

  // ===== API CALLS =====
  const fetchBlog = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error("TOKEN_MISSING: Vous devez être connecté");
      }

      const response = await fetch(`${API_BASE_URL}/blog/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Blog non trouvé");
      }

      const data = await response.json();
      setBlog(data);

      // Enregistrer la vue
      await fetch(`${API_BASE_URL}/blog/${id}/view`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      setError(err.message);
      console.error("❌ Erreur fetchBlog:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async () => {
    try {
      if (!token) {
        Alert.alert("Erreur", "Vous devez être connecté pour liker");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/blog/${id}/like`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors du like");
      }

      const data = await response.json();

      setBlog((prev) => ({
        ...prev,
        likes: data.isLiked
          ? [...(prev.likes || []), user._id]
          : (prev.likes || []).filter((id) => id !== user._id),
        isLikedByCurrentUser: data.isLiked,
      }));
    } catch (error) {
      Alert.alert("Erreur", "Impossible de liker le blog");
    }
  };

  // ===== EFFECTS =====
  useEffect(() => {
    if (id && token) {
      fetchBlog();
    }
  }, [id, token]);

  // ===== RENDER =====
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !blog) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={70} color="#e74c3c" />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorMessage}>{error || "Blog introuvable"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchBlog}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ Récupérer les données utilisateur formatées
  const authorData = getUserData(blog.authorId);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={{ flex: 1 }}>
        {/* Header avec image */}
        {blog.images && blog.images.length > 0 ? (
          <Image source={{ uri: blog.images[0] }} style={styles.headerImage} />
        ) : (
          <View style={styles.placeholderHeaderImage}>
            <Ionicons name="image-outline" size={60} color="#ccc" />
          </View>
        )}

        {/* Bouton retour */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Contenu */}
        <View style={styles.content}>
          {/* Catégorie */}
          {blog.categorie && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{blog.categorie}</Text>
            </View>
          )}

          {/* Titre */}
          <Text style={styles.title}>{blog.title}</Text>

          {/* Meta infos - VERSION CORRIGÉE */}
          <View style={styles.metaRow}>
            {authorData.avatar ? (
              <Image
                source={{ uri: authorData.avatar }}
                style={styles.metaAvatar}
              />
            ) : (
              <View style={styles.metaAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#666" />
              </View>
            )}
            <Text style={styles.authorName}>{authorData.name}</Text>
            {authorData.city && (
              <>
                <Text style={styles.metaSeparator}>•</Text>
                <Text style={styles.metaText}>{authorData.city}</Text>
              </>
            )}
            <Text style={styles.metaSeparator}>•</Text>
            <Text style={styles.metaText}>{formatDate(blog.createdAt)}</Text>
            <Text style={styles.metaSeparator}>•</Text>
            <Text style={styles.metaText}>
              {calculateReadTime(blog.content, blog.readSpeed)} min
            </Text>
          </View>

          {/* Contenu du blog */}
          <Text style={styles.contentText}>{formatContent(blog.content)}</Text>

          {/* Stats bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={20} color="#888" />
              <Text style={styles.statValue}>{blog.views || 0}</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.likeButton,
                blog.isLikedByCurrentUser && styles.likeButtonActive,
              ]}
              onPress={toggleLike}
            >
              <Ionicons
                name={blog.isLikedByCurrentUser ? "heart" : "heart-outline"}
                size={24}
                color={blog.isLikedByCurrentUser ? "#fff" : "#e74c3c"}
              />
              <Text
                style={[
                  styles.likeButtonText,
                  blog.isLikedByCurrentUser && styles.likeButtonTextActive,
                ]}
              >
                {blog.isLikedByCurrentUser ? "Liked" : "Like"} (
                {blog.likes?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-social-outline" size={24} color="#3498db" />
              <Text style={styles.shareButtonText}>Partager</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  headerImage: {
    width: "100%",
    height: 250,
  },
  placeholderHeaderImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
    backgroundColor: "#fff",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#3498db",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 12,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  metaAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  metaAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  authorName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  metaSeparator: {
    marginHorizontal: 6,
    color: "#888",
  },
  metaText: {
    fontSize: 13,
    color: "#888",
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    marginBottom: 20,
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statValue: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e74c3c",
    flex: 1,
    justifyContent: "center",
  },
  likeButtonActive: {
    backgroundColor: "#e74c3c",
  },
  likeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#e74c3c",
    fontWeight: "600",
  },
  likeButtonTextActive: {
    color: "#fff",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#3498db",
    flex: 1,
    justifyContent: "center",
  },
  shareButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#3498db",
    fontWeight: "600",
  },
});
