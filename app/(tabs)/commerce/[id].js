import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Linking,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";

const API_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

export default function CommerceDetail() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const router = useRouter();
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState("pourVous");
  const [commerce, setCommerce] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États pour les avis
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [ratingBreakdown, setRatingBreakdown] = useState({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [sortOption, setSortOption] = useState("recent");

  // États pour le formulaire d'avis
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewTitle, setNewReviewTitle] = useState("");
  const [newReviewContent, setNewReviewContent] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // États pour la réponse du propriétaire
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyingToReview, setReplyingToReview] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // ✅ HELPER pour extraire l'URL d'une image
  const getImageUri = (image) => {
    if (!image) return null;
    if (typeof image === "string") return image;
    if (typeof image === "object") {
      return image.url || image.secure_url || image.uri || null;
    }
    return null;
  };

  // ✅ HELPER pour les headers authentifiés
  const getAuthHeaders = useCallback(() => {
    const headers = { "Content-Type": "application/json" };
    const tokenValid =
      token &&
      token !== "null" &&
      token !== "undefined" &&
      String(token).trim();

    if (tokenValid) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  useEffect(() => {
    if (id && typeof id === "string") {
      fetchCommerce();
    } else {
      console.warn("ID invalide ou manquant:", id);
      setError("Paramètre ID invalide");
      setLoading(false);
    }
  }, [id]);

  // Charger les avis quand on change d'onglet vers "avis"
  useEffect(() => {
    if (activeTab === "avis" && commerce) {
      fetchReviews();
    }
  }, [activeTab, commerce, sortOption]);

  const fetchCommerce = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🚀 Fetching commerce id:", id);

      const response = await axios.get(`${API_URL}/commerce/${id}`, {
        headers: getAuthHeaders(),
        timeout: 10000,
      });

      console.log("📡 API Response status:", response.status);

      const data = response.data || {};
      let commerceObj =
        data.commerce || data.data?.commerce || data.data || data;

      const isValidCommerce =
        commerceObj &&
        (commerceObj._id ||
          commerceObj.id ||
          commerceObj.name ||
          commerceObj.address);

      if (!isValidCommerce) {
        console.error("❌ Commerce invalide");
        setError("Structure de données invalide.");
        setCommerce(null);
        setLoading(false);
        return;
      }

      const reviewsData = data.reviews || data.data?.reviews || [];
      const reviewsArr = Array.isArray(reviewsData) ? reviewsData : [];

      const openNowFlag = data.isOpenNow ?? data.data?.isOpenNow ?? false;
      const ownerFlag = data.isOwner ?? data.data?.isOwner ?? false;

      const updatedCommerce = {
        ...commerceObj,
        viewsCount:
          commerceObj.status === "approved"
            ? (commerceObj.viewsCount || 0) + 1
            : commerceObj.viewsCount || 0,
      };

      setCommerce(updatedCommerce);
      setReviews(reviewsArr);
      setIsOpenNow(Boolean(openNowFlag));
      setIsOwner(Boolean(ownerFlag));
      setLoading(false);
    } catch (err) {
      console.error("❌ Erreur fetching commerce:", err.message);

      if (err.response?.status === 404) {
        setError("Commerce introuvable (404)");
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Accès non autorisé. Veuillez vous reconnecter.");
      } else if (err.message?.includes("timeout")) {
        setError("Délai de connexion dépassé.");
      } else {
        setError(err.response?.data?.message || "Erreur de connexion");
      }

      setCommerce(null);
      setLoading(false);
    }
  };

  // ========== FETCH REVIEWS ==========
  const fetchReviews = async (page = 1) => {
    if (!commerce?._id) return;

    try {
      setReviewsLoading(true);

      const response = await axios.get(
        `${API_URL}/commerce/${commerce._id}/reviews`,
        {
          headers: getAuthHeaders(),
          params: {
            page,
            limit: 10,
            sort: sortOption,
          },
          timeout: 10000,
        }
      );

      const data = response.data?.data || response.data;

      setReviews(data.reviews || []);
      setReviewsTotal(data.total || 0);
      setReviewsTotalPages(data.pages || 1);
      setReviewsPage(data.currentPage || 1);
      setRatingBreakdown(
        data.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      );
      setHasUserReviewed(data.hasUserReviewed || false);
      setUserReview(data.userReview || null);
    } catch (err) {
      console.error("❌ Erreur fetching reviews:", err.message);
      Alert.alert("Erreur", "Impossible de charger les avis");
    } finally {
      setReviewsLoading(false);
    }
  };

  // ========== CREATE REVIEW ==========
  const handleSubmitReview = async () => {
    if (newReviewRating === 0) {
      Alert.alert("Erreur", "Veuillez sélectionner une note");
      return;
    }

    if (!token) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour laisser un avis"
      );
      return;
    }

    try {
      setSubmittingReview(true);

      const response = await axios.post(
        `${API_URL}/commerce/${commerce._id}/review`,
        {
          rating: newReviewRating,
          title: newReviewTitle.trim() || undefined,
          content: newReviewContent.trim() || undefined,
        },
        {
          headers: getAuthHeaders(),
          timeout: 10000,
        }
      );

      const data = response.data?.data || response.data;

      // Mettre à jour la liste des avis
      setReviews((prev) => [data.review, ...prev]);
      setHasUserReviewed(true);
      setUserReview(data.review);

      // Mettre à jour la note du commerce
      if (data.newRating) {
        setCommerce((prev) => ({
          ...prev,
          rating: data.newRating,
        }));
      }

      // Réinitialiser le formulaire
      setNewReviewRating(0);
      setNewReviewTitle("");
      setNewReviewContent("");
      setShowReviewModal(false);

      Alert.alert("Succès", "Votre avis a été ajouté");
    } catch (err) {
      console.error(
        "❌ Erreur submit review:",
        err.response?.data || err.message
      );

      if (err.response?.status === 409) {
        Alert.alert("Erreur", "Vous avez déjà laissé un avis pour ce commerce");
        setHasUserReviewed(true);
      } else if (err.response?.status === 403) {
        Alert.alert(
          "Erreur",
          err.response?.data?.message || "Action non autorisée"
        );
      } else {
        Alert.alert(
          "Erreur",
          err.response?.data?.message || "Impossible d'ajouter l'avis"
        );
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  // ========== DELETE REVIEW ==========
  const handleDeleteReview = (reviewId) => {
    Alert.alert(
      "Supprimer l'avis",
      "Êtes-vous sûr de vouloir supprimer votre avis ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.delete(
                `${API_URL}/review/${reviewId}`,
                {
                  headers: getAuthHeaders(),
                  timeout: 10000,
                }
              );

              const data = response.data?.data || response.data;

              // Retirer l'avis de la liste
              setReviews((prev) => prev.filter((r) => r._id !== reviewId));
              setHasUserReviewed(false);
              setUserReview(null);

              // Mettre à jour la note du commerce
              if (data.newRating) {
                setCommerce((prev) => ({
                  ...prev,
                  rating: data.newRating,
                }));
              }

              Alert.alert("Succès", "Votre avis a été supprimé");
            } catch (err) {
              console.error("❌ Erreur delete review:", err.message);
              Alert.alert(
                "Erreur",
                err.response?.data?.message || "Impossible de supprimer l'avis"
              );
            }
          },
        },
      ]
    );
  };

  // ========== REPLY TO REVIEW (Owner) ==========
  const handleOpenReplyModal = (review) => {
    setReplyingToReview(review);
    setReplyContent("");
    setShowReplyModal(true);
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      Alert.alert("Erreur", "Veuillez saisir une réponse");
      return;
    }

    try {
      setSubmittingReply(true);

      const response = await axios.post(
        `${API_URL}/review/${replyingToReview._id}/reply`,
        {
          content: replyContent.trim(),
        },
        {
          headers: getAuthHeaders(),
          timeout: 10000,
        }
      );

      const data = response.data?.data || response.data;

      // Mettre à jour l'avis dans la liste
      setReviews((prev) =>
        prev.map((r) => (r._id === replyingToReview._id ? data.review : r))
      );

      setShowReplyModal(false);
      setReplyingToReview(null);
      setReplyContent("");

      Alert.alert("Succès", "Votre réponse a été ajoutée");
    } catch (err) {
      console.error("❌ Erreur reply:", err.response?.data || err.message);

      if (err.response?.status === 409) {
        Alert.alert("Erreur", "Vous avez déjà répondu à cet avis");
      } else {
        Alert.alert(
          "Erreur",
          err.response?.data?.message || "Impossible d'ajouter la réponse"
        );
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const getFullAddress = () => {
    if (!commerce?.address) return null;
    const { street, city, postalCode } = commerce.address;
    return [street, postalCode, city].filter(Boolean).join(", ");
  };

  const formatSchedule = () => {
    if (!commerce?.schedule) return null;

    const daysOrder = [
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
      "dimanche",
    ];
    const daysLabels = {
      lundi: "Lundi",
      mardi: "Mardi",
      mercredi: "Mercredi",
      jeudi: "Jeudi",
      vendredi: "Vendredi",
      samedi: "Samedi",
      dimanche: "Dimanche",
    };

    return daysOrder.map((day) => {
      const schedule = commerce.schedule[day];
      if (!schedule || schedule.closed) {
        return { day: daysLabels[day], hours: "Fermé" };
      }
      return {
        day: daysLabels[day],
        hours: `${schedule.open || ""} - ${schedule.close || ""}`,
      };
    });
  };

  const formatCategory = (category) => {
    const categories = {
      sante: "Santé",
      alimentation: "Alimentation",
      beaute: "Beauté",
      services: "Services",
      restaurant: "Restaurant",
      education: "Éducation",
    };
    return categories[category] || category;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleWhatsApp = () => {
    if (commerce?.contact?.whatsapp) {
      const phone = commerce.contact.whatsapp.replace(/\s/g, "");
      Linking.openURL(`https://wa.me/${phone}`);
    }
  };

  const handleCall = () => {
    if (commerce?.contact?.phone) {
      Linking.openURL(`tel:${commerce.contact.phone}`);
    }
  };

  const handleEmail = () => {
    if (commerce?.contact?.email) {
      Linking.openURL(`mailto:${commerce.contact.email}`);
    }
  };

  const handleWebsite = () => {
    if (commerce?.contact?.website) {
      Linking.openURL(commerce.contact.website);
    }
  };

  const handleShare = () => {
    // Logique de partage
  };

  // ========== RENDER STAR RATING ==========
  const renderStarRating = (
    rating,
    size = 16,
    interactive = false,
    onPress = null
  ) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Pressable
          key={i}
          onPress={() => interactive && onPress && onPress(i)}
          disabled={!interactive}
        >
          <Ionicons
            name={i <= rating ? "star" : "star-outline"}
            size={size}
            color={i <= rating ? "#FFD700" : "#ccc"}
            style={{ marginRight: 2 }}
          />
        </Pressable>
      );
    }
    return <View style={{ flexDirection: "row" }}>{stars}</View>;
  };

  // ========== RENDER RATING BREAKDOWN ==========
  const renderRatingBreakdown = () => {
    const maxCount = Math.max(...Object.values(ratingBreakdown), 1);

    return (
      <View style={styles.ratingBreakdownContainer}>
        {[5, 4, 3, 2, 1].map((rating) => (
          <View key={rating} style={styles.ratingBreakdownRow}>
            <Text style={styles.ratingBreakdownLabel}>{rating}</Text>
            <Ionicons name="star" size={12} color="#FFD700" />
            <View style={styles.ratingBreakdownBarContainer}>
              <View
                style={[
                  styles.ratingBreakdownBar,
                  {
                    width: `${(ratingBreakdown[rating] / maxCount) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.ratingBreakdownCount}>
              {ratingBreakdown[rating]}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // ========== RENDER REVIEW ITEM ==========
  const renderReviewItem = (review) => {
    const isAuthor = user && review.authorId?._id === user._id;
    const canReply = isOwner && !review.ownerResponse?.content;

    return (
      <View key={review._id} style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewAuthorContainer}>
            {getImageUri(review.authorId?.account?.avatar) ? (
              <Image
                source={{ uri: getImageUri(review.authorId.account.avatar) }}
                style={styles.reviewAuthorAvatar}
              />
            ) : (
              <View style={styles.reviewAuthorAvatarPlaceholder}>
                <Text style={styles.reviewAuthorAvatarText}>
                  {review.authorId?.account?.username
                    ?.charAt(0)
                    ?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={styles.reviewAuthorInfo}>
              <Text style={styles.reviewAuthor}>
                {review.authorId?.account?.username || "Anonyme"}
              </Text>
              <Text style={styles.reviewDate}>
                {formatDate(review.createdAt)}
              </Text>
            </View>
          </View>
          <View style={styles.reviewRating}>
            {renderStarRating(review.rating, 14)}
          </View>
        </View>

        {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}

        {review.content && (
          <Text style={styles.reviewText}>{review.content}</Text>
        )}

        {/* Réponse du propriétaire */}
        {review.ownerResponse?.content && (
          <View style={styles.ownerResponseContainer}>
            <View style={styles.ownerResponseHeader}>
              <Ionicons name="business" size={16} color="#4A90A4" />
              <Text style={styles.ownerResponseLabel}>
                Réponse du propriétaire
              </Text>
            </View>
            <Text style={styles.ownerResponseText}>
              {review.ownerResponse.content}
            </Text>
            {review.ownerResponse.createdAt && (
              <Text style={styles.ownerResponseDate}>
                {formatDate(review.ownerResponse.createdAt)}
              </Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.reviewActions}>
          {isAuthor && (
            <Pressable
              style={styles.reviewActionButton}
              onPress={() => handleDeleteReview(review._id)}
            >
              <Ionicons name="trash-outline" size={18} color="#F44336" />
              <Text style={[styles.reviewActionText, { color: "#F44336" }]}>
                Supprimer
              </Text>
            </Pressable>
          )}

          {canReply && (
            <Pressable
              style={styles.reviewActionButton}
              onPress={() => handleOpenReplyModal(review)}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#4A90A4" />
              <Text style={styles.reviewActionText}>Répondre</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // État de chargement
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90A4" />
      </View>
    );
  }

  // Erreur
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erreur: {error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchCommerce}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  // Commerce non trouvé
  if (!commerce) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Commerce non trouvé</Text>
        <Pressable style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const fullAddress = getFullAddress();
  const scheduleList = formatSchedule();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-social-outline" size={24} color="#333" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Infos principales */}
        <View style={styles.mainInfo}>
          <Text style={styles.name}>{commerce.name}</Text>

          {commerce.category && (
            <Text style={styles.category}>
              {formatCategory(commerce.category)}
            </Text>
          )}

          {/* Status et Type */}
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {isOpenNow ? "Ouvert" : "Fermé"}
              </Text>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOpenNow ? "#4CAF50" : "#F44336" },
                ]}
              />
            </View>
            <Text style={styles.type}>{formatCategory(commerce.category)}</Text>
          </View>
        </View>

        {/* Bouton WhatsApp */}
        {commerce.contact?.whatsapp && (
          <Pressable style={styles.whatsappButton} onPress={handleWhatsApp}>
            <Text style={styles.whatsappButtonText}>
              Rejoindre le groupe WhatsApp
            </Text>
          </Pressable>
        )}

        {/* Coordonnées */}
        <View style={styles.contactSection}>
          {fullAddress && (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{fullAddress}</Text>
            </View>
          )}

          {commerce.contact?.phone && (
            <Pressable style={styles.contactRow} onPress={handleCall}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{commerce.contact.phone}</Text>
            </Pressable>
          )}

          {commerce.contact?.email && (
            <Pressable style={styles.contactRow} onPress={handleEmail}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{commerce.contact.email}</Text>
            </Pressable>
          )}

          {commerce.contact?.website && (
            <Pressable style={styles.contactRow} onPress={handleWebsite}>
              <Ionicons name="globe-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{commerce.contact.website}</Text>
            </Pressable>
          )}

          {commerce.rating && (
            <View style={styles.contactRow}>
              <Ionicons name="star-outline" size={20} color="#666" />
              <Text style={styles.contactText}>
                {commerce.rating.average?.toFixed(1) || 0} (
                {commerce.rating.count || 0} avis)
              </Text>
            </View>
          )}
        </View>

        {/* Galerie photos */}
        {commerce.images && commerce.images.length > 0 && (
          <View style={styles.gallery}>
            <View style={styles.galleryMain}>
              <Image
                source={{ uri: getImageUri(commerce.images[0]) }}
                style={styles.mainImage}
              />
            </View>
            {commerce.images.length > 1 && (
              <View style={styles.galleryThumbnails}>
                {commerce.images.slice(1, 4).map((image, index) => {
                  const uri = getImageUri(image);
                  if (!uri) return null;
                  return (
                    <Image
                      key={index}
                      source={{ uri }}
                      style={styles.thumbnailImage}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Logo si pas d'images */}
        {(!commerce.images || commerce.images.length === 0) &&
          commerce.logo && (
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: getImageUri(commerce.logo) }}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          )}

        {/* Contenu des tabs */}
        <View style={styles.tabContent}>
          {activeTab === "pourVous" && (
            <View>
              {commerce.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>À propos</Text>
                  <Text style={styles.descriptionText}>
                    {commerce.description}
                  </Text>
                </View>
              )}

              {commerce.offers && commerce.offers.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Offres</Text>
                  {commerce.offers.map((offer, index) => (
                    <View key={index} style={styles.offerItem}>
                      <Text>{offer.title || offer}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === "avis" && (
            <View style={styles.section}>
              {/* En-tête des avis avec note globale */}
              <View style={styles.reviewsHeader}>
                <View style={styles.reviewsOverview}>
                  <Text style={styles.reviewsAverageRating}>
                    {commerce.rating?.average?.toFixed(1) || "0.0"}
                  </Text>
                  {renderStarRating(
                    Math.round(commerce.rating?.average || 0),
                    20
                  )}
                  <Text style={styles.reviewsCount}>{reviewsTotal} avis</Text>
                </View>

                {/* Breakdown des notes */}
                {renderRatingBreakdown()}
              </View>

              {/* Options de tri */}
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Trier par:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.sortOptions}
                >
                  {[
                    { key: "recent", label: "Récents" },
                    { key: "oldest", label: "Anciens" },
                    { key: "rating-high", label: "Meilleurs" },
                    { key: "rating-low", label: "Moins bons" },
                  ].map((option) => (
                    <Pressable
                      key={option.key}
                      style={[
                        styles.sortOption,
                        sortOption === option.key && styles.sortOptionActive,
                      ]}
                      onPress={() => setSortOption(option.key)}
                    >
                      <Text
                        style={[
                          styles.sortOptionText,
                          sortOption === option.key &&
                            styles.sortOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Bouton ajouter un avis */}
              {!hasUserReviewed && !isOwner && token && (
                <Pressable
                  style={styles.addReviewButton}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addReviewButtonText}>
                    Laisser un avis
                  </Text>
                </Pressable>
              )}

              {!token && (
                <View style={styles.loginPrompt}>
                  <Text style={styles.loginPromptText}>
                    Connectez-vous pour laisser un avis
                  </Text>
                </View>
              )}

              {isOwner && (
                <View style={styles.ownerNotice}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#4A90A4"
                  />
                  <Text style={styles.ownerNoticeText}>
                    Vous êtes le propriétaire de ce commerce
                  </Text>
                </View>
              )}

              {/* Liste des avis */}
              {reviewsLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#4A90A4"
                  style={{ marginTop: 20 }}
                />
              ) : reviews.length > 0 ? (
                <View style={styles.reviewsList}>
                  {reviews.map((review) => renderReviewItem(review))}

                  {/* Pagination */}
                  {reviewsTotalPages > 1 && (
                    <View style={styles.pagination}>
                      <Pressable
                        style={[
                          styles.paginationButton,
                          reviewsPage === 1 && styles.paginationButtonDisabled,
                        ]}
                        onPress={() =>
                          reviewsPage > 1 && fetchReviews(reviewsPage - 1)
                        }
                        disabled={reviewsPage === 1}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={reviewsPage === 1 ? "#ccc" : "#4A90A4"}
                        />
                      </Pressable>
                      <Text style={styles.paginationText}>
                        {reviewsPage} / {reviewsTotalPages}
                      </Text>
                      <Pressable
                        style={[
                          styles.paginationButton,
                          reviewsPage === reviewsTotalPages &&
                            styles.paginationButtonDisabled,
                        ]}
                        onPress={() =>
                          reviewsPage < reviewsTotalPages &&
                          fetchReviews(reviewsPage + 1)
                        }
                        disabled={reviewsPage === reviewsTotalPages}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={
                            reviewsPage === reviewsTotalPages
                              ? "#ccc"
                              : "#4A90A4"
                          }
                        />
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.noContent}>Aucun avis pour le moment</Text>
              )}
            </View>
          )}

          {activeTab === "details" && (
            <View>
              {commerce.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>
                    {commerce.description}
                  </Text>
                </View>
              )}

              {scheduleList && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Horaires</Text>
                  {scheduleList.map((item, index) => (
                    <View key={index} style={styles.scheduleRow}>
                      <Text style={styles.scheduleDay}>{item.day}</Text>
                      <Text style={styles.scheduleHours}>{item.hours}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Statistiques</Text>
                <Text style={styles.statText}>
                  👁 {commerce.viewsCount || 0} vues
                </Text>
              </View>

              {/* Propriétaire */}
              {commerce.ownerId && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Propriétaire</Text>

                  <View style={styles.ownerRow}>
                    {getImageUri(commerce.ownerId?.account?.avatar) ? (
                      <Image
                        source={{
                          uri: getImageUri(commerce.ownerId.account.avatar),
                        }}
                        style={styles.ownerAvatar}
                      />
                    ) : (
                      <View style={styles.ownerAvatarPlaceholder}>
                        <Text style={styles.ownerAvatarText}>
                          {commerce.ownerId?.account?.username
                            ?.charAt(0)
                            ?.toUpperCase() || "?"}
                        </Text>
                      </View>
                    )}

                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.statText}>
                        {commerce.ownerId.account?.username ||
                          commerce.ownerId?.toString?.() ||
                          "Non spécifié"}
                      </Text>

                      {isOwner && (
                        <Pressable
                          style={styles.editButton}
                          onPress={() =>
                            Alert.alert(
                              "Édition",
                              "Fonction d'édition non implémentée"
                            )
                          }
                        >
                          <Text style={styles.editButtonText}>Modifier</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={styles.bottomTabs}>
        <Pressable
          style={[styles.tab, activeTab === "pourVous" && styles.activeTab]}
          onPress={() => setActiveTab("pourVous")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pourVous" && styles.activeTabText,
            ]}
          >
            Pour vous
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "avis" && styles.activeTab]}
          onPress={() => setActiveTab("avis")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "avis" && styles.activeTabText,
            ]}
          >
            Avis ({commerce.rating?.count || 0})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "details" && styles.activeTab]}
          onPress={() => setActiveTab("details")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "details" && styles.activeTabText,
            ]}
          >
            Plus de détails
          </Text>
        </Pressable>
      </View>

      {/* Modal Ajouter un avis */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Laisser un avis</Text>
              <Pressable
                onPress={() => setShowReviewModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Votre note *</Text>
            <View style={styles.ratingSelector}>
              {renderStarRating(newReviewRating, 32, true, setNewReviewRating)}
            </View>

            <Text style={styles.modalLabel}>Titre (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              value={newReviewTitle}
              onChangeText={setNewReviewTitle}
              placeholder="Résumez votre expérience"
              maxLength={100}
            />

            <Text style={styles.modalLabel}>Votre avis (optionnel)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={newReviewContent}
              onChangeText={setNewReviewContent}
              placeholder="Décrivez votre expérience..."
              multiline
              numberOfLines={4}
              maxLength={1000}
            />

            <Pressable
              style={[
                styles.modalSubmitButton,
                (submittingReview || newReviewRating === 0) &&
                  styles.modalSubmitButtonDisabled,
              ]}
              onPress={handleSubmitReview}
              disabled={submittingReview || newReviewRating === 0}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitButtonText}>Publier l'avis</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Répondre à un avis (Propriétaire) */}
      <Modal
        visible={showReplyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Répondre à l'avis</Text>
              <Pressable
                onPress={() => setShowReplyModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            {replyingToReview && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToLabel}>
                  Avis de{" "}
                  {replyingToReview.authorId?.account?.username || "Anonyme"}
                </Text>
                <Text style={styles.replyingToText} numberOfLines={3}>
                  {replyingToReview.content ||
                    replyingToReview.title ||
                    "(Aucun contenu)"}
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Votre réponse *</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={replyContent}
              onChangeText={setReplyContent}
              placeholder="Répondez à cet avis..."
              multiline
              numberOfLines={4}
              maxLength={1000}
            />

            <Pressable
              style={[
                styles.modalSubmitButton,
                (submittingReply || !replyContent.trim()) &&
                  styles.modalSubmitButtonDisabled,
              ]}
              onPress={handleSubmitReply}
              disabled={submittingReply || !replyContent.trim()}
            >
              {submittingReply ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitButtonText}>
                  Publier la réponse
                </Text>
              )}
            </Pressable>
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
    backgroundColor: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4A90A4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
  },
  headerButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  mainInfo: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  type: {
    fontSize: 14,
    color: "#666",
  },
  whatsappButton: {
    backgroundColor: "#4A90A4",
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  whatsappButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  contactSection: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  gallery: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  galleryMain: {
    flex: 1,
  },
  mainImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  galleryThumbnails: {
    width: 100,
    gap: 8,
  },
  thumbnailImage: {
    width: "100%",
    height: 60,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  logoContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  noContent: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  scheduleDay: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  scheduleHours: {
    fontSize: 14,
    color: "#666",
  },
  statText: {
    fontSize: 14,
    color: "#666",
  },
  offerItem: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 8,
  },

  // Reviews styles
  reviewsHeader: {
    marginBottom: 20,
  },
  reviewsOverview: {
    alignItems: "center",
    marginBottom: 15,
  },
  reviewsAverageRating: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
  },
  reviewsCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  ratingBreakdownContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 15,
  },
  ratingBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingBreakdownLabel: {
    width: 20,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  ratingBreakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginHorizontal: 10,
  },
  ratingBreakdownBar: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 4,
  },
  ratingBreakdownCount: {
    width: 30,
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sortLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 10,
  },
  sortOptions: {
    flexDirection: "row",
  },
  sortOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    marginRight: 8,
  },
  sortOptionActive: {
    backgroundColor: "#4A90A4",
  },
  sortOptionText: {
    fontSize: 12,
    color: "#666",
  },
  sortOptionTextActive: {
    color: "#fff",
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90A4",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  addReviewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginPrompt: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  loginPromptText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  ownerNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  ownerNoticeText: {
    fontSize: 14,
    color: "#4A90A4",
    flex: 1,
  },
  reviewsList: {
    gap: 15,
  },
  reviewItem: {
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewAuthorContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reviewAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewAuthorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4A90A4",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewAuthorAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewAuthorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  reviewAuthor: {
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  ownerResponseContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
  },
  ownerResponseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  ownerResponseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A90A4",
  },
  ownerResponseText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  ownerResponseDate: {
    fontSize: 11,
    color: "#999",
    marginTop: 6,
  },
  reviewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 15,
  },
  reviewActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewActionText: {
    fontSize: 13,
    color: "#4A90A4",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 20,
  },
  paginationButton: {
    padding: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    color: "#666",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ownerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  ownerAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  ownerAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  editButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#4A90A4",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  bottomTabs: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingBottom: 30,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#333",
  },
  tabText: {
    fontSize: 14,
    color: "#999",
  },
  activeTabText: {
    color: "#333",
    fontWeight: "600",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  ratingSelector: {
    alignItems: "center",
    paddingVertical: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  modalTextarea: {
    height: 100,
    textAlignVertical: "top",
  },
  modalSubmitButton: {
    backgroundColor: "#4A90A4",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  modalSubmitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  replyingToContainer: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  replyingToLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  replyingToText: {
    fontSize: 14,
    color: "#333",
    fontStyle: "italic",
  },
});
