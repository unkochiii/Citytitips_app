// app/(tabs)/admin/pending-commerce.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

// ==================== CONFIGURATION API ====================
const API_BASE_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ==================== CONSTANTES ====================
const STATUS_CONFIG = {
  pending: { color: "#FFA500", label: "En attente", icon: "time" },
  approved: { color: "#4CAF50", label: "Approuvé", icon: "checkmark-circle" },
  rejected: { color: "#F44336", label: "Rejeté", icon: "close-circle" },
  suspended: { color: "#9E9E9E", label: "Suspendu", icon: "pause-circle" },
};

const TABS = [
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Approuvés" },
  { key: "rejected", label: "Rejetés" },
  { key: "all", label: "Tous" },
];

// ==================== HELPER FUNCTIONS ====================
const checkIsAdmin = (user) => {
  if (!user) return false;
  const userRoles = user?.roles || [];
  return userRoles.includes("admin") || userRoles.includes("superAdmin");
};

const getUserDisplayName = (user) => {
  return user?.username || user?.account?.username || user?.name || "Admin";
};

const getUserRoleDisplay = (user) => {
  const roles = user?.roles || [];
  if (roles.includes("superAdmin")) return "Super Admin";
  if (roles.includes("admin")) return "Admin";
  return roles[0] || "Utilisateur";
};

// ✅ Nettoyer le token (fix Android)
const cleanToken = (token) => {
  if (!token) return null;
  let cleaned = token;
  if (typeof cleaned !== "string") cleaned = String(cleaned);
  if (cleaned.startsWith('"') && cleaned.endsWith('"'))
    cleaned = cleaned.slice(1, -1);
  cleaned = cleaned
    .replace(/\\"/g, '"')
    .trim()
    .replace(/[\r\n\t\s]/g, "");
  return cleaned || null;
};

// ==================== HOOK POUR LE CLAVIER ====================
const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

// ==================== COMPOSANT PRINCIPAL ====================
export default function PendingCommerce() {
  const router = useRouter();
  const {
    user,
    token,
    isLoading: authLoading,
    isTokenReady,
    logout,
  } = useAuth();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  const isAdmin = checkIsAdmin(user);
  const isMounted = useRef(false);

  const [commerces, setCommerces] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [adminCities, setAdminCities] = useState([]);

  const [selectedCommerce, setSelectedCommerce] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ✅ Fonction pour obtenir un token valide et nettoyé
  const getValidToken = useCallback(async () => {
    let currentToken = cleanToken(token);
    if (currentToken && currentToken.length > 10) return currentToken;

    try {
      const storedToken = await AsyncStorage.getItem("token");
      currentToken = cleanToken(storedToken);
      if (currentToken && currentToken.length > 10) return currentToken;
    } catch (e) {
      // Silently fail
    }

    return null;
  }, [token]);

  // ==================== FONCTION FETCH ====================
  const fetchCommerces = useCallback(
    async (tab = activeTab, pageNum = 1, isRefresh = false) => {
      if (!isMounted.current) return;

      const currentToken = await getValidToken();

      if (!currentToken) {
        if (isMounted.current) {
          setLoading(false);
          Alert.alert(
            "Erreur d'authentification",
            "Token non disponible. Veuillez vous reconnecter.",
            [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
          );
        }
        return;
      }

      if (!isAdmin) {
        if (isMounted.current) setLoading(false);
        return;
      }

      try {
        if (!isRefresh) setLoading(true);

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        let url = `${API_BASE_URL}/admin/commerces/pending`;
        if (tab === "all") {
          url = `${API_BASE_URL}/admin/commerces?page=${pageNum}&limit=20`;
        } else if (tab === "approved") {
          url = `${API_BASE_URL}/admin/commerces?status=approved&page=${pageNum}&limit=20`;
        } else if (tab === "rejected") {
          url = `${API_BASE_URL}/admin/commerces?status=rejected&page=${pageNum}&limit=20`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : data?.commerces || [];

          if (isMounted.current) {
            setCommerces(list);
            setAdminCities(data.adminCities || []);
            setTotalPages(data.pages || data.totalPages || 1);

            if (data.stats) {
              setStats(data.stats);
            } else if (typeof data.count === "number") {
              setStats((prev) => ({ ...prev, [tab]: data.count }));
            }
          }
        } else {
          if (response.status === 401) {
            if (isMounted.current) {
              Alert.alert(
                "Session expirée",
                "Votre session a expiré. Veuillez vous reconnecter.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      logout?.();
                      router.replace("/(auth)/login");
                    },
                  },
                ]
              );
            }
          } else if (response.status === 403) {
            if (isMounted.current) {
              Alert.alert(
                "Accès refusé",
                "Vous n'avez pas les permissions nécessaires."
              );
            }
          } else {
            if (isMounted.current) {
              Alert.alert("Erreur", `Erreur serveur: ${response.status}`);
            }
          }
        }
      } catch (error) {
        if (error.name === "AbortError") {
          if (isMounted.current) {
            Alert.alert(
              "Timeout",
              "La requête a pris trop de temps. Réessayez."
            );
          }
        } else {
          if (isMounted.current) {
            Alert.alert("Erreur réseau", error.message);
          }
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeTab, isAdmin, getValidToken, router, logout]
  );

  useEffect(() => {
    if (!authLoading && isTokenReady && token && isAdmin) {
      fetchCommerces(activeTab, 1);
    } else if (!authLoading && !isAdmin) {
      setLoading(false);
    }
  }, [authLoading, isTokenReady, token, isAdmin]);

  useEffect(() => {
    if (!authLoading && isTokenReady && token && isAdmin) {
      setPage(1);
      fetchCommerces(activeTab, 1, true);
    }
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchCommerces(activeTab, 1, true);
  }, [activeTab, fetchCommerces]);

  const loadMore = () => {
    if (page < totalPages && !loading && activeTab !== "pending") {
      setPage((prev) => prev + 1);
      fetchCommerces(activeTab, page + 1);
    }
  };

  const approveCommerce = async (commerce) => {
    Alert.alert(
      "Confirmer l'approbation",
      `Voulez-vous approuver "${commerce.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Approuver",
          onPress: async () => {
            try {
              setActionLoading(commerce._id);
              const currentToken = await getValidToken();

              if (!currentToken) {
                Alert.alert("Erreur", "Token non disponible");
                return;
              }

              const response = await fetch(
                `${API_BASE_URL}/admin/commerce/${commerce._id}/approve`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentToken}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert("Succès", "Commerce approuvé !");
                setDetailModalVisible(false);
                fetchCommerces(activeTab, 1, true);
              } else {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert(
                  "Erreur",
                  errorData.message || "Erreur lors de l'approbation"
                );
              }
            } catch (error) {
              Alert.alert("Erreur", error.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const rejectCommerce = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Erreur", "Veuillez indiquer une raison");
      return;
    }

    Keyboard.dismiss();

    try {
      setActionLoading(selectedCommerce._id);
      const currentToken = await getValidToken();

      if (!currentToken) {
        Alert.alert("Erreur", "Token non disponible");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/commerce/${selectedCommerce._id}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        }
      );

      if (response.ok) {
        Alert.alert("Succès", "Commerce rejeté");
        setRejectModalVisible(false);
        setDetailModalVisible(false);
        setRejectReason("");
        fetchCommerces(activeTab, 1, true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert("Erreur", errorData.message || "Erreur lors du rejet");
      }
    } catch (error) {
      Alert.alert("Erreur", error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  const closeRejectModal = () => {
    Keyboard.dismiss();
    setRejectModalVisible(false);
    setRejectReason("");
  };

  // ==================== ÉCRANS DE CHARGEMENT / ERREUR ====================

  if (authLoading || !isTokenReady) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {authLoading ? "Vérification des accès..." : "Chargement..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <View style={styles.loadingContainer}>
          <Ionicons name="lock-closed" size={64} color="#CCC" />
          <Text style={styles.emptyText}>Accès refusé</Text>
          <Text style={styles.emptySubtext}>
            Cette page est réservée aux administrateurs
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace("/(tabs)")}
          >
            <Ionicons name="home" size={20} color="#007AFF" />
            <Text style={styles.retryButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== COMPOSANTS UI ====================
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestion des Commerces</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      </View>

      <View style={styles.authInfoContainer}>
        <View style={styles.userInfoBadge}>
          <Ionicons name="person-circle-outline" size={16} color="#007AFF" />
          <Text style={styles.userInfoText}>
            {getUserDisplayName(user)} ({getUserRoleDisplay(user)})
          </Text>
        </View>
      </View>

      {adminCities !== "all" &&
        Array.isArray(adminCities) &&
        adminCities.length > 0 && (
          <View style={styles.citiesBadge}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.citiesText}>{adminCities.join(", ")}</Text>
          </View>
        )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      {Object.entries(stats).map(([key, value]) => (
        <View key={key} style={styles.statItem}>
          <View
            style={[
              styles.statDot,
              { backgroundColor: STATUS_CONFIG[key]?.color },
            ]}
          />
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{STATUS_CONFIG[key]?.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => {
            if (activeTab !== tab.key) setActiveTab(tab.key);
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText,
            ]}
          >
            {tab.label}
          </Text>
          {tab.key === "pending" && stats.pending > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pending}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCommerceCard = ({ item }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedCommerce(item);
          setDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          {item.logo?.url ? (
            <Image source={{ uri: item.logo.url }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder]}>
              <Ionicons name="storefront" size={24} color="#999" />
            </View>
          )}

          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardCategory}>{item.category}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.color },
            ]}
          >
            <Ionicons name={statusConfig.icon} size={12} color="#FFF" />
            <Text style={styles.statusText}>{statusConfig.label}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.address?.city}, {item.address?.postalCode}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={14} color="#888" />
            <Text style={styles.detailText}>
              {item.ownerId?.account?.username || "N/A"}
            </Text>
          </View>
        </View>

        {item.status === "pending" && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickButton, styles.rejectQuickButton]}
              onPress={() => {
                setSelectedCommerce(item);
                setRejectModalVisible(true);
              }}
              disabled={actionLoading === item._id}
            >
              {actionLoading === item._id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#FFF" />
                  <Text style={styles.quickButtonText}>Rejeter</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickButton, styles.approveQuickButton]}
              onPress={() => approveCommerce(item)}
              disabled={actionLoading === item._id}
            >
              {actionLoading === item._id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={styles.quickButtonText}>Approuver</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="storefront-outline" size={64} color="#CCC" />
      <Text style={styles.emptyText}>Aucun commerce trouvé</Text>
      <Text style={styles.emptySubtext}>
        {activeTab === "pending"
          ? "Aucun commerce en attente"
          : "Aucun commerce dans cette catégorie"}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color="#007AFF" />
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetailModal = () => (
    <Modal
      visible={detailModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setDetailModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Détails du commerce</Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedCommerce && (
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCommerceHeader}>
                {selectedCommerce.logo?.url ? (
                  <Image
                    source={{ uri: selectedCommerce.logo.url }}
                    style={styles.modalLogo}
                  />
                ) : (
                  <View style={[styles.modalLogo, styles.logoPlaceholder]}>
                    <Ionicons name="storefront" size={40} color="#999" />
                  </View>
                )}
                <View style={styles.modalCommerceInfo}>
                  <Text style={styles.modalCommerceName}>
                    {selectedCommerce.name}
                  </Text>
                  <Text style={styles.modalCommerceCategory}>
                    {selectedCommerce.category}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          STATUS_CONFIG[selectedCommerce.status]?.color,
                        alignSelf: "flex-start",
                        marginTop: 8,
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {STATUS_CONFIG[selectedCommerce.status]?.label}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Adresse</Text>
                <Text style={styles.sectionText}>
                  {selectedCommerce.address?.street}
                  {"\n"}
                  {selectedCommerce.address?.postalCode}{" "}
                  {selectedCommerce.address?.city}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Propriétaire</Text>
                <Text style={styles.sectionText}>
                  {selectedCommerce.ownerId?.account?.username}
                  {"\n"}
                  {selectedCommerce.ownerId?.email}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Date de création</Text>
                <Text style={styles.sectionText}>
                  {new Date(selectedCommerce.createdAt).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </Text>
              </View>

              {selectedCommerce.description && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.sectionText}>
                    {selectedCommerce.description}
                  </Text>
                </View>
              )}

              {selectedCommerce.status === "rejected" &&
                selectedCommerce.rejectionReason && (
                  <View style={[styles.modalSection, styles.rejectionSection]}>
                    <Text style={styles.rejectionTitle}>Raison du refus</Text>
                    <Text style={styles.rejectionText}>
                      {selectedCommerce.rejectionReason}
                    </Text>
                  </View>
                )}

              {selectedCommerce.status === "pending" && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectButton]}
                    onPress={() => setRejectModalVisible(true)}
                    disabled={actionLoading === selectedCommerce._id}
                  >
                    <Ionicons name="close-circle" size={20} color="#FFF" />
                    <Text style={styles.modalButtonText}>Rejeter</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.approveButton]}
                    onPress={() => approveCommerce(selectedCommerce)}
                    disabled={actionLoading === selectedCommerce._id}
                  >
                    {actionLoading === selectedCommerce._id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#FFF"
                        />
                        <Text style={styles.modalButtonText}>Approuver</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderRejectModal = () => {
    const modalBottomPosition =
      Platform.OS === "android" && isKeyboardVisible ? keyboardHeight : 0;

    return (
      <Modal
        visible={rejectModalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={Platform.OS === "android"}
        onRequestClose={closeRejectModal}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.rejectModalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.rejectModalContainer,
                  {
                    marginBottom: modalBottomPosition,
                    maxHeight: isKeyboardVisible
                      ? SCREEN_HEIGHT - keyboardHeight - 100
                      : SCREEN_HEIGHT * 0.7,
                  },
                ]}
              >
                <View style={styles.rejectModalHeader}>
                  <TouchableOpacity
                    onPress={closeRejectModal}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                  </TouchableOpacity>
                  <Text style={styles.rejectModalTitle}>
                    Rejeter le commerce
                  </Text>
                  <TouchableOpacity
                    onPress={closeRejectModal}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.rejectModalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.rejectLabel}>
                    Raison du refus pour "{selectedCommerce?.name}" :
                  </Text>

                  <TextInput
                    style={styles.rejectInput}
                    placeholder="Indiquez la raison du refus..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    textAlignVertical="top"
                    autoFocus={false}
                  />

                  <View style={styles.rejectModalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={closeRejectModal}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        styles.confirmRejectButton,
                        !rejectReason.trim() && styles.disabledButton,
                      ]}
                      onPress={rejectCommerce}
                      disabled={actionLoading || !rejectReason.trim()}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.modalButtonText}>Confirmer</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // ==================== RENDU PRINCIPAL ====================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {renderHeader()}
      {renderStats()}
      {renderTabs()}

      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={commerces}
          keyExtractor={(item) => item._id}
          renderItem={renderCommerceCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
              tintColor="#007AFF"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
        />
      )}

      {renderDetailModal()}
      {renderRejectModal()}
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    padding: 16,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginLeft: 8,
  },
  adminBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  authInfoContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  userInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userInfoText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  citiesBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  citiesText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFF",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  statItem: {
    alignItems: "center",
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#FFF",
  },
  badge: {
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#888",
  },
  listContent: {
    paddingVertical: 10,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  logoPlaceholder: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  cardCategory: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },
  cardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },
  quickButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectQuickButton: {
    backgroundColor: "#FF3B30",
  },
  approveQuickButton: {
    backgroundColor: "#34C759",
  },
  quickButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
  },
  modalCommerceHeader: {
    flexDirection: "row",
    marginBottom: 20,
  },
  modalLogo: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  modalCommerceInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },
  modalCommerceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalCommerceCategory: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  modalSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  rejectionSection: {
    backgroundColor: "#FFF5F5",
    padding: 12,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D32F2F",
    marginBottom: 6,
  },
  rejectionText: {
    fontSize: 14,
    color: "#C62828",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: "#FF3B30",
  },
  approveButton: {
    backgroundColor: "#34C759",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  rejectModalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 280,
  },
  rejectModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  rejectModalBody: {
    padding: 20,
  },
  rejectLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
    fontWeight: "500",
  },
  rejectInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    textAlignVertical: "top",
  },
  rejectModalActions: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },
  confirmRejectButton: {
    backgroundColor: "#FF3B30",
  },
  disabledButton: {
    backgroundColor: "#FFAAAA",
  },
});
