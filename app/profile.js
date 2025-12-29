// app/profile.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const router = useRouter();
  const { token, user: authUser } = useAuth();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const userResponse = await axios.get(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/profile",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const postsResponse = await axios.get(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/profile/posts",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUser(userResponse.data);
      setPosts(postsResponse.data.posts || []);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  }, [fetchProfileData]);

  // ✅ Fonction pour afficher les étoiles de notation
  const renderStars = (note) => {
    const maxStars = 5;
    const rating = Math.min(Math.max(0, note || 0), maxStars);
    const stars = [];

    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <FontAwesome
          key={i}
          name={i <= rating ? "star" : "star-o"}
          size={16}
          color={i <= rating ? "#FFD700" : "#ccc"}
          style={{ marginRight: 2 }}
        />
      );
    }

    return <View style={styles.starsContainer}>{stars}</View>;
  };

  // ✅ Fonction pour gérer les likes
  const handleLike = async (postId) => {
    try {
      const response = await axios.post(
        `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${postId}/toggle-like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likesCount: response.data.likesCount,
                hasLiked: response.data.hasLiked,
              }
            : post
        )
      );
    } catch (error) {
      console.log("Erreur lors du like:", error);
    }
  };

  // ✅ Fonction pour supprimer un post
  const handleDeletePost = (postId) => {
    Alert.alert(
      "Supprimer la publication",
      "Êtes-vous sûr de vouloir supprimer cette publication ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${postId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              setPosts((prevPosts) =>
                prevPosts.filter((post) => post._id !== postId)
              );

              Alert.alert("Succès", "Publication supprimée avec succès");
            } catch (error) {
              console.log("Erreur lors de la suppression:", error);
              Alert.alert(
                "Erreur",
                error.response?.data?.message ||
                  "Erreur lors de la suppression de la publication"
              );
            }
          },
        },
      ]
    );
  };

  // ✅ Fonction pour obtenir la couleur du type
  const getTypeColor = (type) => {
    switch (type) {
      case "event":
        return "#ffdd11";
      case "recommandation":
        return "#eca305";
      case "vente":
        return "#0d7dca";
      case "question":
        return "#142247";
      default:
        return "#999";
    }
  };

  // ✅ Fonction pour obtenir la couleur du statut
  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return { backgroundColor: "#fff3cd", color: "#856404" };
      case "rejected":
        return { backgroundColor: "#f8d7da", color: "#721c24" };
      case "approved":
        return { backgroundColor: "#d4edda", color: "#155724" };
      default:
        return { backgroundColor: "#e2e3e5", color: "#383d41" };
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon profil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ========== SECTION PROFIL ========== */}
        <View style={styles.profileCard}>
          {/* Bouton modifier le profil */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push("/profile/edit")}
          >
            <Text style={styles.editProfileBtnText}>Modifier le profil</Text>
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.profileHeader}>
            {user?.account?.avatar?.secure_url ? (
              <Image
                source={{ uri: user.account.avatar.secure_url }}
                style={styles.profileAvatar}
              />
            ) : (
              <View style={styles.profileAvatarPlaceholder}>
                <Text style={styles.profileAvatarText}>
                  {user?.account?.username?.charAt(0).toUpperCase() ||
                    authUser?.username?.charAt(0).toUpperCase() ||
                    "?"}
                </Text>
              </View>
            )}

            <Text style={styles.profileUsername}>
              {user?.account?.username || authUser?.username || "Utilisateur"}
            </Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>publications</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Séparateur */}
        <View style={styles.separator} />

        {/* ========== SECTION PUBLICATIONS ========== */}
        <Text style={styles.sectionTitle}>Mes Publications</Text>

        {posts.length === 0 ? (
          <View style={styles.noPosts}>
            <Ionicons name="document-text-outline" size={50} color="#999" />
            <Text style={styles.noPostsText}>
              Vous n'avez pas encore de publications.
            </Text>
            <TouchableOpacity
              style={styles.createPostBtn}
              onPress={() => router.push("/(tabs)/create")}
            >
              <Text style={styles.createPostBtnText}>
                Créer ma première publication
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post._id} style={styles.article}>
              {/* Sous-header avec type et statut */}
              <View style={styles.sousHeader}>
                <View style={styles.sousHeaderLeft}>
                  <View
                    style={[
                      styles.light,
                      { backgroundColor: getTypeColor(post.type) },
                    ]}
                  />
                  <Text style={styles.postType}>{post.type}</Text>
                </View>

                {/* Badge de statut */}
                {post.status && post.status !== "approved" && (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusStyle(post.status)
                          .backgroundColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusStyle(post.status).color },
                      ]}
                    >
                      {post.status === "pending" && "En attente"}
                      {post.status === "rejected" && "Rejeté"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Contenu cliquable */}
              <TouchableOpacity
                onPress={() => router.push(`/post/${post._id}`)}
                activeOpacity={0.8}
              >
                {/* Avatar et infos auteur */}
                <View style={styles.avatarRow}>
                  {user?.account?.avatar?.secure_url ? (
                    <Image
                      source={{ uri: user.account.avatar.secure_url }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {user?.account?.username?.charAt(0).toUpperCase() ||
                          "?"}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.username}>
                      {user?.account?.username}
                    </Text>
                    <Text style={styles.dateText}>
                      Publié le{" "}
                      {new Date(post.createdAt).toLocaleDateString("fr-FR")}
                    </Text>
                  </View>
                </View>

                {/* Titre */}
                <Text style={styles.titre}>{post.titre}</Text>

                {/* Description */}
                {post.description ? (
                  <Text style={styles.description}>{post.description}</Text>
                ) : null}

                {/* Contenu */}
                {post.content ? (
                  <Text style={styles.content} numberOfLines={2}>
                    {post.content}
                  </Text>
                ) : null}

                {/* Infos EVENT */}
                {post.type === "event" && (
                  <View style={styles.eventInfo}>
                    {post.lieu ? (
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="#666"
                        />
                        <Text style={styles.infoText}>{post.lieu}</Text>
                      </View>
                    ) : null}
                    {post.dateEvent ? (
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#666"
                        />
                        <Text style={styles.infoText}>
                          {new Date(post.dateEvent).toLocaleDateString("fr-FR")}
                        </Text>
                      </View>
                    ) : null}
                    {post.nbParticipants ? (
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="people-outline"
                          size={16}
                          color="#666"
                        />
                        <Text style={styles.infoText}>
                          {post.nbParticipants} participants Max
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Infos RECOMMANDATION avec étoiles */}
                {post.type === "recommandation" && (
                  <View style={styles.recoInfo}>
                    {post.note !== undefined && post.note !== null && (
                      <View style={styles.noteContainer}>
                        <Text style={styles.noteLabel}>Note :</Text>
                        {renderStars(post.note)}
                        <Text style={styles.noteValue}>({post.note}/5)</Text>
                      </View>
                    )}
                    {post.lieu ? (
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="#666"
                        />
                        <Text style={styles.infoText}>{post.lieu}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Image preview */}
                {post.images && post.images.length > 0 && (
                  <Image
                    source={{ uri: post.images[0].url }}
                    style={styles.postPreview}
                    resizeMode="cover"
                  />
                )}
              </TouchableOpacity>

              {/* Section interactions */}
              <View style={styles.interaction}>
                {post.status === "rejected" ? (
                  /* Si le post est rejeté, afficher la raison */
                  <View style={styles.rejectionContainer}>
                    <Text style={styles.rejectionTitle}>Raison du rejet :</Text>
                    <Text style={styles.rejectionText}>
                      {post.rejectionReason || "Aucune raison spécifiée"}
                    </Text>
                  </View>
                ) : post.status === "pending" ? (
                  /* Si le post est en attente */
                  <View style={styles.pendingContainer}>
                    <Ionicons name="time-outline" size={18} color="#856404" />
                    <Text style={styles.pendingText}>
                      En attente de validation
                    </Text>
                  </View>
                ) : (
                  /* Si approuvé, afficher like/comment */
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleLike(post._id)}
                    >
                      <FontAwesome
                        name={post.hasLiked ? "heart" : "heart-o"}
                        size={18}
                        color={post.hasLiked ? "#e74c3c" : "#666"}
                      />
                      <Text style={styles.actionNumber}>
                        {post.likesCount || 0}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => router.push(`/post/${post._id}`)}
                    >
                      <FontAwesome name="comment-o" size={18} color="#666" />
                      <Text style={styles.actionNumber}>
                        {post.commentsCount || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Boutons modifier/supprimer */}
                <View style={styles.ownerActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push(`/post/${post._id}/edit`)}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#fff" />
                    <Text style={styles.editBtnText}>Modifier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeletePost(post._id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Espace en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },

  // ========== PROFILE CARD ==========
  profileCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 15,
    padding: 20,
  },
  editProfileBtn: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  editProfileBtnText: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "600",
  },
  profileHeader: {
    alignItems: "center",
    gap: 10,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarText: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
  },
  profileUsername: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
  },

  // ========== SEPARATOR ==========
  separator: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 20,
  },

  // ========== SECTION TITLE ==========
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },

  // ========== NO POSTS ==========
  noPosts: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 15,
  },
  noPostsText: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
  },
  createPostBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 10,
  },
  createPostBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },

  // ========== ARTICLE ==========
  article: {
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sousHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sousHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  light: {
    width: 15,
    height: 15,
    borderRadius: 5,
  },
  postType: {
    fontWeight: "bold",
    fontStyle: "italic",
    textTransform: "capitalize",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ========== AVATAR ROW ==========
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
  },
  dateText: {
    color: "#999",
    fontSize: 12,
  },

  // ========== POST CONTENT ==========
  titre: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    lineHeight: 20,
  },
  content: {
    fontSize: 13,
    color: "#888",
    marginBottom: 10,
    lineHeight: 18,
  },

  // ========== EVENT & RECO INFO ==========
  eventInfo: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  recoInfo: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#666",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteLabel: {
    fontSize: 13,
    color: "#666",
  },
  starsContainer: {
    flexDirection: "row",
  },
  noteValue: {
    fontSize: 13,
    color: "#666",
  },

  // ========== POST PREVIEW ==========
  postPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
  },

  // ========== INTERACTION ==========
  interaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionNumber: {
    color: "#666",
    fontSize: 14,
  },

  // ========== REJECTION & PENDING ==========
  rejectionContainer: {
    flex: 1,
    backgroundColor: "#f8d7da",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  rejectionTitle: {
    fontWeight: "bold",
    color: "#721c24",
    fontSize: 12,
  },
  rejectionText: {
    color: "#721c24",
    fontSize: 12,
    marginTop: 3,
  },
  pendingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  pendingText: {
    color: "#856404",
    fontSize: 12,
    fontWeight: "600",
  },

  // ========== OWNER ACTIONS ==========
  ownerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#e74c3c",
    padding: 8,
    borderRadius: 8,
  },

  // ========== BOTTOM SPACER ==========
  bottomSpacer: {
    height: 30,
  },
});
