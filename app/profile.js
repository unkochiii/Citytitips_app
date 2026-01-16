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
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import back from "../assets/images/background.jpg";

const { width } = Dimensions.get("window");
const API_BASE_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

export default function Profile() {
  const router = useRouter();
  const { token, user: authUser, logout } = useAuth();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsStats, setPostsStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [commerce, setCommerce] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("commerces");
  const [postFilter, setPostFilter] = useState("all");
  const [menuVisible, setMenuVisible] = useState(false);

  // ✅ Fonction pour obtenir l'URL de l'avatar
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (typeof avatar === "string") return avatar;
    if (avatar.secure_url) return avatar.secure_url;
    if (avatar.url) return avatar.url;
    return null;
  };

  // ✅ Fonction pour obtenir l'URL d'une image
  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === "string") return image;
    if (image.secure_url) return image.secure_url;
    if (image.url) return image.url;
    return null;
  };

  // ✅ Fonction pour formater l'adresse
  const formatAddress = (address) => {
    if (!address) return null;
    if (typeof address === "string") return address;
    if (typeof address === "object") {
      const parts = [address.street, address.city, address.postalCode].filter(
        Boolean
      );
      return parts.length > 0 ? parts.join(", ") : null;
    }
    return null;
  };

  const fetchProfileData = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);

      const userResponse = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const postsResponse = await axios.get(`${API_BASE_URL}/my-posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = userResponse.data?.data || userResponse.data;
      const postsData = postsResponse.data?.data || postsResponse.data;

      let commerceData = null;
      try {
        const commerceResponse = await axios.get(
          `${API_BASE_URL}/my-commerce`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const commerceResponseData =
          commerceResponse.data?.data || commerceResponse.data;
        if (commerceResponseData?.hasCommerce) {
          commerceData = commerceResponseData;
        }
      } catch (commerceError) {
        console.log("Pas de commerce trouvé");
      }

      setUser(userData);
      setPosts(postsData?.posts || []);
      setPostsStats(
        postsData?.stats || { pending: 0, approved: 0, rejected: 0 }
      );
      setCommerce(commerceData);
    } catch (error) {
      console.log("Erreur lors du chargement du profil:", error);
      Alert.alert("Erreur", "Impossible de charger votre profil");
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

  const handleLike = async (postId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/post/${postId}/toggle-like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const responseData = response.data?.data || response.data;

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likesCount: responseData.likesCount,
                hasLiked: responseData.hasLiked,
              }
            : post
        )
      );
    } catch (error) {
      console.log("Erreur lors du like:", error);
    }
  };

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
              await axios.delete(`${API_BASE_URL}/post/${postId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setPosts((prevPosts) =>
                prevPosts.filter((post) => post._id !== postId)
              );

              const deletedPost = posts.find((p) => p._id === postId);
              if (deletedPost) {
                setPostsStats((prev) => ({
                  ...prev,
                  [deletedPost.status]: Math.max(
                    0,
                    (prev[deletedPost.status] || 0) - 1
                  ),
                }));
              }

              Alert.alert("Succès", "Publication supprimée avec succès");
            } catch (error) {
              Alert.alert("Erreur", "Erreur lors de la suppression");
            }
          },
        },
      ]
    );
  };

  // ✅ Fonction pour gérer la déconnexion
  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          setMenuVisible(false);
          if (logout) {
            await logout();
          }
          router.replace("/login");
        },
      },
    ]);
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

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return { bg: "#fff3cd", color: "#856404", label: "En attente" };
      case "rejected":
        return { bg: "#f8d7da", color: "#721c24", label: "Refusé" };
      case "approved":
        return { bg: "#d4edda", color: "#155724", label: "Approuvé" };
      default:
        return { bg: "#e2e3e5", color: "#383d41", label: "Inconnu" };
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (postFilter === "all") return true;
    return post.status === postFilter;
  });

  const totalPosts = posts.length;
  const avatarUrl = getAvatarUrl(user?.account?.avatar);

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90A4" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const commerceAddress = commerce?.commerce?.address
    ? formatAddress(commerce.commerce.address)
    : null;

  return (
    <View style={styles.container}>
      {/* ✅ Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push("/editProfile");
              }}
            >
              <Ionicons name="person-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>Modifier le profil</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push("/settings");
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>Paramètres</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Déconnexion
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ========== COVER IMAGE ========== */}
        <View style={styles.coverContainer}>
          <Image source={back} alt="background" style={styles.coverImage} />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* ✅ Menu button */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        {/* ========== PROFILE INFO ========== */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                onError={(e) =>
                  console.log("Erreur chargement avatar:", e.nativeEvent.error)
                }
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.account?.username?.charAt(0).toUpperCase() ||
                    authUser?.username?.charAt(0).toUpperCase() ||
                    "?"}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.username}>
            {user?.account?.username || authUser?.username || "Utilisateur"}
          </Text>

          {user?.roles?.includes("admin") && (
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.roleBadgeText}>Admin</Text>
            </View>
          )}

          <Text style={styles.bio}>
            {user?.location?.city
              ? `📍 ${user.location.city}`
              : "Membre de Tanja Blabla"}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalPosts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#27ae60" }]}>
                {postsStats.approved}
              </Text>
              <Text style={styles.statLabel}>Approuvés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#f39c12" }]}>
                {postsStats.pending}
              </Text>
              <Text style={styles.statLabel}>En attente</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#e74c3c" }]}>
                {postsStats.rejected}
              </Text>
              <Text style={styles.statLabel}>Refusés</Text>
            </View>
          </View>
        </View>

        {/* ========== TABS ========== */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "commerces" && styles.activeTab]}
            onPress={() => setActiveTab("commerces")}
          >
            <Ionicons
              name="storefront-outline"
              size={20}
              color={activeTab === "commerces" ? "#4A90A4" : "#999"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "commerces" && styles.activeTabText,
              ]}
            >
              Commerces
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "publications" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("publications")}
          >
            <Ionicons
              name="grid-outline"
              size={20}
              color={activeTab === "publications" ? "#4A90A4" : "#999"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "publications" && styles.activeTabText,
              ]}
            >
              Publications ({posts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========== TAB CONTENT ========== */}
        <View style={styles.tabContent}>
          {activeTab === "commerces" ? (
            <View style={styles.commercesContainer}>
              {commerce?.hasCommerce ? (
                <View style={styles.commerceCard}>
                  {getImageUrl(commerce.commerce?.images?.[0]) ? (
                    <Image
                      source={{ uri: getImageUrl(commerce.commerce.images[0]) }}
                      style={styles.commerceImage}
                    />
                  ) : (
                    <View style={styles.commerceImagePlaceholder}>
                      <Ionicons name="storefront" size={40} color="#999" />
                    </View>
                  )}

                  <View style={styles.commerceInfo}>
                    <View style={styles.commerceHeader}>
                      <Text style={styles.commerceName}>
                        {commerce.commerce?.name || "Mon commerce"}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: getStatusStyle(
                              commerce.commerce?.status
                            ).bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: getStatusStyle(commerce.commerce?.status)
                                .color,
                            },
                          ]}
                        >
                          {getStatusStyle(commerce.commerce?.status).label}
                        </Text>
                      </View>
                    </View>

                    {commerce.commerce?.category && (
                      <Text style={styles.commerceCategory}>
                        {commerce.commerce.category}
                      </Text>
                    )}

                    {commerceAddress && (
                      <View style={styles.commerceAddressRow}>
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color="#666"
                        />
                        <Text style={styles.commerceAddress} numberOfLines={1}>
                          {commerceAddress}
                        </Text>
                      </View>
                    )}

                    {commerce.commerce?.status === "approved" &&
                      commerce.reviewStats && (
                        <View style={styles.commerceStats}>
                          <View style={styles.commerceStatItem}>
                            <FontAwesome
                              name="star"
                              size={14}
                              color="#FFD700"
                            />
                            <Text style={styles.commerceStatText}>
                              {commerce.commerce?.averageRating?.toFixed(1) ||
                                "N/A"}
                            </Text>
                          </View>
                          <View style={styles.commerceStatItem}>
                            <FontAwesome
                              name="comment-o"
                              size={14}
                              color="#666"
                            />
                            <Text style={styles.commerceStatText}>
                              {commerce.reviewStats.total} avis
                            </Text>
                          </View>
                          {commerce.isOpenNow !== undefined && (
                            <View style={styles.commerceStatItem}>
                              <View
                                style={[
                                  styles.openDot,
                                  {
                                    backgroundColor: commerce.isOpenNow
                                      ? "#27ae60"
                                      : "#e74c3c",
                                  },
                                ]}
                              />
                              <Text style={styles.commerceStatText}>
                                {commerce.isOpenNow ? "Ouvert" : "Fermé"}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                    {commerce.commerce?.status === "pending" && (
                      <View style={styles.statusMessage}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#856404"
                        />
                        <Text style={styles.statusMessageText}>
                          Votre commerce est en cours de validation
                        </Text>
                      </View>
                    )}

                    {commerce.commerce?.status === "rejected" && (
                      <View
                        style={[
                          styles.statusMessage,
                          { backgroundColor: "#f8d7da" },
                        ]}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={16}
                          color="#721c24"
                        />
                        <Text
                          style={[
                            styles.statusMessageText,
                            { color: "#721c24" },
                          ]}
                        >
                          {commerce.commerce?.rejectionReason ||
                            "Commerce refusé"}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.manageButton}
                      onPress={() => router.push("/my-commerce")}
                    >
                      <Text style={styles.manageButtonText}>
                        Gérer mon commerce
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.noCommerceContainer}>
                  <View style={styles.noCommerceIcon}>
                    <Ionicons
                      name="storefront-outline"
                      size={60}
                      color="#ccc"
                    />
                  </View>
                  <Text style={styles.noCommerceTitle}>Aucun commerce</Text>
                  <Text style={styles.noCommerceText}>
                    Vous n'avez pas encore créé de commerce. Créez votre
                    commerce pour le rendre visible aux utilisateurs.
                  </Text>
                  <TouchableOpacity
                    style={styles.createCommerceButton}
                    onPress={() => router.push("/create-commerce")}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.createCommerceButtonText}>
                      Créer mon commerce
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            // ========== PUBLICATIONS TAB ==========
            <View style={styles.publicationsContainer}>
              {/* ✅ Filtres pour les publications */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScrollView}
                contentContainerStyle={styles.filterContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    postFilter === "all" && styles.filterButtonActive,
                  ]}
                  onPress={() => setPostFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      postFilter === "all" && styles.filterButtonTextActive,
                    ]}
                  >
                    Tous ({posts.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    postFilter === "approved" && styles.filterButtonActive,
                    postFilter === "approved" && {
                      backgroundColor: "#d4edda",
                      borderColor: "#27ae60",
                    },
                  ]}
                  onPress={() => setPostFilter("approved")}
                >
                  <View
                    style={[styles.filterDot, { backgroundColor: "#27ae60" }]}
                  />
                  <Text
                    style={[
                      styles.filterButtonText,
                      postFilter === "approved" && { color: "#155724" },
                    ]}
                  >
                    Approuvés ({postsStats.approved})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    postFilter === "pending" && styles.filterButtonActive,
                    postFilter === "pending" && {
                      backgroundColor: "#fff3cd",
                      borderColor: "#f39c12",
                    },
                  ]}
                  onPress={() => setPostFilter("pending")}
                >
                  <View
                    style={[styles.filterDot, { backgroundColor: "#f39c12" }]}
                  />
                  <Text
                    style={[
                      styles.filterButtonText,
                      postFilter === "pending" && { color: "#856404" },
                    ]}
                  >
                    En attente ({postsStats.pending})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    postFilter === "rejected" && styles.filterButtonActive,
                    postFilter === "rejected" && {
                      backgroundColor: "#f8d7da",
                      borderColor: "#e74c3c",
                    },
                  ]}
                  onPress={() => setPostFilter("rejected")}
                >
                  <View
                    style={[styles.filterDot, { backgroundColor: "#e74c3c" }]}
                  />
                  <Text
                    style={[
                      styles.filterButtonText,
                      postFilter === "rejected" && { color: "#721c24" },
                    ]}
                  >
                    Refusés ({postsStats.rejected})
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {filteredPosts.length === 0 ? (
                <View style={styles.noPostsContainer}>
                  <View style={styles.noPostsIcon}>
                    <Ionicons
                      name="document-text-outline"
                      size={60}
                      color="#ccc"
                    />
                  </View>
                  <Text style={styles.noPostsTitle}>
                    {postFilter === "all"
                      ? "Aucune publication"
                      : `Aucune publication ${getStatusStyle(
                          postFilter
                        ).label.toLowerCase()}`}
                  </Text>
                  <Text style={styles.noPostsText}>
                    {postFilter === "all"
                      ? "Vous n'avez pas encore créé de publication."
                      : `Vous n'avez pas de publication avec le statut "${
                          getStatusStyle(postFilter).label
                        }".`}
                  </Text>
                  {postFilter === "all" && (
                    <TouchableOpacity
                      style={styles.createPostButton}
                      onPress={() => router.push("/(tabs)/create")}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.createPostButtonText}>
                        Créer une publication
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {filteredPosts.map((post) => (
                    <View key={post._id} style={styles.postCard}>
                      {/* Header du post */}
                      <View style={styles.postHeader}>
                        <View style={styles.postTypeContainer}>
                          <View
                            style={[
                              styles.postTypeDot,
                              { backgroundColor: getTypeColor(post.type) },
                            ]}
                          />
                          <Text style={styles.postTypeText}>{post.type}</Text>
                        </View>

                        <View
                          style={[
                            styles.postStatusBadge,
                            { backgroundColor: getStatusStyle(post.status).bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.postStatusText,
                              { color: getStatusStyle(post.status).color },
                            ]}
                          >
                            {getStatusStyle(post.status).label}
                          </Text>
                        </View>
                      </View>

                      {/* Contenu cliquable */}
                      <TouchableOpacity
                        onPress={() => router.push(`/post/${post._id}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.postTitle}>{post.titre}</Text>

                        {post.description && (
                          <Text
                            style={styles.postDescription}
                            numberOfLines={2}
                          >
                            {post.description}
                          </Text>
                        )}

                        {post.content && !post.description && (
                          <Text
                            style={styles.postDescription}
                            numberOfLines={2}
                          >
                            {post.content}
                          </Text>
                        )}

                        {post.images &&
                          post.images.length > 0 &&
                          getImageUrl(post.images[0]) && (
                            <Image
                              source={{ uri: getImageUrl(post.images[0]) }}
                              style={styles.postImage}
                            />
                          )}

                        {post.type === "event" && post.dateEvent && (
                          <View style={styles.postMeta}>
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color="#666"
                            />
                            <Text style={styles.postMetaText}>
                              {new Date(post.dateEvent).toLocaleDateString(
                                "fr-FR"
                              )}
                            </Text>
                            {post.lieu && (
                              <>
                                <Ionicons
                                  name="location-outline"
                                  size={14}
                                  color="#666"
                                  style={{ marginLeft: 10 }}
                                />
                                <Text style={styles.postMetaText}>
                                  {post.lieu}
                                </Text>
                              </>
                            )}
                          </View>
                        )}

                        {post.type === "recommandation" &&
                          post.note !== undefined && (
                            <View style={styles.postMeta}>
                              {renderStars(post.note)}
                              <Text style={styles.postMetaText}>
                                ({post.note}/5)
                              </Text>
                            </View>
                          )}
                      </TouchableOpacity>

                      {post.status === "pending" && (
                        <View style={styles.pendingMessage}>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#856404"
                          />
                          <Text style={styles.pendingMessageText}>
                            En attente de validation par un administrateur
                          </Text>
                        </View>
                      )}

                      {post.status === "rejected" && (
                        <View style={styles.rejectionBox}>
                          <View style={styles.rejectionHeader}>
                            <Ionicons
                              name="close-circle"
                              size={16}
                              color="#721c24"
                            />
                            <Text style={styles.rejectionLabel}>
                              Publication refusée
                            </Text>
                          </View>
                          {post.rejectionReason && (
                            <Text style={styles.rejectionText}>
                              Raison : {post.rejectionReason}
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Footer du post */}
                      <View style={styles.postFooter}>
                        <Text style={styles.postDate}>
                          {new Date(post.createdAt).toLocaleDateString("fr-FR")}
                        </Text>

                        <View style={styles.postActions}>
                          {post.status === "approved" && (
                            <>
                              <TouchableOpacity
                                style={styles.postActionBtn}
                                onPress={() => handleLike(post._id)}
                              >
                                <FontAwesome
                                  name={post.hasLiked ? "heart" : "heart-o"}
                                  size={16}
                                  color={post.hasLiked ? "#e74c3c" : "#666"}
                                />
                                <Text style={styles.postActionText}>
                                  {post.likesCount || post.likes?.length || 0}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.postActionBtn}
                                onPress={() => router.push(`/post/${post._id}`)}
                              >
                                <FontAwesome
                                  name="comment-o"
                                  size={16}
                                  color="#666"
                                />
                                <Text style={styles.postActionText}>
                                  {post.commentsCount || 0}
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}

                          <TouchableOpacity
                            style={styles.postEditBtn}
                            onPress={() =>
                              router.push(`/post/${post._id}/edit`)
                            }
                          >
                            <Ionicons name="pencil" size={16} color="#4A90A4" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.postDeleteBtn}
                            onPress={() => handleDeletePost(post._id)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#e74c3c"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.floatingCreateButton}
                    onPress={() => router.push("/(tabs)/create")}
                  >
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={styles.floatingCreateButtonText}>
                      Nouvelle publication
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

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
  scrollView: {
    flex: 1,
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
    fontSize: 16,
  },

  // ========== MODAL MENU ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 90,
    marginRight: 15,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  menuItemDanger: {
    backgroundColor: "#fff5f5",
  },
  menuItemTextDanger: {
    color: "#e74c3c",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#eee",
  },

  // ========== COVER ==========
  coverContainer: {
    height: 200,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButton: {
    position: "absolute",
    top: 50,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // ========== PROFILE SECTION ==========
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  avatarContainer: {
    marginTop: -50,
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#f0f0f0",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4A90A4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90A4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 5,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  bio: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  // ========== STATS ==========
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 10,
    width: "100%",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#ddd",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },

  // ========== TABS ==========
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#4A90A4",
  },
  tabText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#4A90A4",
    fontWeight: "600",
  },

  // ========== TAB CONTENT ==========
  tabContent: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    minHeight: 400,
  },

  // ========== COMMERCES ==========
  commercesContainer: {
    padding: 15,
  },
  commerceCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commerceImage: {
    width: "100%",
    height: 150,
  },
  commerceImagePlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  commerceInfo: {
    padding: 15,
  },
  commerceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  commerceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  commerceCategory: {
    fontSize: 14,
    color: "#4A90A4",
    marginBottom: 8,
  },
  commerceAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  commerceAddress: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  commerceStats: {
    flexDirection: "row",
    gap: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 10,
  },
  commerceStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  commerceStatText: {
    fontSize: 13,
    color: "#666",
  },
  openDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  statusMessageText: {
    fontSize: 13,
    color: "#856404",
    flex: 1,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90A4",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 15,
    gap: 5,
  },
  manageButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // ========== NO COMMERCE ==========
  noCommerceContainer: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 30,
    backgroundColor: "#fff",
    borderRadius: 15,
  },
  noCommerceIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noCommerceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  noCommerceText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  createCommerceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90A4",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    gap: 8,
  },
  createCommerceButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // ========== PUBLICATIONS ==========
  publicationsContainer: {
    padding: 15,
  },

  // ✅ FILTRES
  filterScrollView: {
    marginBottom: 15,
  },
  filterContainer: {
    paddingRight: 15,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 6,
  },
  filterButtonActive: {
    borderColor: "#4A90A4",
  },
  filterButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#4A90A4",
    fontWeight: "600",
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ========== NO POSTS ==========
  noPostsContainer: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 30,
    backgroundColor: "#fff",
    borderRadius: 15,
  },
  noPostsIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noPostsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  noPostsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  createPostButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90A4",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    gap: 8,
  },
  createPostButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // ========== POST CARD ==========
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  postTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  postTypeDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  postTypeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "capitalize",
  },
  postStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  postStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  postDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 10,
  },
  postImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#f0f0f0",
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  postMetaText: {
    fontSize: 13,
    color: "#666",
  },

  // ✅ PENDING MESSAGE
  pendingMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  pendingMessageText: {
    fontSize: 12,
    color: "#856404",
    flex: 1,
  },

  // ✅ REJECTION BOX
  rejectionBox: {
    backgroundColor: "#f8d7da",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#721c24",
  },
  rejectionText: {
    fontSize: 12,
    color: "#721c24",
    marginLeft: 22,
  },

  // ========== POST FOOTER ==========
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  postDate: {
    fontSize: 12,
    color: "#999",
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  postActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  postActionText: {
    fontSize: 13,
    color: "#666",
  },
  postEditBtn: {
    padding: 5,
  },
  postDeleteBtn: {
    padding: 5,
  },
  starsContainer: {
    flexDirection: "row",
  },

  // ✅ FLOATING CREATE BUTTON
  floatingCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90A4",
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 10,
    gap: 8,
  },
  floatingCreateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // ========== BOTTOM SPACER ==========
  bottomSpacer: {
    height: 30,
  },
});
