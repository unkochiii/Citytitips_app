// app/admin/pending-posts.js
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
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

export default function PendingPosts() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // ✅ State pour le modal de rejet
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [postToReject, setPostToReject] = useState(null);

  const isAdmin = user?.role === "admin";

  const fetchPendingPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/posts/pending",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPosts(response.data.posts || []);
      setError("");
    } catch (err) {
      console.error("Erreur:", err);
      setError(err.response?.data?.message || "Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Redirection si pas admin
    if (!isAdmin) {
      Alert.alert("Accès refusé", "Vous n'avez pas les droits d'accès", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
      return;
    }

    fetchPendingPosts();
  }, [isAdmin, fetchPendingPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPendingPosts();
    setRefreshing(false);
  }, [fetchPendingPosts]);

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
          size={14}
          color={i <= rating ? "#FFD700" : "#ccc"}
          style={{ marginRight: 2 }}
        />
      );
    }

    return <View style={styles.starsContainer}>{stars}</View>;
  };

  // ✅ Approuver un post
  const handleApprove = (postId) => {
    Alert.alert(
      "Approuver la publication",
      "Voulez-vous approuver cette publication ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Approuver",
          onPress: async () => {
            try {
              setActionLoading(postId);

              await axios.put(
                `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${postId}/approve`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              setPosts((prev) => prev.filter((post) => post._id !== postId));
              Alert.alert("Succès", "Publication approuvée avec succès");
            } catch (err) {
              Alert.alert(
                "Erreur",
                err.response?.data?.message || "Erreur lors de l'approbation"
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // ✅ Ouvrir le modal de rejet
  const openRejectModal = (postId) => {
    setPostToReject(postId);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  // ✅ Confirmer le rejet
  const confirmReject = async () => {
    if (!postToReject) return;

    try {
      setActionLoading(postToReject);
      setRejectModalVisible(false);

      await axios.put(
        `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${postToReject}/reject`,
        { reason: rejectReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPosts((prev) => prev.filter((post) => post._id !== postToReject));
      Alert.alert("Succès", "Publication rejetée");
    } catch (err) {
      Alert.alert(
        "Erreur",
        err.response?.data?.message || "Erreur lors du rejet"
      );
    } finally {
      setActionLoading(null);
      setPostToReject(null);
      setRejectReason("");
    }
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

  // Si pas admin, ne rien afficher
  if (!isAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement...</Text>
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
        <Text style={styles.headerTitle}>Modération</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ✅ Compteur */}
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingCount}>
            {posts.length} publication{posts.length > 1 ? "s" : ""} en attente
          </Text>
        </View>

        {/* ✅ Message d'erreur */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={20} color="#721c24" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ✅ Message si aucun post */}
        {posts.length === 0 && !error ? (
          <View style={styles.noResults}>
            <Ionicons
              name="checkmark-circle-outline"
              size={60}
              color="#28a745"
            />
            <Text style={styles.noResultsText}>
              Aucune publication en attente de modération
            </Text>
          </View>
        ) : null}

        {/* ✅ Liste des posts */}
        {posts.map((post) => (
          <View key={post._id} style={styles.article}>
            {/* Sous-header avec type et badge pending */}
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
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>En attente</Text>
              </View>
            </View>

            {/* Contenu cliquable */}
            <TouchableOpacity
              onPress={() => router.push(`/post/${post._id}`)}
              activeOpacity={0.8}
            >
              {/* Avatar et infos auteur */}
              <View style={styles.avatarRow}>
                {post.authorId?.account?.avatar?.secure_url ? (
                  <Image
                    source={{ uri: post.authorId.account.avatar.secure_url }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>
                      {post.authorId?.account?.username
                        ?.charAt(0)
                        .toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
                <View style={styles.avatarInfo}>
                  <Text style={styles.username}>
                    {post.authorId?.account?.username || "Utilisateur inconnu"}
                  </Text>
                  <Text style={styles.dateText}>
                    Publié le{" "}
                    {new Date(post.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
                <Text style={styles.content} numberOfLines={3}>
                  {post.content}
                </Text>
              ) : null}

              {/* Catégorie */}
              {post.categorie ? (
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{post.categorie}</Text>
                </View>
              ) : null}

              {/* Infos EVENT */}
              {post.type === "event" && (
                <View style={styles.eventInfo}>
                  {post.lieu ? (
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#666"
                      />
                      <Text style={styles.infoText}>{post.lieu}</Text>
                    </View>
                  ) : null}
                  {post.dateEvent ? (
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#666"
                      />
                      <Text style={styles.infoText}>
                        {new Date(post.dateEvent).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  ) : null}
                  {post.nbParticipants ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="people-outline" size={14} color="#666" />
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
                  {post.nbStar !== undefined && post.nbStar !== null && (
                    <View style={styles.noteContainer}>
                      <Text style={styles.noteLabel}>Note :</Text>
                      {renderStars(post.nbStar)}
                      <Text style={styles.noteValue}>({post.nbStar}/5)</Text>
                    </View>
                  )}
                  {post.lieu ? (
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#666"
                      />
                      <Text style={styles.infoText}>{post.lieu}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Image du post */}
              {post.images && post.images.length > 0 && (
                <Image
                  source={{ uri: post.images[0].url }}
                  style={styles.postPreview}
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>

            {/* ✅ Boutons de modération */}
            <View style={styles.moderationActions}>
              <TouchableOpacity
                style={[
                  styles.approveBtn,
                  actionLoading === post._id && styles.btnDisabled,
                ]}
                onPress={() => handleApprove(post._id)}
                disabled={actionLoading === post._id}
              >
                {actionLoading === post._id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>Approuver</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rejectBtn,
                  actionLoading === post._id && styles.btnDisabled,
                ]}
                onPress={() => openRejectModal(post._id)}
                disabled={actionLoading === post._id}
              >
                {actionLoading === post._id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.rejectBtnText}>Rejeter</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Espace en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ✅ Modal pour la raison du rejet */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejeter la publication</Text>
            <Text style={styles.modalSubtitle}>
              Raison du rejet (optionnel) :
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Contenu inapproprié, spam, etc."
              placeholderTextColor="#999"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmReject}
              >
                <Text style={styles.modalConfirmBtnText}>
                  Confirmer le rejet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 10,
  },
  loadingText: {
    color: "#666",
    marginTop: 10,
  },

  // ========== HEADER ==========
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

  // ========== SCROLL ==========
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },

  // ========== PENDING HEADER ==========
  pendingHeader: {
    marginBottom: 15,
  },
  pendingCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },

  // ========== ERROR ==========
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8d7da",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    gap: 10,
  },
  errorText: {
    color: "#721c24",
    flex: 1,
  },

  // ========== NO RESULTS ==========
  noResults: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 15,
  },
  noResultsText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
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

  // ========== SOUS HEADER ==========
  sousHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sousHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  light: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  postType: {
    fontWeight: "bold",
    fontStyle: "italic",
    textTransform: "capitalize",
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: "#fff3cd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: "#856404",
    fontSize: 11,
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
  avatarInfo: {
    flex: 1,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
  },
  dateText: {
    color: "#999",
    fontSize: 11,
    marginTop: 2,
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

  // ========== CATEGORY TAG ==========
  categoryTag: {
    backgroundColor: "#e9ecef",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  categoryTagText: {
    fontSize: 11,
    color: "#495057",
    fontWeight: "500",
  },

  // ========== EVENT & RECO INFO ==========
  eventInfo: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 6,
  },
  recoInfo: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteLabel: {
    fontSize: 12,
    color: "#666",
  },
  starsContainer: {
    flexDirection: "row",
  },
  noteValue: {
    fontSize: 12,
    color: "#666",
  },

  // ========== POST PREVIEW ==========
  postPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 5,
  },

  // ========== MODERATION ACTIONS ==========
  moderationActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28a745",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  approveBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  rejectBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // ========== MODAL ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    backgroundColor: "#f9f9f9",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e9ecef",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#495057",
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#dc3545",
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: "#fff",
    fontWeight: "600",
  },

  // ========== BOTTOM SPACER ==========
  bottomSpacer: {
    height: 30,
  },
});
