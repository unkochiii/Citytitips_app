// app/(tabs)/index.js
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

export default function Home() {
  const router = useRouter();
  const {
    token,
    user,
    logout,
    isAdmin: ctxIsAdmin,
    isSuperAdmin: ctxIsSuperAdmin,
  } = useAuth();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const MaPage = () => {
    const { user, token } = useAuth();

    // 👇 COPIE-COLLE CE LOG
    console.log("========== DEBUG USER ==========");
    console.log("User complet:", JSON.stringify(user, null, 2));
    console.log("Token existe:", !!token);
    console.log("================================");

    // ...
  };
  // ✅ State pour le menu burger
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-DRAWER_WIDTH));

  // ✅ CORRECTION : Adapter à la vraie structure (préférence au flag du contexte)
  const isAdmin =
    ctxIsAdmin || user?.roles?.includes?.("admin") || user?.role === "admin";
  const isSuperAdmin =
    ctxIsSuperAdmin ||
    user?.roles?.includes?.("superAdmin") ||
    user?.role === "superAdmin";
  const userCity = user?.city || "";

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

    console.log("🚀 Fetch démarré...");

    try {
      setIsLoading(true);

      // ✅ Accéder à user?.city directement ICI (pas via userCity)
      const cityParam = user?.city || "";

      console.log("Ville envoyée:", cityParam);

      const response = await axios.get(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/posts",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: cityParam ? { city: cityParam } : {},
        }
      );

      console.log("✅ Réponse reçue");

      // ✅ Accéder à response.data.data
      const apiData = response.data.data;

      console.log("Posts trouvés:", apiData?.posts?.length);

      setData(apiData);
    } catch (error) {
      console.log("❌ Erreur:", error.response?.data || error.message);
      setData({ posts: [] });
    } finally {
      console.log("🏁 Fetch terminé");
      setIsLoading(false);
    }
  }, [token, user?.city]); // ✅ user?.city au lieu de userCity

  useEffect(() => {
    if (token && user) {
      // ✅ Attendre que user soit chargé
      fetchData();
    }
  }, [token, user, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const filteredPosts = useMemo(() => {
    if (!data?.posts) return [];

    let posts = [...data.posts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      posts = posts.filter((post) => {
        return (
          post.titre?.toLowerCase().includes(query) ||
          post.description?.toLowerCase().includes(query) ||
          post.content?.toLowerCase().includes(query) ||
          post.authorId?.account?.username?.toLowerCase().includes(query)
        );
      });
    }

    posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return posts;
  }, [data?.posts, searchQuery]);

  const handleLike = async (postId) => {
    try {
      const response = await axios.post(
        `https://api--tanjablabla--t4nqvl4d28d8.code.run/post/${postId}/toggle-like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setData((prev) => ({
        ...prev,
        posts: prev.posts.map((post) =>
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
      console.log("Erreur like:", error);
    }
  };

  // ✅ NOUVEAU : Fonction pour supprimer un post (Admin seulement)
  const handleDeletePost = (postId, postTitle) => {
    Alert.alert(
      "Supprimer la publication",
      `Voulez-vous vraiment supprimer "${postTitle}" ?\n\nCette action est irréversible.`,
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

              // Mettre à jour la liste localement
              setData((prev) => ({
                ...prev,
                posts: prev.posts.filter((post) => post._id !== postId),
              }));

              Alert.alert("Succès", "Publication supprimée avec succès");
            } catch (error) {
              console.log("Erreur suppression:", error);
              Alert.alert(
                "Erreur",
                error.response?.data?.message ||
                  "Impossible de supprimer la publication"
              );
            }
          },
        },
      ]
    );
  };

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

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Chargement...</Text>
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

        <Text style={styles.headerTitle}>Accueil</Text>

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Recherche */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
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

        {/* Message si aucun post */}
        {filteredPosts.length === 0 ? (
          <View style={styles.noResults}>
            <Ionicons name="sad-outline" size={50} color="#999" />
            <Text style={styles.noResultsText}>Aucun post disponible</Text>
          </View>
        ) : null}

        {/* Posts */}
        {filteredPosts.map((post) => (
          <TouchableOpacity
            key={post._id}
            style={[styles.article, post.isPinned && styles.pinnedPost]}
            onPress={() => router.push(`/post/${post._id}`)}
            activeOpacity={0.8}
          >
            {/* Header du post */}
            <View style={styles.sousHeader}>
              <View style={styles.sousHeaderLeft}>
                <View
                  style={[
                    styles.light,
                    { backgroundColor: getTypeColor(post.type) },
                  ]}
                />
                <Text style={styles.postType}>{post.type}</Text>
                {post.isPinned ? (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={12} color="#007bff" />
                    <Text style={styles.pinnedText}>Épinglé</Text>
                  </View>
                ) : null}
              </View>

              {/* ✅ NOUVEAU : Bouton supprimer pour admin */}
              <View style={styles.sousHeaderRight}>
                {post.city ? (
                  <Text style={styles.postCity}>{post.city}</Text>
                ) : null}

                {isAdmin ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeletePost(post._id, post.titre);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Avatar et infos auteur */}
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
              <View>
                <Text style={styles.username}>
                  {post.authorId?.account?.username}
                </Text>
                <Text style={styles.dateText}>
                  {new Date(post.createdAt).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            </View>

            {/* Titre */}
            <Text style={styles.titre}>{post.titre}</Text>

            {/* Contenu - max 1 ligne avec "..." */}
            {post.content ? (
              <Text
                style={styles.content}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {post.content}
              </Text>
            ) : null}

            {/* Image preview */}
            {post.images?.[0]?.url ? (
              <Image
                source={{ uri: post.images[0].url }}
                style={styles.postPreview}
                resizeMode="cover"
              />
            ) : null}

            {/* Interactions */}
            <View style={styles.interaction}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleLike(post._id);
                }}
              >
                <FontAwesome
                  name={post.hasLiked ? "heart" : "heart-o"}
                  size={18}
                  color={post.hasLiked ? "#e74c3c" : "#666"}
                />
                <Text style={styles.number}>{post.likesCount || 0}</Text>
              </TouchableOpacity>

              <View style={styles.actionBtn}>
                <FontAwesome name="comment-o" size={18} color="#666" />
                <Text style={styles.number}>{post.commentsCount || 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Espace en bas pour la tab bar */}
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
  },
  cityHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f4fd",
    padding: 10,
    borderRadius: 10,
    gap: 5,
  },
  cityHeaderText: {
    color: "#007bff",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 45,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 15,
  },
  noResultsText: {
    color: "#999",
    textAlign: "center",
  },
  article: {
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pinnedPost: {
    borderWidth: 2,
    borderColor: "#007bff",
    backgroundColor: "#f8fbff",
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
  // ✅ NOUVEAU STYLE
  sousHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f4fd",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  pinnedText: {
    color: "#007bff",
    fontSize: 10,
    fontWeight: "600",
  },
  postCity: {
    color: "#999",
    fontSize: 12,
  },
  // ✅ NOUVEAU STYLE
  deleteBtn: {
    padding: 5,
    backgroundColor: "#fee",
    borderRadius: 8,
  },
  avatar: {
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
  },
  dateText: {
    color: "#999",
    fontSize: 12,
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
  content: {
    fontSize: 13,
    color: "#888",
    marginBottom: 10,
    lineHeight: 18,
  },
  postPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
  },
  interaction: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
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
  bottomSpacer: {
    height: 20,
  },
});
