// app/(tabs)/events.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export default function Events() {
  const router = useRouter();
  const { token, user, logout } = useAuth();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await axios.get(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/posts",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // ✅ Filtrer uniquement les events
      const approvedEvents =
        response.data.posts?.filter((post) => post.type === "event") || [];

      setData({ posts: approvedEvents });
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [fetchData, token]);

  // ✅ Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ✅ Filtrage des posts basé sur la recherche
  const filteredPosts = useMemo(() => {
    if (!data?.posts) return [];
    if (!searchQuery.trim()) return data.posts;

    const query = searchQuery.toLowerCase().trim();

    return data.posts.filter((post) => {
      const titleMatch = post.titre?.toLowerCase().includes(query);
      const descriptionMatch = post.description?.toLowerCase().includes(query);
      const contentMatch = post.content?.toLowerCase().includes(query);
      const lieuMatch = post.lieu?.toLowerCase().includes(query);
      const authorMatch = post.authorId?.account?.username
        ?.toLowerCase()
        .includes(query);
      const dateMatch = post.dateEvent
        ? new Date(post.dateEvent).toLocaleDateString().includes(query)
        : false;

      return (
        titleMatch ||
        descriptionMatch ||
        contentMatch ||
        lieuMatch ||
        authorMatch ||
        dateMatch
      );
    });
  }, [data?.posts, searchQuery]);

  // ✅ Fonction Like
  const handleLike = async (postId) => {
    try {
      const response = await axios.post(
        `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${postId}/toggle-like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setData((prevData) => ({
        ...prevData,
        posts: prevData.posts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likesCount: response.data.likesCount,
                hasLiked: response.data.hasLiked,
              }
            : post
        ),
      }));
    } catch (error) {
      console.log("Erreur lors du like:", error);
    }
  };

  // ✅ Fonction Supprimer (Admin)
  const handleDeletePost = (postId) => {
    Alert.alert(
      "Confirmation",
      "Voulez-vous vraiment supprimer cet événement ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `https://api--tanjablabla--t4nqvl4d28d8.code.run/admin/post/${postId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              setData((prevData) => ({
                ...prevData,
                posts: prevData.posts.filter((post) => post._id !== postId),
              }));
            } catch (error) {
              console.log("Erreur lors de la suppression:", error);
              Alert.alert(
                "Erreur",
                error.response?.data?.message || "Erreur lors de la suppression"
              );
            }
          },
        },
      ]
    );
  };

  // ✅ Redirection si pas connecté
  if (!token) {
    return null;
  }

  // ✅ Loading
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffdd11" />
        <Text style={styles.loadingText}>Chargement des événements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* ✅ HEADER avec menu burger */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.burgerBtn}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Événements</Text>
        </View>

        {/* Placeholder pour équilibrer le header */}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#ffdd11"]}
            tintColor="#ffdd11"
          />
        }
      >
        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par titre, auteur, lieu..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          {searchQuery ? (
            <Text style={styles.searchResultsCount}>
              {filteredPosts.length} résultat(s) trouvé(s)
            </Text>
          ) : null}
        </View>

        {/* Message si aucun résultat */}
        {filteredPosts.length === 0 && (
          <View style={styles.noResults}>
            <Ionicons name="calendar-outline" size={60} color="#ffdd11" />
            <Text style={styles.noResultsText}>
              {searchQuery
                ? `Aucun événement ne correspond à "${searchQuery}"`
                : "Aucun événement pour le moment."}
            </Text>
          </View>
        )}

        {/* Liste des événements */}
        {filteredPosts.map((post) => (
          <TouchableOpacity
            key={post._id}
            style={styles.article}
            onPress={() => router.push(`/post/${post._id}`)}
            activeOpacity={0.9}
          >
            {/* Header du post */}
            <View style={styles.sousHeader}>
              <View style={styles.sousHeaderLeft}>
                <View style={[styles.light, styles.lightEvent]} />
                <Text style={styles.postType}>{post.type}</Text>
              </View>
            </View>

            {/* Profil auteur */}
            <View style={styles.avatar}>
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
                  {post.authorId?.account?.username}
                </Text>
                <Text style={styles.dateText}>
                  Publié le {new Date(post.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Contenu */}
            <Text style={styles.titre}>{post.titre}</Text>
            {post.description ? (
              <Text
                style={styles.description}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {post.description}
              </Text>
            ) : null}

            {/* ✅ Infos spécifiques aux événements */}
            <View style={styles.eventInfo}>
              {post.lieu && (
                <View style={styles.eventInfoRow}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.eventInfoText}>{post.lieu}</Text>
                </View>
              )}
              {post.dateEvent && (
                <View style={styles.eventInfoRow}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={styles.eventInfoText}>
                    {new Date(post.dateEvent).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                </View>
              )}
              {post.nbParticipants && (
                <View style={styles.eventInfoRow}>
                  <Ionicons name="people" size={16} color="#666" />
                  <Text style={styles.eventInfoText}>
                    {post.nbParticipants} participants max
                  </Text>
                </View>
              )}
            </View>

            {/* Image preview */}
            {post.images && post.images.length > 0 && (
              <Image
                source={{ uri: post.images[0].url }}
                style={styles.postPreview}
                resizeMode="cover"
              />
            )}

            {/* Interactions */}
            <View style={styles.interaction}>
              <View style={styles.users}>
                {/* Like */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleLike(post._id)}
                >
                  <FontAwesome
                    name={post.hasLiked ? "heart" : "heart-o"}
                    size={18}
                    color={post.hasLiked ? "#e74c3c" : "#666"}
                  />
                  <Text style={styles.number}>{post.likesCount || 0}</Text>
                </TouchableOpacity>

                {/* Commentaires */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push(`/post/${post._id}`)}
                >
                  <FontAwesome name="comment-o" size={18} color="#666" />
                  <Text style={styles.number}>{post.commentsCount || 0}</Text>
                </TouchableOpacity>
              </View>

              {/* Actions Admin */}
              {isAdmin && (
                <TouchableOpacity
                  style={styles.adminBtn}
                  onPress={() => handleDeletePost(post._id)}
                >
                  <FontAwesome name="trash-o" size={20} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Espace en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

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

  // ✅ Drawer (Menu burger)
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
    backgroundColor: "#ffdd11",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerAvatarText: {
    color: "#333",
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

  // ✅ Reste des styles
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 15,
    gap: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },

  // Search
  searchContainer: {
    gap: 5,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResultsCount: {
    color: "#666",
    fontSize: 12,
    marginLeft: 5,
  },

  // No Results
  noResults: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 15,
  },
  noResultsText: {
    color: "#999",
    textAlign: "center",
    fontSize: 16,
  },

  // Article/Post
  article: {
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },

  // Sous Header
  sousHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
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
  lightEvent: {
    backgroundColor: "#ffdd11",
  },
  postType: {
    fontWeight: "bold",
    fontStyle: "italic",
    textTransform: "capitalize",
  },

  // Avatar
  avatar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
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
    backgroundColor: "#ffdd11",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "#333",
    fontSize: 20,
    fontWeight: "bold",
  },
  avatarInfo: {
    gap: 2,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
  },
  dateText: {
    color: "#999",
    fontSize: 12,
  },

  // Content
  titre: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: "#333",
    marginBottom: 10,
  },

  // Event Info
  eventInfo: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 15,
  },
  eventInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventInfoText: {
    fontSize: 14,
    color: "#666",
  },

  // Image
  postPreview: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    marginBottom: 10,
  },

  // Interaction
  interaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  users: {
    flexDirection: "row",
    gap: 15,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  number: {
    color: "#666",
    fontSize: 14,
  },
  adminBtn: {
    padding: 5,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 20,
  },
});
