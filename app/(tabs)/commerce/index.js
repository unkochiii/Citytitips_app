import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import { useAuth } from "../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;
const API_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";

const CATEGORIES = [
  { value: "", label: "Toutes" },
  { value: "sante", label: "Santé" },
  { value: "alimentaire", label: "Alimentaire" },
  { value: "sport", label: "Sport" },
  { value: "beaute", label: "Beauté" },
  { value: "vetements", label: "Vêtements" },
  { value: "electronique", label: "Électronique" },
  { value: "maison", label: "Maison" },
  { value: "restauration", label: "Restauration" },
  { value: "services", label: "Services" },
  { value: "loisirs", label: "Loisirs" },
  { value: "education", label: "Éducation" },
  { value: "automobile", label: "Automobile" },
  { value: "autres", label: "Autres" },
];

// ✅ Fonction utilitaire pour extraire les commerces de n'importe quelle structure
const extractCommerces = (responseData) => {
  console.log(
    "🔍 extractCommerces - Clés reçues:",
    Object.keys(responseData || {})
  );

  if (Array.isArray(responseData?.commerces)) {
    const firstItem = responseData.commerces[0];
    if (
      firstItem &&
      (firstItem.name || firstItem.category || firstItem.ownerId)
    ) {
      console.log("✅ Found valid commerces in: responseData.commerces");
      return {
        commerces: responseData.commerces,
        metadata: responseData,
      };
    } else {
      console.warn(
        "⚠️ responseData.commerces existe mais ne contient pas des commerces valides"
      );
      console.warn("Premier élément:", firstItem);
    }
  }

  console.error("❌ Impossible de trouver les commerces dans la réponse");
  console.error(
    "Données reçues:",
    JSON.stringify(responseData, null, 2).substring(0, 1000)
  );

  return {
    commerces: [],
    metadata: responseData || {},
  };
};

// Composant de rendu d'un commerce
const CommerceCard = React.memo(({ commerce, onPress, getCategoryLabel }) => {
  const hasActiveOffer = commerce.offers?.some((o) => o.isActive);

  console.log("🏪 CommerceCard received:", {
    _id: commerce._id,
    id: commerce.id,
    name: commerce.name,
    ownerId: commerce.ownerId,
    ownerIdType: typeof commerce.ownerId,
    fullObject: JSON.stringify(commerce, null, 2).substring(0, 500),
  });

  const commerceId = commerce._id || commerce.id || null;

  if (commerceId === commerce.ownerId || commerceId === commerce.ownerId?._id) {
    console.error("❌ ERREUR: commerceId === ownerId !", {
      commerceId,
      ownerId: commerce.ownerId,
    });
  }

  const handlePress = () => {
    if (!commerceId) {
      console.warn("CommerceCard: no id found for commerce", commerce);
      return;
    }
    console.log("🚀 Navigating to commerce:", {
      commerceId,
      commerceName: commerce.name,
      ownerId: commerce.ownerId?._id || commerce.ownerId,
    });
    onPress(commerceId);
  };

  return (
    <TouchableOpacity
      style={[styles.commerceCard, commerce.isPinned && styles.pinnedPost]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {commerce.isPinned && (
        <View style={styles.commercePinnedBadge}>
          <Ionicons name="pin" size={12} color="white" />
          <Text style={styles.commercePinnedText}>Épinglé</Text>
        </View>
      )}

      <View style={styles.commerceImageContainer}>
        {commerce.logo?.url ? (
          <Image
            source={{ uri: commerce.logo.url }}
            style={styles.commerceLogo}
          />
        ) : commerce.images?.[0]?.url ? (
          <Image
            source={{ uri: commerce.images[0].url }}
            style={styles.commerceLogo}
          />
        ) : (
          <View style={styles.commercePlaceholder}>
            <Ionicons name="storefront-outline" size={40} color="#ccc" />
          </View>
        )}
      </View>

      <View style={styles.commerceContent}>
        <Text style={styles.commerceName} numberOfLines={1}>
          {commerce.name}
        </Text>

        <View style={styles.commerceCategoryBadge}>
          <Text style={styles.commerceCategoryText}>
            {getCategoryLabel(commerce.category)}
          </Text>
        </View>

        <View style={styles.commerceInfoRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.commerceInfoText} numberOfLines={1}>
            {commerce.address?.city || commerce.city || "Non spécifié"}
          </Text>
        </View>

        <View style={styles.commerceRating}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.commerceRatingText}>
            {commerce.rating?.average?.toFixed(1) || "N/A"}
          </Text>
          <Text style={styles.commerceReviewCount}>
            ({commerce.rating?.count || 0} avis)
          </Text>
        </View>

        {hasActiveOffer && (
          <View style={styles.commerceOfferBadge}>
            <Ionicons name="pricetag" size={12} color="#fff" />
            <Text style={styles.commerceOfferText}>Offre en cours</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function Commerce() {
  const router = useRouter();
  const {
    token,
    user,
    logout,
    isAdmin: ctxIsAdmin,
    isSuperAdmin: ctxIsSuperAdmin,
  } = useAuth();

  // États
  const [commerces, setCommerces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filteredCity, setFilteredCity] = useState(null);
  const [allCitiesView, setAllCitiesView] = useState(false);
  const [error, setError] = useState(null);

  // Debounce ref for search
  const searchTimeoutRef = useRef(null);

  // Menu
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // ✅ Vérification des rôles
  const userRoles = useMemo(() => user?.roles || [], [user?.roles]);

  const isAdmin = useMemo(() => {
    if (ctxIsAdmin) return true;
    if (userRoles.includes("admin")) return true;
    if (userRoles.includes("superAdmin")) return true;
    return user?.role === "admin";
  }, [ctxIsAdmin, userRoles, user?.role]);

  const isSuperAdmin = useMemo(() => {
    if (ctxIsSuperAdmin) return true;
    if (userRoles.includes("superAdmin")) return true;
    return user?.role === "superAdmin";
  }, [ctxIsSuperAdmin, userRoles, user?.role]);

  // ✅ NOUVEAU : Vérification du rôle commerce
  const isCommerce = useMemo(() => {
    return userRoles.includes("commerce") || user?.role === "commerce";
  }, [userRoles, user?.role]);

  const userCity = useMemo(
    () => user?.location?.city || user?.city || "",
    [user]
  );

  // Gestion des erreurs
  const handleError = useCallback((error) => {
    console.error("Erreur API:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn("Token invalide, tentative anonyme...");
    } else {
      setError(error.response?.data?.message || "Une erreur est survenue");
    }
  }, []);

  // Ouvrir/fermer le menu
  const openMenu = useCallback(() => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeMenu = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  }, [slideAnim]);

  // Navigation
  const handleAddCommerce = useCallback(() => {
    closeMenu();
    if (!token) {
      Alert.alert(
        "Erreur",
        "Vous devez être connecté pour ajouter un commerce"
      );
      return;
    }
    router.push("/commerce/create");
  }, [closeMenu, router, token]);

  const handleLogout = useCallback(() => {
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
  }, [closeMenu, logout, router]);

  // ✅ API Calls
  const fetchCommerces = useCallback(
    async ({
      page = 1,
      search = "",
      append = false,
      allCities = false,
    } = {}) => {
      console.log("========== FETCH COMMERCES START ==========");
      console.log("🔍 Params:", { page, search, append, allCities });

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(page === 1 && !refreshing);
          setError(null);
        }

        const headers = { "Content-Type": "application/json" };

        if (
          token &&
          token !== "null" &&
          token !== "undefined" &&
          String(token).trim()
        ) {
          headers.Authorization = `Bearer ${token}`;
          console.log("✅ Authorization header set");
        }

        const params = { limit: 20, page };
        if (search?.trim()) params.search = search.trim();

        const endpoint = allCities
          ? `${API_URL}/commerces/all-cities`
          : `${API_URL}/commerces`;

        console.log("🔍 Endpoint:", endpoint);
        console.log("🔍 Params:", params);

        let response;
        try {
          response = await axios.get(endpoint, {
            params,
            headers,
            timeout: 10000,
          });
        } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.warn("Token invalide, requête anonyme...");
            response = await axios.get(endpoint, {
              params,
              headers: { "Content-Type": "application/json" },
              timeout: 10000,
            });
            if (token) logout();
          } else {
            throw err;
          }
        }

        console.log("✅ Response status:", response.status);

        if (!response.data) {
          console.error("❌ Response data is undefined");
          setCommerces([]);
          setError("Réponse vide du serveur");
          return;
        }

        console.log(
          "🔴 RAW response.data keys:",
          Object.keys(response.data || {})
        );

        console.log("✅ Response data type:", typeof response.data);
        console.log("✅ Response data keys:", Object.keys(response.data || {}));
        console.log(
          "✅ Full response data:",
          JSON.stringify(response.data, null, 2).substring(0, 1000)
        );

        const { commerces: fetched, metadata } = extractCommerces(
          response.data
        );

        if (!Array.isArray(fetched)) {
          console.error("❌ Fetched is not an array:", fetched);
          setCommerces([]);
          setError("Format de données invalide");
          return;
        }

        console.log(`✅ Extracted ${fetched.length} commerce(s)`);

        console.log("=".repeat(60));
        console.log("🔴 COMMERCES EXTRAITS:", fetched.length);
        if (fetched.length > 0) {
          fetched.forEach((c, index) => {
            try {
              console.log(`🏪 Commerce #${index}:`);
              console.log(`   _id: ${c._id}`);
              console.log(`   name: ${c.name}`);
              console.log(`   ownerId: ${JSON.stringify(c.ownerId)}`);
              console.log(`   ownerId._id: ${c.ownerId?._id}`);
              console.log(
                `   ❓ _id === ownerId._id ? ${c._id === c.ownerId?._id}`
              );
              console.log(`   ❓ _id === ownerId ? ${c._id === c.ownerId}`);
            } catch (err) {
              console.warn("Erreur debug commerce item:", err);
            }
          });
        }
        console.log("=".repeat(60));

        if (fetched.length > 0) {
          const first = fetched[0];
          console.log("✅ First commerce:", {
            _id: first._id,
            id: first.id,
            name: first.name,
            status: first.status,
            ownerId: first.ownerId?._id || first.ownerId,
          });
        }

        const approvedCommerces = fetched.filter(
          (c) =>
            c.status === "approved" ||
            c.status === "active" ||
            c.isApproved === true ||
            !c.status
        );

        console.log(`✅ Approved commerces: ${approvedCommerces.length}`);

        if (append) {
          setCommerces((prev) => [...prev, ...approvedCommerces]);
        } else {
          setCommerces(approvedCommerces);
          setPage(metadata?.currentPage || metadata?.page || page);
        }

        setTotal(
          metadata?.total ||
            metadata?.count ||
            (append ? total : approvedCommerces.length)
        );
        setPages(metadata?.pages || metadata?.totalPages || 1);
        setFilteredCity(metadata?.filteredByCity || metadata?.city || null);
        setError(null);

        console.log("========== FETCH COMMERCES END ==========");
      } catch (error) {
        console.error("❌ Fetch error:", error.message);
        console.error("❌ Error details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        handleError(error);

        if (!append) {
          setCommerces([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setRefreshing(false);
      }
    },
    [token, handleError, logout, refreshing, total]
  );

  // Fetch initial
  useEffect(() => {
    fetchCommerces({ page: 1, search: searchQuery, allCities: allCitiesView });
  }, [token, allCitiesView]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchCommerces({
        page: 1,
        search: searchQuery,
        allCities: allCitiesView,
      });
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCommerces({
      page: 1,
      search: searchQuery,
      allCities: allCitiesView,
    });
    setRefreshing(false);
  }, [fetchCommerces, searchQuery, allCitiesView]);

  // Charger plus
  const handleLoadMore = useCallback(async () => {
    if (page >= pages || isLoadingMore) return;
    const next = page + 1;
    setIsLoadingMore(true);
    await fetchCommerces({
      page: next,
      search: searchQuery,
      append: true,
      allCities: allCitiesView,
    });
    setPage(next);
    setIsLoadingMore(false);
  }, [page, pages, isLoadingMore, fetchCommerces, searchQuery, allCitiesView]);

  // Filtres
  const filteredCommerces = useMemo(() => {
    if (!commerces.length) return [];

    const query = searchQuery.trim().toLowerCase();
    if (!query) return commerces;

    return commerces.filter(
      (commerce) =>
        commerce.name?.toLowerCase().includes(query) ||
        commerce.description?.toLowerCase().includes(query) ||
        commerce.category?.toLowerCase().includes(query)
    );
  }, [commerces, searchQuery]);

  const getCategoryLabel = useCallback(
    (value) => CATEGORIES.find((c) => c.value === value)?.label || value,
    []
  );

  // Loading
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.burgerBtn}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Commerces</Text>

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

      {/* CONTENU PRINCIPAL */}
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
            placeholder="Rechercher un commerce..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Info ville filtrée */}
        {filteredCity && !allCitiesView && (
          <View style={styles.cityInfoRow}>
            <View style={styles.cityInfoLeft}>
              <Ionicons name="location" size={16} color="#007bff" />
              <Text style={styles.cityInfoText}>
                {total || filteredCommerces.length} commerce
                {(total || filteredCommerces.length) > 1 ? "s" : ""} à{" "}
                {filteredCity}
              </Text>
            </View>
          </View>
        )}

        {/* Affichage toutes les villes */}
        {allCitiesView && (
          <View style={styles.cityInfo}>
            <Ionicons name="globe-outline" size={16} color="#007bff" />
            <Text style={[styles.cityInfoText, { marginRight: 8 }]}>
              Affichage : toutes les villes ({total})
            </Text>
            <TouchableOpacity
              onPress={() => {
                setAllCitiesView(false);
                setPage(1);
              }}
            >
              <Text style={styles.viewAllText}>Voir ma ville</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Message d'erreur */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Liste des commerces */}
        {filteredCommerces.length === 0 ? (
          <View style={styles.noResults}>
            <Ionicons name="storefront-outline" size={50} color="#999" />
            <Text style={styles.noResultsText}>
              {searchQuery
                ? "Aucun commerce trouvé"
                : allCitiesView
                ? "Aucun commerce trouvé"
                : `Aucun commerce à ${
                    filteredCity || userCity || "votre ville"
                  }`}
            </Text>
            <Text style={styles.noResultsSubtext}>
              Soyez le premier à ajouter votre commerce !
            </Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={18} color="#007bff" />
              <Text style={styles.refreshBtnText}>Actualiser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.commercesGrid}>
              {filteredCommerces.map((commerce) => (
                <CommerceCard
                  key={commerce._id}
                  commerce={commerce}
                  onPress={(id) => router.push(`/commerce/${id}`)}
                  getCategoryLabel={getCategoryLabel}
                />
              ))}
            </View>

            {pages > page && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loadMoreText}>Charger plus</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* BOUTON FLOTTANT */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddCommerce}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* MENU BURGER */}
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
                <Text style={styles.drawerEmail}>{userCity}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeMenu}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

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

            {/* ✅ NOUVEAU : Section Commerce (si rôle commerce) */}
            {isCommerce && (
              <>
                <Text style={styles.drawerSectionTitle}>Mon Commerce</Text>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/commerce/dashboard");
                  }}
                >
                  <Ionicons name="stats-chart" size={24} color="#10b981" />
                  <Text style={[styles.drawerItemText, { color: "#10b981" }]}>
                    Dashboard
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
    elevation: 2,
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
  debugBox: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  debugTitle: {
    fontWeight: "bold",
    marginBottom: 5,
    color: "#856404",
  },
  debugText: {
    fontSize: 11,
    color: "#856404",
    marginBottom: 2,
  },
  cityInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f4fd",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  cityInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cityInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f4fd",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  viewAllText: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "500",
  },
  cityInfoText: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "500",
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
  retryBtn: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    marginLeft: 10,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  commercesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  commerceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "48%",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  pinnedPost: {
    borderWidth: 2,
    borderColor: "#007bff",
    backgroundColor: "#f8fbff",
  },
  commercePinnedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  commercePinnedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  commerceImageContainer: {
    width: "100%",
    height: 100,
    backgroundColor: "#f5f5f5",
  },
  commerceLogo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  commercePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  commerceContent: {
    padding: 10,
  },
  commerceName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  commerceCategoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e8f4fd",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  commerceCategoryText: {
    fontSize: 10,
    color: "#007bff",
    fontWeight: "500",
  },
  commerceInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  commerceInfoText: {
    fontSize: 11,
    color: "#666",
    flex: 1,
  },
  commerceRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  commerceRatingText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  commerceReviewCount: {
    fontSize: 10,
    color: "#999",
  },
  commerceOfferBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    gap: 3,
    alignSelf: "flex-start",
  },
  commerceOfferText: {
    color: "#fff",
    fontSize: 9,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 45,
    gap: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fdeded",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    color: "#e74c3c",
    fontSize: 14,
    marginLeft: 8,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 15,
  },
  noResultsText: {
    color: "#666",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  noResultsSubtext: {
    color: "#007bff",
    textAlign: "center",
    fontSize: 14,
  },
  bottomSpacer: {
    height: 100,
  },
  loadMoreBtn: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#007bff",
    borderRadius: 8,
  },
  loadMoreText: {
    color: "#fff",
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 25,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
