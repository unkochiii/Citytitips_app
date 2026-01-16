// screens/blog/BlogListScreen.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Pressable,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import axios from "axios";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;
const API_BASE_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

export default function BlogListScreen() {
  const router = useRouter();
  const {
    user,
    token,
    logout,
    isAdmin: ctxIsAdmin,
    isSuperAdmin: ctxIsSuperAdmin,
  } = useAuth();

  // État pour les blogs
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalBlogs: 0,
  });

  // État pour le menu burger
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-DRAWER_WIDTH));

  // ✅ Vérification de l'authentification
  const isAuthReady = useMemo(() => {
    return !!user && !!token;
  }, [user, token]);

  // Vérification des rôles (similaire à Home)
  const isAdmin =
    ctxIsAdmin || user?.roles?.includes?.("admin") || user?.role === "admin";
  const isSuperAdmin =
    ctxIsSuperAdmin ||
    user?.roles?.includes?.("superAdmin") ||
    user?.roles === "superAdmin";
  const isCommerce =
    user?.roles?.includes?.("commerce") || user?.roles === "commerce";
  const isBlog = user?.roles?.includes("blog") || user?.roles === "blog";
  const userCity = useMemo(() => {
    return user?.location?.city || user?.city || "";
  }, [user]);

  // ===== MENU BURGER LOGIC =====
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
    }).start(() => setMenuVisible(false));
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
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  // ===== API CALLS =====
  const fetchBlogsByCity = useCallback(
    async (city, page = 1, limit = 10) => {
      try {
        if (!city) throw new Error("VILLE_UNDEFINED");
        if (!token) throw new Error("TOKEN_MISSING");

        const url = `${API_BASE_URL}/blog/city/${encodeURIComponent(city)}`;
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, limit },
        });

        return response.data;
      } catch (error) {
        console.error("Erreur fetchBlogsByCity:", error.message);
        throw error;
      }
    },
    [token]
  );

  // ===== LOAD BLOGS =====
  const loadBlogs = useCallback(
    async (page = 1, isRefresh = false) => {
      try {
        if (!userCity) {
          setError("VILLE_NON_DEFINIE");
          setLoading(false);
          return;
        }

        setError(null);
        if (page === 1) {
          isRefresh ? setRefreshing(true) : setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await fetchBlogsByCity(userCity, page, 10);

        const normalizedBlogs = response.blogs.map((blog) => ({
          ...blog,
          _id: blog._id || blog.id,
        }));

        if (page === 1) {
          setBlogs(normalizedBlogs);
        } else {
          setBlogs((prev) => [...prev, ...normalizedBlogs]);
        }

        setPagination(
          response.pagination || {
            currentPage: page,
            totalPages: 1,
            totalBlogs: normalizedBlogs.length,
          }
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [userCity, fetchBlogsByCity]
  );

  // ===== EFFECTS =====
  useEffect(() => {
    if (token && userCity) {
      loadBlogs(1);
    } else if (!userCity && user) {
      setLoading(false);
      setError("VILLE_NON_DEFINIE");
    }
  }, [token, userCity, user, loadBlogs]);

  // ===== HANDLERS =====
  const onRefresh = useCallback(() => {
    loadBlogs(1, true);
  }, [loadBlogs]);

  const loadMore = useCallback(() => {
    if (!loadingMore && pagination.currentPage < pagination.totalPages) {
      loadBlogs(pagination.currentPage + 1);
    }
  }, [loadingMore, pagination, loadBlogs]);

  const handleBlogPress = useCallback(
    (blog) => {
      const blogId = blog._id || blog.id;
      if (!blogId) {
        console.error("❌ ERREUR: Tentative de navigation sans ID");
        return;
      }
      router.push(`/blog/${blogId}`);
    },
    [router]
  );

  const handleCreateBlog = useCallback(() => {
    router.push("/blog/write");
  }, [router]);

  // ===== RENDER ITEM (Style Home) =====
  const renderBlogItem = ({ item: blog }) => {
    const blogId = blog._id || blog.id;
    const authorName = blog.author?.username || "Utilisateur";
    const authorAvatar = blog.author?.avatar?.secure_url;
    const blogCity = blog.city || userCity;

    return (
      <TouchableOpacity
        style={[styles.article, blog.isPinned && styles.pinnedPost]}
        onPress={() => handleBlogPress(blog)}
        activeOpacity={0.8}
      >
        {/* Header du blog */}
        <View style={styles.sousHeader}>
          <View style={styles.sousHeaderLeft}>
            <View style={[styles.light, { backgroundColor: "#0d7dca" }]} />
            <Text style={styles.postType}>Blog</Text>
            {blog.isPinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={12} color="#007bff" />
                <Text style={styles.pinnedText}>Épinglé</Text>
              </View>
            )}
          </View>

          <View style={styles.sousHeaderRight}>
            {blogCity && <Text style={styles.postCity}>{blogCity}</Text>}

            {(isAdmin || blog.author?._id === user?._id) && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert(
                    "Supprimer le blog",
                    `Voulez-vous vraiment supprimer "${blog.title}" ?`,
                    [
                      { text: "Annuler", style: "cancel" },
                      {
                        text: "Supprimer",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await axios.delete(
                              `${API_BASE_URL}/blog/${blogId}`,
                              {
                                headers: { Authorization: `Bearer ${token}` },
                              }
                            );
                            setBlogs((prev) =>
                              prev.filter((b) => b._id !== blogId)
                            );
                          } catch (error) {
                            Alert.alert(
                              "Erreur",
                              "Impossible de supprimer le blog"
                            );
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#e74c3c" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Avatar et infos auteur */}
        <View style={styles.avatar}>
          {authorAvatar ? (
            <Image source={{ uri: authorAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {authorName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>{authorName}</Text>
            <Text style={styles.dateText}>
              {new Date(blog.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        </View>

        {/* Titre */}
        <Text style={styles.titre}>{blog.title}</Text>

        {/* Extrait du contenu */}
        {blog.content && (
          <Text style={styles.content} numberOfLines={2} ellipsizeMode="tail">
            {blog.content}
          </Text>
        )}

        {/* Image preview */}
        {blog.images?.[0]?.url && (
          <Image
            source={{ uri: blog.images[0].url }}
            style={styles.postPreview}
            resizeMode="cover"
          />
        )}

        {/* Interactions */}
        <View style={styles.interaction}>
          <TouchableOpacity style={styles.actionBtn}>
            <FontAwesome name="eye" size={18} color="#666" />
            <Text style={styles.number}>{blog.views || 0}</Text>
          </TouchableOpacity>

          <View style={styles.actionBtn}>
            <FontAwesome name="comment-o" size={18} color="#666" />
            <Text style={styles.number}>{blog.commentsCount || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ===== RENDER =====
  if (loading && blogs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Chargement des blogs...</Text>
      </View>
    );
  }

  if (error && blogs.length === 0) {
    const isAuthError = error.includes("TOKEN_") || error.includes("VILLE_");

    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name={isAuthError ? "log-in-outline" : "alert-circle-outline"}
          size={70}
          color={isAuthError ? "#f39c12" : "#e74c3c"}
        />
        <Text style={styles.errorTitle}>
          {isAuthError ? "Problème d'authentification" : "Erreur"}
        </Text>
        <Text style={styles.errorMessage}>
          {error.includes("VILLE_NON_DEFINIE")
            ? "Définissez une ville dans votre profil"
            : error.includes("TOKEN_EXPIRED")
            ? "Votre session a expiré"
            : "Impossible de récupérer les blogs"}
        </Text>

        {isAuthError && (
          <TouchableOpacity
            style={styles.authBtn}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.authBtnText}>Se connecter</Text>
          </TouchableOpacity>
        )}

        {!isAuthError && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer} edges={["top"]}>
      {/* ✅ HEADER avec menu burger */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.burgerBtn}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Blogs à {userCity}</Text>

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

      {/* ✅ LISTE DES BLOGS */}
      <FlatList
        data={blogs}
        renderItem={renderBlogItem}
        keyExtractor={(item) => (item._id || item.id)?.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#007bff" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.noResults}>
              <Ionicons name="newspaper-outline" size={50} color="#999" />
              <Text style={styles.noResultsText}>Aucun blog disponible</Text>
            </View>
          )
        }
      />

      {/* ✅ BOUTON FLOTTANT */}
      {isAuthReady && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateBlog}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

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
  // ===== CONTAINER =====
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1, // ✅ CRUCIAL : permet à l'overlay de s'étendre
  },

  // ===== HEADER =====
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

  // ===== LIST =====
  listContent: {
    padding: 15,
    gap: 15,
    paddingBottom: 80,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },

  // ===== ARTICLE (BLOG CARD) =====
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

  // ===== EMPTY STATE =====
  noResults: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 15,
  },
  noResultsText: {
    color: "#999",
    textAlign: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 40,
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
  authBtn: {
    backgroundColor: "#f39c12",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  authBtnText: {
    color: "#fff",
    fontWeight: "600",
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

  // ===== FAB =====
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
  },

  // ===== DRAWER =====
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
});
