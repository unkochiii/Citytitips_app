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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";

const API_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";

export default function CommerceDetail() {
  // ✅ CORRECTION 1: Extraction robuste de l'ID (gère les tableaux et undefined)
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const router = useRouter();
  const { token } = useAuth();

  // ✅ CORRECTION 2: States plus descriptifs
  const [activeTab, setActiveTab] = useState("pourVous");
  const [commerce, setCommerce] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ CORRECTION 3: Dépendance conditionnelle - ne charge que si l'ID existe
  useEffect(() => {
    if (id && typeof id === "string") {
      fetchCommerce();
    } else {
      console.warn("ID invalide ou manquant:", id);
      setError("Paramètre ID invalide");
      setLoading(false);
    }
  }, [id]);

  const fetchCommerce = async () => {
    try {
      setLoading(true);
      setError(null); // Réinitialiser l'erreur
      console.log("🚀 Fetching commerce id:", id);

      // ✅ CORRECTION 4: Headers avec vérification robuste du token
      const headers = { "Content-Type": "application/json" };
      const tokenValid =
        token &&
        token !== "null" &&
        token !== "undefined" &&
        String(token).trim();

      if (tokenValid) {
        headers.Authorization = `Bearer ${token}`;
        console.log("🔑 Token valide fourni");
      } else {
        console.log("📝 Requête anonyme (pas de token valide)");
      }

      // ✅ CORRECTION 5: Requête simple et directe
      const response = await axios.get(`${API_URL}/commerce/${id}`, {
        headers,
        timeout: 10000,
      });

      console.log("📡 API Response status:", response.status);

      // ✅ CORRECTION 6: Log de la structure complète pour debug
      console.log(
        "📦 Raw API response data:",
        JSON.stringify(response.data, null, 2)
      );

      // ✅ CORRECTION 7: Extraction simplifiée et plus fiable
      const data = response.data || {};

      // Tente différentes structures possibles
      let commerceObj =
        data.commerce || data.data?.commerce || data.data || data;

      // ✅ CORRECTION 8: Vérification robuste de la validité
      const isValidCommerce =
        commerceObj &&
        (commerceObj._id ||
          commerceObj.id ||
          commerceObj.name ||
          commerceObj.address);

      if (!isValidCommerce) {
        console.error(
          "❌ Commerce invalide - structure inattendue:",
          commerceObj
        );
        console.error("📋 Structure complète reçue:", data);
        setError(
          `Structure de données invalide. Attendu: commerce ou data.commerce`
        );
        setCommerce(null);
        setLoading(false);
        return;
      }

      console.log(
        "✅ Commerce valide trouvé:",
        commerceObj.name || commerceObj._id
      );

      // ✅ CORRECTION 9: Extraction des reviews avec vérification de tableau
      const reviewsData = data.reviews || data.data?.reviews || [];
      const reviewsArr = Array.isArray(reviewsData) ? reviewsData : [];

      // ✅ CORRECTION 10: Extraction des flags avec gestion des valeurs nulles
      const openNowFlag = data.isOpenNow ?? data.data?.isOpenNow ?? false;
      const ownerFlag = data.isOwner ?? data.data?.isOwner ?? false;

      // ✅ CORRECTION 11: Mise à jour du compteur de vues
      const updatedCommerce = {
        ...commerceObj,
        viewsCount:
          commerceObj.status === "approved"
            ? (commerceObj.viewsCount || 0) + 1
            : commerceObj.viewsCount || 0,
      };

      // ✅ CORRECTION 12: Mise à jour des states en une seule fois
      setCommerce(updatedCommerce);
      setReviews(reviewsArr);
      setIsOpenNow(Boolean(openNowFlag));
      setIsOwner(Boolean(ownerFlag));
      setLoading(false);
    } catch (err) {
      console.error("❌ Erreur fetching commerce:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        url: `${API_URL}/commerce/${id}`,
      });

      // ✅ CORRECTION 13: Messages d'erreur plus précis
      if (err.response?.status === 404) {
        setError("Commerce introuvable (404)");
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Accès non autorisé. Veuillez vous reconnecter.");
      } else if (err.message?.includes("timeout")) {
        setError("Délai de connexion dépassé. Vérifiez votre réseau.");
      } else {
        setError(err.response?.data?.message || "Erreur de connexion");
      }

      setCommerce(null);
      setLoading(false);
    }
  };

  // ... (le reste du composant reste identique: fonctions de formatage et rendu)

  // Formater l'adresse complète
  const getFullAddress = () => {
    if (!commerce?.address) return null;
    const { street, city, postalCode } = commerce.address;
    return [street, postalCode, city].filter(Boolean).join(", ");
  };

  // Formater les horaires pour l'affichage
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

  // Formater la catégorie
  const formatCategory = (category) => {
    const categories = {
      sante: "Santé",
      alimentation: "Alimentation",
      beaute: "Beauté",
      services: "Services",
      restaurant: "Restaurant",
    };
    return categories[category] || category;
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
          {/* Adresse */}
          {fullAddress && (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{fullAddress}</Text>
            </View>
          )}

          {/* Téléphone */}
          {commerce.contact?.phone && (
            <Pressable style={styles.contactRow} onPress={handleCall}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{commerce.contact.phone}</Text>
            </Pressable>
          )}

          {/* Email */}
          {commerce.contact?.email && (
            <Pressable style={styles.contactRow} onPress={handleEmail}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{commerce.contact.email}</Text>
            </Pressable>
          )}

          {/* Website */}
          {commerce.contact?.website && (
            <Pressable style={styles.contactRow} onPress={handleWebsite}>
              <Ionicons name="globe-outline" size={20} color="#666" />
              <Text style={styles.contactText}>{commerce.contact.website}</Text>
            </Pressable>
          )}

          {/* Note */}
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
                source={{ uri: commerce.images[0] }}
                style={styles.mainImage}
              />
            </View>
            {commerce.images.length > 1 && (
              <View style={styles.galleryThumbnails}>
                {commerce.images.slice(1, 4).map((image, index) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    style={styles.thumbnailImage}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Logo si pas d'images */}
        {(!commerce.images || commerce.images.length === 0) &&
          commerce.logo && (
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: commerce.logo }}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          )}

        {/* Contenu des tabs */}
        <View style={styles.tabContent}>
          {activeTab === "pourVous" && (
            <View>
              {/* Description */}
              {commerce.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>À propos</Text>
                  <Text style={styles.descriptionText}>
                    {commerce.description}
                  </Text>
                </View>
              )}

              {/* Offres */}
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
              <Text style={styles.sectionTitle}>Avis clients</Text>
              {reviews.length > 0 ? (
                reviews.map((review, index) => (
                  <View key={review._id || index} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>
                        {review.authorId?.account?.username || "Anonyme"}
                      </Text>
                      <View style={styles.reviewRating}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.reviewRatingText}>
                          {review.rating}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.reviewText}>{review.comment}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noContent}>Aucun avis pour le moment</Text>
              )}
            </View>
          )}

          {activeTab === "details" && (
            <View>
              {/* Description */}
              {commerce.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>
                    {commerce.description}
                  </Text>
                </View>
              )}

              {/* Horaires */}
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

              {/* Statistiques */}
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
                    {commerce.ownerId?.account?.avatar?.secure_url ? (
                      <Image
                        source={{
                          uri: commerce.ownerId.account.avatar.secure_url,
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
            Avis
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Loading & Error
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

  // Header
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

  // Main Info
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

  // WhatsApp Button
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

  // Contact
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

  // Gallery
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

  // Logo
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

  // Sections
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
  },

  // Schedule
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

  // Stats
  statText: {
    fontSize: 14,
    color: "#666",
  },

  // Offers
  offerItem: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 8,
  },

  // Reviews
  reviewItem: {
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewAuthor: {
    fontWeight: "600",
    color: "#333",
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 14,
    color: "#666",
  },
  reviewText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },

  // Owner
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

  // Tab Content
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // Bottom Tabs
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
});
