// src/screens/AdminModerationScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const API_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

const AdminModerationScreen = () => {
  const router = useRouter();

  // État global
  const [blogs, setBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [blogToReject, setBlogToReject] = useState(null);
  const [user, setUser] = useState(null); // ✅ AJOUT ÉTAT USER

  // 🔍 RÉCUPÉRATION DU TOKEN & USER
  const getAuthData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("user");

      let roles = [];
      let parsedUser = null;
      if (userData) {
        try {
          parsedUser = JSON.parse(userData); // ✅ PASSEZ À L'ÉTAT
          roles = parsedUser.roles || parsedUser.data?.roles || [];
        } catch (e) {
          console.error("❌ Erreur parsing user:", e);
        }
      }

      return { token, roles, user: parsedUser }; // ✅ RETOURNE USER
    } catch (error) {
      console.error("❌ Erreur récupération auth:", error);
      return { token: null, roles: [], user: null };
    }
  };

  // 📡 Fonction pour récupérer les blogs
  const fetchPendingBlogs = useCallback(async () => {
    console.log("========== FETCH PENDING BLOGS START ==========");
    const authData = await getAuthData();
    console.log("🔍 Token exists:", !!authData.token);
    console.log("🔍 User roles:", authData.roles);

    // ✅ POPULER L'ÉTAT USER
    setUser(authData.user);

    if (!authData.token) {
      setError("Non authentifié");
      setIsLoading(false);
      return;
    }

    if (!authData.roles.includes("admin")) {
      setError("Accès refusé - Droits administrateur requis");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${authData.token}`,
        "Content-Type": "application/json",
      };

      console.log("🔍 Making request to /blog?status=pending...");

      const response = await fetch(`${API_URL}/blog?status=pending`, {
        headers,
      });

      console.log("✅ Response status:", response.status);

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert("Session expirée", "Veuillez vous reconnecter", [
            { text: "OK", onPress: () => router.replace("/login") },
          ]);
        } else if (response.status === 403) {
          Alert.alert(
            "Accès refusé",
            "Vous n'avez pas les permissions nécessaires",
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Response data structure:", Object.keys(data));
      console.log("✅ Blogs found:", data.blogs?.length || 0);

      setBlogs(data.blogs || []);
    } catch (err) {
      console.error("❌ Error:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
      console.log("========== FETCH PENDING BLOGS END ==========");
    }
  }, [router]);

  // 🚀 Fonction pour modérer
  const moderateBlog = async (blogId, status, reason = "") => {
    setActionLoading(blogId);

    const authData = await getAuthData();
    if (!authData.token) {
      Alert.alert("❌ Erreur", "Token perdu");
      setActionLoading(null);
      return;
    }

    try {
      const body = { status };
      if (status === "rejected" && reason) body.rejectionReason = reason;

      const response = await fetch(`${API_URL}/blog/${blogId}/moderate`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authData.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || "Erreur lors de la modération");
      }

      // ✅ Supprimer le blog de la liste
      setBlogs((prev) => prev.filter((b) => b._id !== blogId));
      Alert.alert(
        "✅ Succès",
        `Blog ${status === "approved" ? "approuvé" : "rejeté"}`
      );
    } catch (error) {
      Alert.alert("❌ Erreur", error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = (blogId) => {
    Alert.alert(
      "Approuver le blog",
      "Êtes-vous sûr de vouloir approuver ce blog ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Approuver",
          style: "default",
          onPress: () => moderateBlog(blogId, "approved"),
        },
      ]
    );
  };

  const openRejectModal = (blogId) => {
    setBlogToReject(blogId);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!blogToReject) return;

    await moderateBlog(blogToReject, "rejected", rejectReason);
    setRejectModalVisible(false);
    setBlogToReject(null);
    setRejectReason("");
  };

  // 🔄 useEffect
  useEffect(() => {
    fetchPendingBlogs();
  }, [fetchPendingBlogs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPendingBlogs();
    setRefreshing(false);
  }, [fetchPendingBlogs]);

  // ✅ Loading state
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>
          Chargement des blogs en attente...
        </Text>
      </View>
    );
  }

  // ========== RENDU PRINCIPAL ==========
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modération Blogs</Text>
        <View style={styles.headerRight}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info utilisateur */}
        <View style={styles.userInfoContainer}>
          <Ionicons name="person-circle-outline" size={16} color="#007bff" />
          <Text style={styles.userInfoText}>
            Connecté en tant que : {user?.username || "Admin"} (admin)
          </Text>
        </View>

        {/* Compteur */}
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingCount}>
            {blogs.length} blog{blogs.length > 1 ? "s" : ""} en attente
          </Text>
        </View>

        {/* Message d'erreur */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={20} color="#721c24" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Liste des blogs */}
        {blogs.length === 0 && !error ? (
          <View style={styles.noResults}>
            <Ionicons
              name="checkmark-circle-outline"
              size={60}
              color="#28a745"
            />
            <Text style={styles.noResultsText}>Aucun blog en attente</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={18} color="#007bff" />
              <Text style={styles.refreshBtnText}>Actualiser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          blogs.map((blog) => (
            <View key={blog._id} style={styles.article}>
              {/* Sous-header */}
              <View style={styles.sousHeader}>
                <View style={styles.sousHeaderLeft}>
                  <View
                    style={[styles.light, { backgroundColor: "#eca305" }]}
                  />
                  <Text style={styles.postType}>blog</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>En attente</Text>
                </View>
              </View>

              {/* Contenu */}
              <View style={styles.contentContainer}>
                {/* Auteur */}
                <View style={styles.avatarRow}>
                  {blog.authorId?.avatar?.secure_url ? (
                    <Image
                      source={{ uri: blog.authorId.avatar.secure_url }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {blog.authorId?.name?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.avatarInfo}>
                    <Text style={styles.username}>
                      {blog.authorId?.name || "Auteur"}
                    </Text>
                    <Text style={styles.dateText}>
                      {new Date(blog.createdAt).toLocaleDateString("fr-FR", {
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
                <Text style={styles.titre}>{blog.title || "Sans titre"}</Text>

                {/* Contenu */}
                <Text style={styles.description} numberOfLines={3}>
                  {blog.content}
                </Text>

                {/* Catégorie */}
                {blog.categorie && (
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{blog.categorie}</Text>
                  </View>
                )}

                {/* Ville */}
                {blog.city && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.infoText}>{blog.city}</Text>
                  </View>
                )}

                {/* Stats */}
                <View style={styles.statsContainer}>
                  <Text style={styles.stat}>📖 {blog.wordCount} mots</Text>
                  <Text style={styles.stat}>⏱️ {blog.readTimeFormatted}</Text>
                </View>

                {/* Images */}
                {blog.images && blog.images.length > 0 && (
                  <Image
                    source={{ uri: blog.images[0].url }}
                    style={styles.postPreview}
                    resizeMode="cover"
                  />
                )}

                {/* Boutons de modération */}
                <View style={styles.moderationActions}>
                  <TouchableOpacity
                    style={[
                      styles.approveBtn,
                      actionLoading === blog._id && styles.btnDisabled,
                    ]}
                    onPress={() => handleApprove(blog._id)}
                    disabled={actionLoading === blog._id}
                  >
                    {actionLoading === blog._id ? (
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
                      actionLoading === blog._id && styles.btnDisabled,
                    ]}
                    onPress={() => openRejectModal(blog._id)}
                    disabled={actionLoading === blog._id}
                  >
                    {actionLoading === blog._id ? (
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
            </View>
          ))
        )}

        {/* Espace en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal de rejet */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejeter le blog</Text>
            <Text style={styles.modalSubtitle}>Motif du rejet :</Text>

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
};

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
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

  // Header
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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

  // User info
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
    gap: 8,
  },
  userInfoText: {
    fontSize: 12,
    color: "#007bff",
    fontWeight: "500",
    flex: 1,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },

  // Pending header
  pendingHeader: {
    marginBottom: 15,
  },
  pendingCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },

  // Error
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
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
  retryBtn: {
    backgroundColor: "#721c24",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // No results
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
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  refreshBtnText: {
    color: "#007bff",
    fontWeight: "600",
  },

  // Article
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

  // Sous-header
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

  // Avatar
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

  // Content
  contentContainer: {
    paddingBottom: 10,
  },
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
  statsContainer: {
    flexDirection: "row",
    gap: 15,
    marginVertical: 10,
  },
  stat: {
    fontSize: 12,
    color: "#666",
  },
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
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
  },

  // Image
  postPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 5,
  },

  // Modération actions
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

  // Modal
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

  // Bottom spacer
  bottomSpacer: {
    height: 30,
  },
});

export default AdminModerationScreen;
