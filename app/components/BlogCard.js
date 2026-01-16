import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

const BlogCard = ({ blog, onPress }) => {
  const router = useRouter();
  const { user, token } = useAuth();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateReadTime = (content, speed = 225) => {
    const words = content?.replace(/<[^>]*>/g, "").split(/\s+/).length || 0;
    return Math.ceil(words / speed);
  };

  const handlePress = async () => {
    const blogId = blog._id || blog.id;

    if (!blogId) {
      Alert.alert("Erreur", "Blog sans identifiant");
      return;
    }

    // ✅ UTILISATION DU TOKEN DU CONTEXTE
    if (token) {
      try {
        const url = `${API_BASE_URL}/blog/${encodeURIComponent(blogId)}/click`;
        await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Erreur clic:", err.message);
      }
    }

    // Navigation
    if (onPress) {
      onPress(blog);
    } else {
      router.push(`/blog/${blogId}`);
    }
  };

  // ✅ DEBUG: Log la structure de authorId
  console.log("🔍 BlogCard - authorId structure:", {
    hasAuthor: !!blog.authorId,
    authorIdKeys: blog.authorId ? Object.keys(blog.authorId) : [],
    authorName: blog.authorId?.name || "N/A",
    hasAccount: !!blog.authorId?.account,
    hasAvatar: !!blog.authorId?.account?.avatar,
    avatarUrl: blog.authorId?.account?.avatar?.secure_url || "N/A",
  });

  // ✅ GET USER DATA - Fonction robuste
  const getUserData = () => {
    const author = blog.authorId;

    // Structure 1: Si authorId a account (comme dans vos données utilisateur)
    if (author?.account) {
      return {
        name: author.account.username || author.name || "Anonyme",
        avatar: author.account.avatar?.secure_url || null,
      };
    }

    // Structure 2: Si authorId est directement l'utilisateur
    if (author?.avatar?.secure_url) {
      return {
        name: author.name || "Anonyme",
        avatar: author.avatar.secure_url,
      };
    }

    // Structure 3: Si avatar est une string simple
    if (author?.avatar) {
      return {
        name: author.name || "Anonyme",
        avatar: author.avatar,
      };
    }

    // Default
    return {
      name: author?.name || "Anonyme",
      avatar: null,
    };
  };

  const userData = getUserData();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Image */}
      {blog.images && blog.images.length > 0 ? (
        <Image
          source={{ uri: blog.images[0] }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Ionicons name="image-outline" size={50} color="#ccc" />
        </View>
      )}

      {/* Catégorie */}
      {blog.categorie && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{blog.categorie}</Text>
        </View>
      )}

      {/* Contenu */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {blog.title}
        </Text>

        <Text style={styles.cardExcerpt} numberOfLines={2}>
          {blog.content?.replace(/<[^>]*>/g, "").substring(0, 120)}...
        </Text>

        {/* Auteur - VERSION CORRIGÉE */}
        <View style={styles.authorRow}>
          {userData.avatar ? (
            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={14} color="#666" />
            </View>
          )}
          <Text style={styles.authorName}>{userData.name}</Text>
        </View>

        {/* Stats */}
        <View style={styles.cardFooter}>
          <View style={styles.stat}>
            <Ionicons name="calendar-outline" size={12} color="#888" />
            <Text style={styles.statText}>{formatDate(blog.createdAt)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={12} color="#888" />
            <Text style={styles.statText}>
              {calculateReadTime(blog.content, blog.readSpeed)} min
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name={blog.isLikedByCurrentUser ? "heart" : "heart-outline"}
              size={12}
              color={blog.isLikedByCurrentUser ? "#e74c3c" : "#888"}
            />
            <Text style={styles.statText}>{blog.likes?.length || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: 160,
  },
  placeholderImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#3498db",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 6,
    lineHeight: 22,
  },
  cardExcerpt: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  authorName: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 11,
    color: "#888",
    marginLeft: 4,
  },
});

// ✅ SEULEMENT UN export default
export default BlogCard;
