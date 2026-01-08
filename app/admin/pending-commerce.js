// app/(tabs)/admin/pending-commerce.js
import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext"; // ✅ Chemin corrigé
import { withAdminOnly } from "../components/withAdminAccess"; // ✅ Import du HOC

// ==================== CONFIGURATION API ====================
const API_BASE_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

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

// ==================== COMPOSANT PRINCIPAL ====================
function PendingCommerce() {
  const router = useRouter();
  const { user, token, refreshUser } = useAuth(); // ✅ Plus besoin de isLoading

  // ✅ SUPPRIMÉ : Les vérifications authLoading et user.role (le HOC s'en charge)

  // États
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

  // Modal states
  const [selectedCommerce, setSelectedCommerce] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Intercepteur simplifié avec le token du context
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [token]);

  // ==================== FONCTIONS API ====================
  const fetchCommerces = useCallback(
    async (tab = activeTab, pageNum = 1, isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);

        let response;

        // helper to normalize different response shapes
        const extractList = (data) => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          if (Array.isArray(data.commerces)) return data.commerces;
          if (Array.isArray(data.list)) return data.list;
          if (Array.isArray(data.items)) return data.items;
          // fallback: try to find the first array in the object
          const arr = Object.values(data).find((v) => Array.isArray(v));
          return Array.isArray(arr) ? arr : [];
        };

        if (tab === "pending") {
          // Try admin endpoint first, fallback to public pending endpoint
          console.log("📡 Appel API: /admin/commerces/pending (try)");
          try {
            response = await api.get("/admin/commerces/pending");
          } catch (err) {
            console.log(
              "/admin/commerces/pending failed, trying /commerces/pending",
              err?.response?.status
            );
            response = await api.get("/commerces/pending");
          }

          console.log("Réponse pending:", response.data);

          const list = extractList(response.data);
          setCommerces(list);

          // adminCities may be provided by admin route
          setAdminCities(response.data.adminCities || []);

          // try to set stat if present
          if (typeof response.data.count === "number") {
            setStats((prev) => ({ ...prev, pending: response.data.count }));
          } else if (
            response.data.stats &&
            typeof response.data.stats.pending === "number"
          ) {
            setStats((prev) => ({
              ...prev,
              pending: response.data.stats.pending,
            }));
          }
        } else {
          const params = {
            page: pageNum,
            limit: 20,
            ...(tab !== "all" && { status: tab }),
          };
          console.log("📡 Appel API: /admin/commerces", params);
          response = await api.get("/admin/commerces", { params });

          const list = extractList(response.data);

          if (pageNum === 1) {
            setCommerces(list);
          } else {
            setCommerces((prev) => [...prev, ...list]);
          }

          setStats(
            response.data.stats || {
              pending: 0,
              approved: 0,
              rejected: 0,
              suspended: 0,
            }
          );
          setTotalPages(response.data.pages || 1);
          setAdminCities(response.data.adminCities || []);
        }
      } catch (error) {
        console.log("=== Erreur fetchCommerces ===");
        console.log("Status:", error.response?.status);
        console.log("Data:", JSON.stringify(error.response?.data, null, 2));

        if (error.response?.status === 401) {
          Alert.alert(
            "Session expirée",
            "Votre session a expiré. Veuillez vous reconnecter.",
            [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
          );
        } else if (error.response?.status === 403) {
          // Try to refresh user profile - maybe the role changed server-side
          const updated = await (refreshUser
            ? refreshUser()
            : Promise.resolve(null));

          if (updated && updated.role !== "admin") {
            Alert.alert(
              "Accès refusé",
              "Votre rôle a changé et vous n'êtes plus administrateur.",
              [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
            );
          } else {
            Alert.alert(
              "Accès refusé",
              "Vous n'avez pas les permissions nécessaires.",
              [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
            );
          }
        } else {
          Alert.alert(
            "Erreur",
            error.response?.data?.message ||
              "Impossible de charger les commerces"
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, token, router]
  );

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
              await api.put(`/admin/commerce/${commerce._id}/approve`);
              Alert.alert("Succès", "Commerce approuvé !");
              setDetailModalVisible(false);
              fetchCommerces(activeTab, 1, true);
            } catch (error) {
              Alert.alert("Erreur", error.response?.data?.message || "Erreur");
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

    try {
      setActionLoading(selectedCommerce._id);
      await api.put(`/admin/commerce/${selectedCommerce._id}/reject`, {
        reason: rejectReason.trim(),
      });
      Alert.alert("Succès", "Commerce rejeté");
      setRejectModalVisible(false);
      setDetailModalVisible(false);
      setRejectReason("");
      fetchCommerces(activeTab, 1, true);
    } catch (error) {
      Alert.alert("Erreur", error.response?.data?.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (token) {
      setPage(1);
      fetchCommerces(activeTab, 1);
    }
  }, [activeTab, token]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchCommerces(activeTab, 1, true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading && activeTab !== "pending") {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCommerces(activeTab, nextPage);
    }
  };

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

      {/* Info utilisateur */}
      <View style={styles.authInfoContainer}>
        <View style={styles.userInfoBadge}>
          <Ionicons name="person-circle-outline" size={16} color="#007AFF" />
          <Text style={styles.userInfoText}>
            {user?.username || user?.account?.username || "Admin"} ({user?.role}
            )
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
          onPress={() => setActiveTab(tab.key)}
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
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.logo} />
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
                {selectedCommerce.logo ? (
                  <Image
                    source={{ uri: selectedCommerce.logo }}
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

  const renderRejectModal = () => (
    <Modal
      visible={rejectModalVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        setRejectModalVisible(false);
        setRejectReason("");
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.rejectModalContent]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setRejectModalVisible(false);
                setRejectReason("");
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Rejeter le commerce</Text>
            <TouchableOpacity
              onPress={() => {
                setRejectModalVisible(false);
                setRejectReason("");
              }}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.rejectModalBody}>
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
            />

            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectReason("");
                }}
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
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==================== RENDER PRINCIPAL ====================
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

// ✅ Export avec le HOC
export default withAdminOnly(PendingCommerce);

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
  rejectModalContent: {
    maxHeight: "60%",
  },
  rejectModalBody: {
    padding: 20,
  },
  rejectLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
  },
  rejectInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E0E0E0",
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
