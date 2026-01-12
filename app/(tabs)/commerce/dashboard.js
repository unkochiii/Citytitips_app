// app/commerce/dashboard.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const API_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";

// Onglets disponibles
const TABS = [
  { key: "stats", label: "Statistiques", icon: "stats-chart" },
  { key: "promotions", label: "Promotions", icon: "pricetag" },
  { key: "schedule", label: "Horaires", icon: "time" },
  { key: "reviews", label: "Avis", icon: "star" },
];

// Jours de la semaine
const DAYS = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
  { key: "dimanche", label: "Dimanche" },
];

export default function CommerceDashboard() {
  const router = useRouter();
  const { token, user } = useAuth();

  // States principaux
  const [activeTab, setActiveTab] = useState("stats");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commerce, setCommerce] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [coupons, setCoupons] = useState({ active: [], inactive: [] });

  // States pour les modals
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState("");

  // State pour le nouveau coupon
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minimumPurchase: "",
    validUntil: "",
    usageLimit: "",
    conditions: "",
  });

  // State pour les horaires temporaires
  const [tempSchedule, setTempSchedule] = useState({});

  // ==================== FETCH DATA ====================
  const fetchCommerceData = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);

      // Récupérer les infos du commerce
      const commerceRes = await axios.get(`${API_URL}/my-commerce`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (commerceRes.data.success && commerceRes.data.commerce) {
        setCommerce(commerceRes.data.commerce);
        setTempSchedule(commerceRes.data.commerce.schedule || {});

        const commerceId = commerceRes.data.commerce._id;

        // Récupérer les stats, coupons et avis en parallèle
        const [statsRes, couponsRes, reviewsRes] = await Promise.all([
          axios
            .get(`${API_URL}/commerce/${commerceId}/stats`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { stats: null } })),
          axios
            .get(`${API_URL}/commerce/${commerceId}/coupons`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { coupons: { active: [], inactive: [] } } })),
          axios
            .get(`${API_URL}/commerce/${commerceId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { reviews: [] } })),
        ]);

        setStats(statsRes.data.stats);
        setCoupons(couponsRes.data.coupons || { active: [], inactive: [] });
        setReviews(reviewsRes.data.reviews || []);
      }
    } catch (error) {
      console.error("Erreur fetch commerce:", error);
      Alert.alert("Erreur", "Impossible de charger les données du commerce");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCommerceData();
  }, [fetchCommerceData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCommerceData();
    setRefreshing(false);
  }, [fetchCommerceData]);

  // ==================== PROMOTIONS HANDLERS ====================
  const handleCreateCoupon = async () => {
    if (
      !newCoupon.code.trim() ||
      !newCoupon.title.trim() ||
      !newCoupon.discountValue
    ) {
      Alert.alert(
        "Erreur",
        "Veuillez remplir les champs obligatoires (code, titre, valeur)"
      );
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/commerce/${commerce._id}/coupon`,
        {
          ...newCoupon,
          discountValue: parseFloat(newCoupon.discountValue),
          minimumPurchase: newCoupon.minimumPurchase
            ? parseFloat(newCoupon.minimumPurchase)
            : 0,
          usageLimit: newCoupon.usageLimit
            ? parseInt(newCoupon.usageLimit)
            : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert("Succès", "Promotion créée avec succès");
        setShowCouponModal(false);
        resetCouponForm();
        fetchCommerceData();
      }
    } catch (error) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message || "Impossible de créer la promotion"
      );
    }
  };

  const handleToggleCoupon = async (couponId) => {
    try {
      await axios.put(
        `${API_URL}/commerce/${commerce._id}/coupon/${couponId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCommerceData();
    } catch (error) {
      Alert.alert("Erreur", "Impossible de modifier le coupon");
    }
  };

  const handleDeleteCoupon = (couponId, couponCode) => {
    Alert.alert(
      "Supprimer la promotion",
      `Voulez-vous vraiment supprimer le code "${couponCode}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `${API_URL}/commerce/${commerce._id}/coupon/${couponId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              fetchCommerceData();
            } catch (error) {
              Alert.alert("Erreur", "Impossible de supprimer la promotion");
            }
          },
        },
      ]
    );
  };

  const resetCouponForm = () => {
    setNewCoupon({
      code: "",
      title: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minimumPurchase: "",
      validUntil: "",
      usageLimit: "",
      conditions: "",
    });
  };

  // ==================== SCHEDULE HANDLERS ====================
  const handleUpdateSchedule = async () => {
    try {
      await axios.put(
        `${API_URL}/commerce/${commerce._id}/schedule`,
        { schedule: tempSchedule },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Succès", "Horaires mis à jour avec succès");
      setShowScheduleModal(false);
      fetchCommerceData();
    } catch (error) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message ||
          "Impossible de mettre à jour les horaires"
      );
    }
  };

  const updateDaySchedule = (day, field, value) => {
    setTempSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  // ==================== REVIEWS HANDLERS ====================
  const handleReplyReview = async () => {
    if (!replyText.trim()) {
      Alert.alert("Erreur", "Veuillez entrer une réponse");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/review/${selectedReview._id}/reply`,
        { content: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Succès", "Réponse envoyée avec succès");
      setShowReplyModal(false);
      setReplyText("");
      setSelectedReview(null);
      fetchCommerceData();
    } catch (error) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message || "Impossible d'envoyer la réponse"
      );
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  // Render Stats Tab
  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      {/* Cartes statistiques principales */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="eye-outline" size={32} color="#007bff" />
          <Text style={styles.statValue}>{stats?.views?.total || 0}</Text>
          <Text style={styles.statLabel}>Vues totales</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="finger-print-outline" size={32} color="#10b981" />
          <Text style={styles.statValue}>{stats?.clicks?.total || 0}</Text>
          <Text style={styles.statLabel}>Clics totaux</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="star" size={32} color="#f59e0b" />
          <Text style={styles.statValue}>{stats?.rating?.average || 0}</Text>
          <Text style={styles.statLabel}>Note moyenne</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="chatbubbles-outline" size={32} color="#8b5cf6" />
          <Text style={styles.statValue}>{stats?.rating?.total || 0}</Text>
          <Text style={styles.statLabel}>Total avis</Text>
        </View>
      </View>

      {/* Détails des clics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Détails des clics</Text>
        <View style={styles.clicksDetails}>
          <View style={styles.clickItem}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.clickLabel}>Téléphone</Text>
            <Text style={styles.clickValue}>{stats?.clicks?.phone || 0}</Text>
          </View>
          <View style={styles.clickItem}>
            <Ionicons name="globe-outline" size={20} color="#666" />
            <Text style={styles.clickLabel}>Site web</Text>
            <Text style={styles.clickValue}>{stats?.clicks?.website || 0}</Text>
          </View>
          <View style={styles.clickItem}>
            <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
            <Text style={styles.clickLabel}>WhatsApp</Text>
            <Text style={styles.clickValue}>
              {stats?.clicks?.whatsapp || 0}
            </Text>
          </View>
          <View style={styles.clickItem}>
            <Ionicons name="navigate-outline" size={20} color="#666" />
            <Text style={styles.clickLabel}>Itinéraire</Text>
            <Text style={styles.clickValue}>
              {stats?.clicks?.directions || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Taux de conversion */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.conversionCard}>
          <Text style={styles.conversionLabel}>Taux de conversion</Text>
          <Text style={styles.conversionValue}>
            {stats?.engagement?.conversionRate || 0}%
          </Text>
          <Text style={styles.conversionSubtext}>(Clics / Vues)</Text>
        </View>
      </View>

      {/* Distribution des notes */}
      {stats?.rating?.distribution && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribution des notes</Text>
          <View style={styles.ratingDistribution}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <View key={rating} style={styles.ratingBar}>
                <Text style={styles.ratingLabel}>{rating} ★</Text>
                <View style={styles.ratingBarContainer}>
                  <View
                    style={[
                      styles.ratingBarFill,
                      {
                        width: `${
                          stats.rating.total > 0
                            ? (stats.rating.distribution[rating] /
                                stats.rating.total) *
                              100
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.ratingCount}>
                  {stats.rating.distribution[rating] || 0}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // Render Promotions Tab
  const renderPromotionsTab = () => (
    <View style={styles.tabContent}>
      {/* Bouton créer */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCouponModal(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Créer une promotion</Text>
      </TouchableOpacity>

      {/* Coupons actifs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Promotions actives ({coupons.active?.length || 0})
        </Text>
        {coupons.active?.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucune promotion active</Text>
          </View>
        ) : (
          coupons.active?.map((coupon) => (
            <View key={coupon._id} style={styles.couponCard}>
              <View style={styles.couponHeader}>
                <View style={styles.couponCodeBadge}>
                  <Text style={styles.couponCode}>{coupon.code}</Text>
                </View>
                <View style={styles.couponActions}>
                  <TouchableOpacity
                    onPress={() => handleToggleCoupon(coupon._id)}
                    style={styles.couponActionBtn}
                  >
                    <Ionicons name="pause-circle" size={24} color="#f59e0b" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCoupon(coupon._id, coupon.code)}
                    style={styles.couponActionBtn}
                  >
                    <Ionicons name="trash" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.couponTitle}>{coupon.title}</Text>
              <Text style={styles.couponDiscount}>
                {coupon.discountType === "percentage"
                  ? `-${coupon.discountValue}%`
                  : `-${coupon.discountValue}€`}
              </Text>
              {coupon.description && (
                <Text style={styles.couponDescription}>
                  {coupon.description}
                </Text>
              )}
              <View style={styles.couponMeta}>
                {coupon.validUntil && (
                  <Text style={styles.couponMetaText}>
                    Expire le{" "}
                    {new Date(coupon.validUntil).toLocaleDateString("fr-FR")}
                  </Text>
                )}
                {coupon.usageLimit && (
                  <Text style={styles.couponMetaText}>
                    {coupon.usedCount || 0}/{coupon.usageLimit} utilisations
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Coupons inactifs */}
      {coupons.inactive?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Promotions inactives ({coupons.inactive.length})
          </Text>
          {coupons.inactive.map((coupon) => (
            <View
              key={coupon._id}
              style={[styles.couponCard, styles.couponInactive]}
            >
              <View style={styles.couponHeader}>
                <View
                  style={[styles.couponCodeBadge, styles.couponCodeInactive]}
                >
                  <Text style={[styles.couponCode, { color: "#999" }]}>
                    {coupon.code}
                  </Text>
                </View>
                <View style={styles.couponActions}>
                  <TouchableOpacity
                    onPress={() => handleToggleCoupon(coupon._id)}
                    style={styles.couponActionBtn}
                  >
                    <Ionicons name="play-circle" size={24} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCoupon(coupon._id, coupon.code)}
                    style={styles.couponActionBtn}
                  >
                    <Ionicons name="trash" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.couponTitle, { color: "#999" }]}>
                {coupon.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Render Schedule Tab
  const renderScheduleTab = () => (
    <View style={styles.tabContent}>
      {/* Bouton modifier */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => {
          setTempSchedule(commerce?.schedule || {});
          setShowScheduleModal(true);
        }}
      >
        <Ionicons name="create" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Modifier les horaires</Text>
      </TouchableOpacity>

      {/* Affichage des horaires actuels */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horaires actuels</Text>
        {DAYS.map((day) => {
          const daySchedule = commerce?.schedule?.[day.key];
          const isOpen = daySchedule?.isOpen;

          return (
            <View key={day.key} style={styles.scheduleRow}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              {isOpen ? (
                <View style={styles.scheduleHours}>
                  <Text style={styles.scheduleTime}>
                    {daySchedule.open} - {daySchedule.close}
                  </Text>
                  {daySchedule.breakStart && daySchedule.breakEnd && (
                    <Text style={styles.scheduleBreak}>
                      Pause: {daySchedule.breakStart} - {daySchedule.breakEnd}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.scheduleClosed}>Fermé</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Statut actuel */}
      <View style={styles.section}>
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: commerce?.isCurrentlyOpen
                  ? "#10b981"
                  : "#ef4444",
              },
            ]}
          />
          <Text style={styles.statusText}>
            {commerce?.isCurrentlyOpen
              ? "Actuellement ouvert"
              : "Actuellement fermé"}
          </Text>
        </View>
      </View>
    </View>
  );

  // Render Reviews Tab
  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {/* Résumé des avis */}
      <View style={styles.reviewsSummary}>
        <View style={styles.reviewsAverage}>
          <Text style={styles.reviewsAverageValue}>
            {stats?.rating?.average?.toFixed(1) || "0.0"}
          </Text>
          <View style={styles.reviewsStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={
                  star <= (stats?.rating?.average || 0)
                    ? "star"
                    : "star-outline"
                }
                size={20}
                color="#f59e0b"
              />
            ))}
          </View>
          <Text style={styles.reviewsCount}>
            {stats?.rating?.total || 0} avis
          </Text>
        </View>
      </View>

      {/* Liste des avis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avis clients</Text>
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review._id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAuthor}>
                  {review.authorId?.account?.avatar?.secure_url ? (
                    <Image
                      source={{
                        uri: review.authorId.account.avatar.secure_url,
                      }}
                      style={styles.reviewAvatar}
                    />
                  ) : (
                    <View style={styles.reviewAvatarPlaceholder}>
                      <Text style={styles.reviewAvatarText}>
                        {review.authorId?.account?.username
                          ?.charAt(0)
                          .toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.reviewUsername}>
                      {review.authorId?.account?.username || "Anonyme"}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                    </Text>
                  </View>
                </View>
                <View style={styles.reviewRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= review.rating ? "star" : "star-outline"}
                      size={16}
                      color="#f59e0b"
                    />
                  ))}
                </View>
              </View>

              {review.content && (
                <Text style={styles.reviewContent}>{review.content}</Text>
              )}

              {/* Réponse du commerce */}
              {review.ownerResponse?.content ? (
                <View style={styles.ownerResponse}>
                  <View style={styles.ownerResponseHeader}>
                    <Ionicons name="business" size={16} color="#007bff" />
                    <Text style={styles.ownerResponseLabel}>Votre réponse</Text>
                  </View>
                  <Text style={styles.ownerResponseText}>
                    {review.ownerResponse.content}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.replyButton}
                  onPress={() => {
                    setSelectedReview(review);
                    setShowReplyModal(true);
                  }}
                >
                  <Ionicons
                    name="return-down-forward"
                    size={18}
                    color="#007bff"
                  />
                  <Text style={styles.replyButtonText}>Répondre</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );

  // ==================== MODALS ====================

  // Modal Création Coupon
  const renderCouponModal = () => (
    <Modal
      visible={showCouponModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowCouponModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle promotion</Text>
            <TouchableOpacity onPress={() => setShowCouponModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Code promo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: SUMMER20"
              value={newCoupon.code}
              onChangeText={(text) =>
                setNewCoupon({ ...newCoupon, code: text.toUpperCase() })
              }
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Titre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Soldes d'été"
              value={newCoupon.title}
              onChangeText={(text) =>
                setNewCoupon({ ...newCoupon, title: text })
              }
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description de l'offre..."
              value={newCoupon.description}
              onChangeText={(text) =>
                setNewCoupon({ ...newCoupon, description: text })
              }
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Type de réduction *</Text>
            <View style={styles.discountTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.discountTypeBtn,
                  newCoupon.discountType === "percentage" &&
                    styles.discountTypeBtnActive,
                ]}
                onPress={() =>
                  setNewCoupon({ ...newCoupon, discountType: "percentage" })
                }
              >
                <Text
                  style={[
                    styles.discountTypeBtnText,
                    newCoupon.discountType === "percentage" &&
                      styles.discountTypeBtnTextActive,
                  ]}
                >
                  Pourcentage (%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.discountTypeBtn,
                  newCoupon.discountType === "fixed" &&
                    styles.discountTypeBtnActive,
                ]}
                onPress={() =>
                  setNewCoupon({ ...newCoupon, discountType: "fixed" })
                }
              >
                <Text
                  style={[
                    styles.discountTypeBtnText,
                    newCoupon.discountType === "fixed" &&
                      styles.discountTypeBtnTextActive,
                  ]}
                >
                  Montant fixe (€)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Valeur de la réduction *</Text>
            <TextInput
              style={styles.input}
              placeholder={
                newCoupon.discountType === "percentage" ? "Ex: 20" : "Ex: 10"
              }
              value={newCoupon.discountValue}
              onChangeText={(text) =>
                setNewCoupon({ ...newCoupon, discountValue: text })
              }
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Achat minimum (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 50 (optionnel)"
              value={newCoupon.minimumPurchase}
              onChangeText={(text) =>
                setNewCoupon({ ...newCoupon, minimumPurchase: text })
              }
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Limite d'utilisation</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 100 (optionnel)"
              value={newCoupon.usageLimit}
              onChangeText={(text) =>
                setNewCoupon({ ...newCoupon, usageLimit: text })
              }
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Conditions d'utilisation..."
              value={newCoupon.conditions}
              onChangeText={(text) =>
                setNewCoupon({ ...newCoupon, conditions: text })
              }
              multiline
              numberOfLines={2}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowCouponModal(false);
                resetCouponForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateCoupon}
            >
              <Text style={styles.submitButtonText}>Créer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal Modification Horaires
  const renderScheduleModal = () => (
    <Modal
      visible={showScheduleModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowScheduleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier les horaires</Text>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {DAYS.map((day) => (
              <View key={day.key} style={styles.scheduleEditRow}>
                <View style={styles.scheduleEditHeader}>
                  <Text style={styles.scheduleEditDay}>{day.label}</Text>
                  <Switch
                    value={tempSchedule[day.key]?.isOpen || false}
                    onValueChange={(value) =>
                      updateDaySchedule(day.key, "isOpen", value)
                    }
                    trackColor={{ false: "#ddd", true: "#10b981" }}
                    thumbColor="#fff"
                  />
                </View>

                {tempSchedule[day.key]?.isOpen && (
                  <View style={styles.scheduleEditTimes}>
                    <View style={styles.timeInputGroup}>
                      <Text style={styles.timeLabel}>Ouverture</Text>
                      <TextInput
                        style={styles.timeInput}
                        placeholder="09:00"
                        value={tempSchedule[day.key]?.open || ""}
                        onChangeText={(text) =>
                          updateDaySchedule(day.key, "open", text)
                        }
                      />
                    </View>
                    <View style={styles.timeInputGroup}>
                      <Text style={styles.timeLabel}>Fermeture</Text>
                      <TextInput
                        style={styles.timeInput}
                        placeholder="18:00"
                        value={tempSchedule[day.key]?.close || ""}
                        onChangeText={(text) =>
                          updateDaySchedule(day.key, "close", text)
                        }
                      />
                    </View>
                    <View style={styles.timeInputGroup}>
                      <Text style={styles.timeLabel}>Pause début</Text>
                      <TextInput
                        style={styles.timeInput}
                        placeholder="12:00"
                        value={tempSchedule[day.key]?.breakStart || ""}
                        onChangeText={(text) =>
                          updateDaySchedule(day.key, "breakStart", text)
                        }
                      />
                    </View>
                    <View style={styles.timeInputGroup}>
                      <Text style={styles.timeLabel}>Pause fin</Text>
                      <TextInput
                        style={styles.timeInput}
                        placeholder="14:00"
                        value={tempSchedule[day.key]?.breakEnd || ""}
                        onChangeText={(text) =>
                          updateDaySchedule(day.key, "breakEnd", text)
                        }
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowScheduleModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleUpdateSchedule}
            >
              <Text style={styles.submitButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal Réponse Avis
  const renderReplyModal = () => (
    <Modal
      visible={showReplyModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowReplyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Répondre à l'avis</Text>
            <TouchableOpacity onPress={() => setShowReplyModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {selectedReview && (
              <View style={styles.reviewPreview}>
                <Text style={styles.reviewPreviewAuthor}>
                  {selectedReview.authorId?.account?.username || "Anonyme"}
                </Text>
                <View style={styles.reviewPreviewRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={
                        star <= selectedReview.rating ? "star" : "star-outline"
                      }
                      size={14}
                      color="#f59e0b"
                    />
                  ))}
                </View>
                <Text style={styles.reviewPreviewContent} numberOfLines={3}>
                  {selectedReview.content}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Votre réponse</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Écrivez votre réponse..."
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowReplyModal(false);
                setReplyText("");
                setSelectedReview(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleReplyReview}
            >
              <Text style={styles.submitButtonText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==================== MAIN RENDER ====================
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Chargement du dashboard...</Text>
      </View>
    );
  }

  if (!commerce) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Commerce non trouvé</Text>
        <Text style={styles.errorText}>
          Vous n'avez pas de commerce associé à votre compte.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Info Commerce */}
      <View style={styles.commerceInfo}>
        {commerce.logo?.url ? (
          <Image
            source={{ uri: commerce.logo.url }}
            style={styles.commerceLogo}
          />
        ) : (
          <View style={styles.commerceLogoPlaceholder}>
            <Ionicons name="storefront" size={32} color="#fff" />
          </View>
        )}
        <View style={styles.commerceDetails}>
          <Text style={styles.commerceName}>{commerce.name}</Text>
          <Text style={styles.commerceCategory}>{commerce.category}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={activeTab === tab.key ? "#10b981" : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "stats" && renderStatsTab()}
        {activeTab === "promotions" && renderPromotionsTab()}
        {activeTab === "schedule" && renderScheduleTab()}
        {activeTab === "reviews" && renderReviewsTab()}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modals */}
      {renderCouponModal()}
      {renderScheduleModal()}
      {renderReplyModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: "#10b981",
    borderRadius: 10,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerRight: {
    width: 34,
  },

  // Commerce Info
  commerceInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  commerceLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  commerceLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  commerceDetails: {
    marginLeft: 15,
    flex: 1,
  },
  commerceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  commerceCategory: {
    fontSize: 14,
    color: "#666",
    textTransform: "capitalize",
    marginTop: 2,
  },

  // Tabs
  tabsContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#10b981",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  tabTextActive: {
    color: "#10b981",
    fontWeight: "600",
  },

  // Content
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 15,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },

  // Clicks Details
  clicksDetails: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
  },
  clickItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  clickLabel: {
    flex: 1,
    marginLeft: 15,
    fontSize: 14,
    color: "#333",
  },
  clickValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  // Conversion
  conversionCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  conversionLabel: {
    fontSize: 14,
    color: "#666",
  },
  conversionValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#10b981",
    marginTop: 10,
  },
  conversionSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },

  // Rating Distribution
  ratingDistribution: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
  },
  ratingBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ratingLabel: {
    width: 40,
    fontSize: 12,
    color: "#666",
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginHorizontal: 10,
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 4,
  },
  ratingCount: {
    width: 30,
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },

  // Create Button
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    gap: 10,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 15,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 14,
    color: "#999",
  },

  // Coupon Card
  couponCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  couponInactive: {
    opacity: 0.6,
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  couponCodeBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  couponCodeInactive: {
    backgroundColor: "#ddd",
  },
  couponCode: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  couponActions: {
    flexDirection: "row",
    gap: 10,
  },
  couponActionBtn: {
    padding: 5,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  couponDiscount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 5,
  },
  couponDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  couponMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  couponMetaText: {
    fontSize: 12,
    color: "#999",
  },

  // Schedule
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    width: 100,
  },
  scheduleHours: {
    flex: 1,
    alignItems: "flex-end",
  },
  scheduleTime: {
    fontSize: 14,
    color: "#333",
  },
  scheduleBreak: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  scheduleClosed: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
  },

  // Status Card
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    gap: 15,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  // Reviews Summary
  reviewsSummary: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  reviewsAverage: {
    alignItems: "center",
  },
  reviewsAverageValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
  },
  reviewsStars: {
    flexDirection: "row",
    marginTop: 10,
  },
  reviewsCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
  },

  // Review Card
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewUsername: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
  },
  reviewRating: {
    flexDirection: "row",
  },
  reviewContent: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 10,
  },
  ownerResponse: {
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  ownerResponseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  ownerResponseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007bff",
  },
  ownerResponseText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  replyButtonText: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "500",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  // Form
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  discountTypeContainer: {
    flexDirection: "row",
    gap: 10,
  },
  discountTypeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  discountTypeBtnActive: {
    backgroundColor: "#10b981",
  },
  discountTypeBtnText: {
    fontSize: 14,
    color: "#666",
  },
  discountTypeBtnTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  submitButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#10b981",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },

  // Schedule Edit
  scheduleEditRow: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  scheduleEditHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scheduleEditDay: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  scheduleEditTimes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 15,
  },
  timeInputGroup: {
    width: "48%",
  },
  timeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  timeInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },

  // Review Preview
  reviewPreview: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  reviewPreviewAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  reviewPreviewRating: {
    flexDirection: "row",
    marginTop: 5,
  },
  reviewPreviewContent: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
  },

  bottomSpacer: {
    height: 30,
  },
});
