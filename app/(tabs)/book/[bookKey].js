import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import axios from "axios";
import api from "../../../services/api";
import StarRating from "react-native-star-rating-widget";
import Ionicons from "@expo/vector-icons/Ionicons";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AntDesign from "@expo/vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ================================
// utils
// ================================
const normalizeBookKey = (key) =>
  key ? (key.startsWith("/works/") ? key : `/works/${key}`) : null;

const stripBookKey = (key) => key?.replace("/works/", "");

const formatDate = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const avatarFallback = (name, url) =>
  url ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User"
  )}&background=4A281B&color=fff`;

// ================================
// Composant SpoilerContent
// ================================
function SpoilerContent({ content, containsSpoiler }) {
  const [revealed, setRevealed] = useState(false);

  if (!content) return null;

  if (!containsSpoiler) {
    return <Text style={styles.content}>{content}</Text>;
  }

  if (!revealed) {
    return (
      <TouchableOpacity
        onPress={() => setRevealed(true)}
        style={styles.spoilerHidden}
        activeOpacity={0.7}
      >
        <View style={styles.spoilerHiddenContent}>
          <Ionicons name="eye-off-outline" size={20} color="#FF6B6B" />
          <Text style={styles.spoilerHiddenText}>
            This content contains spoilers
          </Text>
          <Text style={styles.spoilerTapText}>Tap to reveal</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() => setRevealed(false)}
        style={styles.spoilerRevealed}
      >
        <Ionicons name="eye-outline" size={16} color="#FF6B6B" />
        <Text style={styles.spoilerRevealedText}>Hide spoiler</Text>
      </TouchableOpacity>
      <Text style={styles.content}>{content}</Text>
    </View>
  );
}

// ================================
// Composant ReviewCard
// ================================
function ReviewCard({ item, isOwner, onDelete, formatDate, avatarFallback }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image
          source={{
            uri: avatarFallback(
              item.author?.account?.username || item.author?.username,
              item.author?.account?.avatar?.secure_url ||
                item.author?.avatar?.secure_url
            ),
          }}
          style={styles.avatar}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.username}>
            {item.author?.account?.username ||
              item.author?.username ||
              "Anonymous"}
          </Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.rating > 0 && (
          <StarRating rating={item.rating} starSize={14} onChange={() => {}} />
        )}
        {isOwner && (
          <TouchableOpacity
            onPress={() => onDelete(item._id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      <SpoilerContent
        content={item.content}
        containsSpoiler={item.containsSpoiler}
      />

      {isOwner && (
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerBadgeText}>Your review</Text>
        </View>
      )}
    </View>
  );
}

// ================================
// Composant ExcerptCard
// ================================
function ExcerptCard({
  item,
  isOwner,
  onDelete,
  onLike,
  currentUserId,
  formatDate,
  avatarFallback,
}) {
  const [likesCount, setLikesCount] = useState(item.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
    item.likes?.some((id) => id.toString() === currentUserId?.toString()) ||
      false
  );
  const [likeLoading, setLikeLoading] = useState(false);

  const handleLikePress = async () => {
    if (likeLoading || !currentUserId) return;

    setLikeLoading(true);
    try {
      const result = await onLike(item._id);
      if (result) {
        setIsLiked(result.isLikedByUser);
        setLikesCount(result.likesCount);
      }
    } catch (error) {
      console.error("Like error:", error);
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image
          source={{
            uri: avatarFallback(
              item.author?.account?.username || item.author?.username,
              item.author?.account?.avatar?.secure_url ||
                item.author?.avatar?.secure_url
            ),
          }}
          style={styles.avatar}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.username}>
            {item.author?.account?.username ||
              item.author?.username ||
              "Anonymous"}
          </Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity
            onPress={() => onDelete(item._id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      <SpoilerContent
        content={item.content}
        containsSpoiler={item.containsSpoiler}
      />

      {isOwner && (
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerBadgeText}>Yours</Text>
        </View>
      )}
    </View>
  );
}

// ================================
// Composant DeepDiveCard (NOUVEAU - correspond au backend)
// ================================
function DeepDiveCard({
  item,
  isOwner,
  onDelete,
  onLike,
  currentUserId,
  formatDate,
  avatarFallback,
}) {
  const [likesCount, setLikesCount] = useState(item.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
    item.likes?.some((id) => id.toString() === currentUserId?.toString()) ||
      false
  );
  const [likeLoading, setLikeLoading] = useState(false);

  const handleLikePress = async () => {
    if (likeLoading || !currentUserId) return;

    setLikeLoading(true);
    try {
      const result = await onLike(item._id);
      if (result) {
        setIsLiked(result.isLikedByUser);
        setLikesCount(result.likesCount);
      }
    } catch (error) {
      console.error("Like error:", error);
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image
          source={{
            uri: avatarFallback(
              item.author?.account?.username || item.author?.username,
              item.author?.account?.avatar?.secure_url ||
                item.author?.avatar?.secure_url
            ),
          }}
          style={styles.avatar}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.username}>
            {item.author?.account?.username ||
              item.author?.username ||
              "Anonymous"}
          </Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity
            onPress={() => onDelete(item._id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Support des spoilers - containsSpoiler default true dans le backend */}
      <SpoilerContent
        content={item.content}
        containsSpoiler={item.containsSpoiler}
      />

      {isOwner && (
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerBadgeText}>Yours</Text>
        </View>
      )}
    </View>
  );
}

export default function BookScreen() {
  const { bookKey: rawBookKey } = useLocalSearchParams();
  const scrollRef = useRef(null);
  const bookKey = normalizeBookKey(decodeURIComponent(rawBookKey || ""));
  const workId = stripBookKey(bookKey);

  // ================================
  // STATES PRINCIPAUX
  // ================================
  const [loading, setLoading] = useState(true);
  const [bookData, setBookData] = useState(null);
  const [rating, setRating] = useState(0);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // ================================
  // STATES POUR LES FORMULAIRES
  // ================================
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [containsSpoiler, setContainsSpoiler] = useState(false);
  // State séparé pour Deep Dive (default true selon le backend)
  const [deepDiveSpoiler, setDeepDiveSpoiler] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);

  // ================================
  // SEE MORE STATES
  // ================================
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllExcerpts, setShowAllExcerpts] = useState(false);
  const [showAllDeepDives, setShowAllDeepDives] = useState(false);

  // ================================
  // COMMENT FORM VISIBILITY STATES
  // ================================
  const [showCommentForm, setShowCommentForm] = useState({
    reviews: false,
    excerpts: false,
    deepDives: false,
  });

  // ================================
  // FETCH CURRENT USER ID
  // ================================
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          setCurrentUserId(user._id || user.id);
          return;
        }

        const response = await api.get("/user/me");
        if (response.data) {
          setCurrentUserId(response.data._id || response.data.id);
        }
      } catch (e) {
        console.warn("Could not fetch current user:", e.message);
      }
    };

    fetchCurrentUser();
  }, []);

  // ================================
  // FETCH DATA
  // ================================
  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      if (!workId) {
        setError("Invalid book key");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const workRes = await axios.get(
          `https://openlibrary.org/works/${workId}.json`
        );

        const backendCalls = await Promise.allSettled([
          api.get(`/reviews/book/${encodeURIComponent(bookKey)}/stats`),
          api.get(`/reviews/book?bookKey=${encodeURIComponent(bookKey)}`),
          api.get(`/excerpt/book/${encodeURIComponent(bookKey)}`),
          api.get(`/deepdive/book/${encodeURIComponent(bookKey)}`),
        ]);

        const [statsRes, reviewsRes, excerptsRes, deepRes] = backendCalls.map(
          (res) => (res.status === "fulfilled" ? res.value : null)
        );

        const authors = [];
        if (workRes.data.authors) {
          for (const a of workRes.data.authors) {
            try {
              const res = await axios.get(
                `https://openlibrary.org${a.author.key}.json`
              );
              authors.push(res.data.name);
            } catch (authorError) {
              console.warn("Failed to fetch author:", authorError.message);
            }
          }
        }

        if (!mounted) return;

        setBookData({
          title: workRes.data.title,
          description:
            workRes.data.description?.value ||
            workRes.data.description ||
            "No description available.",
          authors,
          coverUrl: workRes.data.covers?.length
            ? `https://covers.openlibrary.org/b/id/${workRes.data.covers[0]}-L.jpg`
            : null,
          reviews: reviewsRes?.data?.reviews || [],
          excerpts: excerptsRes?.data?.data || [],
          deepDives: deepRes?.data?.data || [],
        });

        setRating(statsRes?.data?.averageRating || 0);
      } catch (e) {
        console.error("Book fetch error:", e.message);
        if (mounted) {
          setError("Failed to load book data. Please check your connection.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      mounted = false;
    };
  }, [bookKey, workId]);

  // ================================
  // POST REVIEW
  // ================================
  const handleSubmitReview = async () => {
    try {
      setSendingComment(true);

      if (!newRating || newRating === 0) {
        Alert.alert("Error", "Please select a rating");
        return;
      }

      await api.post("/reviews", {
        rating: newRating,
        content: newComment || "",
        containsSpoiler: containsSpoiler,
        book: {
          bookKey,
          title: bookData.title,
          author: bookData.authors?.join(", ") || "Unknown author",
          coverUrl: bookData.coverUrl || null,
        },
      });

      setNewRating(0);
      setNewComment("");
      setContainsSpoiler(false);
      setShowCommentForm((prev) => ({ ...prev, reviews: false }));

      const reviewsRes = await api.get(
        `/reviews/book?bookKey=${encodeURIComponent(bookKey)}`
      );
      setBookData((prev) => ({
        ...prev,
        reviews: reviewsRes.data?.reviews || [],
      }));

      const statsRes = await api.get(
        `/reviews/book/${encodeURIComponent(bookKey)}/stats`
      );
      setRating(statsRes.data?.averageRating || 0);

      Alert.alert("Success", "Your review has been posted!");
    } catch (e) {
      console.error("Review error:", e.message);
      if (e.response?.data?.message) {
        Alert.alert("Error", e.response.data.message);
      } else {
        Alert.alert("Error", "Failed to post review");
      }
    } finally {
      setSendingComment(false);
    }
  };

  // ================================
  // POST EXCERPT
  // ================================
  const handleSubmitExcerpt = async () => {
    if (!newComment.trim()) {
      Alert.alert("Error", "Please write an excerpt");
      return;
    }

    try {
      setSendingComment(true);

      await api.post("/excerpt", {
        book: {
          bookKey,
          title: bookData.title,
          author: bookData.authors?.join(", ") || "Unknown author",
          coverUrl: bookData.coverUrl || null,
        },
        content: newComment,
        containsSpoiler: containsSpoiler,
      });

      setNewComment("");
      setContainsSpoiler(false);
      setShowCommentForm((prev) => ({ ...prev, excerpts: false }));

      const res = await api.get(`/excerpt/book/${encodeURIComponent(bookKey)}`);
      setBookData((prev) => ({ ...prev, excerpts: res.data?.data || [] }));

      Alert.alert("Success", "Your excerpt has been posted!");
    } catch (e) {
      console.error("Excerpt error:", e.message);
      if (e.response?.data?.message) {
        Alert.alert("Error", e.response.data.message);
      } else {
        Alert.alert("Error", "Failed to post excerpt");
      }
    } finally {
      setSendingComment(false);
    }
  };

  // ================================
  // LIKE EXCERPT
  // ================================
  const handleLikeExcerpt = async (excerptId) => {
    try {
      const response = await api.post(`/excerpt/${excerptId}/like`);
      return response.data;
    } catch (e) {
      console.error("Like error:", e.message);
      Alert.alert("Error", "Failed to like excerpt");
      return null;
    }
  };

  // ================================
  // POST DEEP DIVE (CORRIGÉ - correspond au backend)
  // ================================
  const handleSubmitDeepDive = async () => {
    if (!newComment.trim()) {
      Alert.alert("Error", "Please write a comment");
      return;
    }

    try {
      setSendingComment(true);

      // Structure corrigée selon le schéma backend
      await api.post("/deepdive", {
        book: {
          bookKey,
          title: bookData.title,
          author: bookData.authors?.join(", ") || "Unknown author",
          coverUrl: bookData.coverUrl || null,
        },
        content: newComment,
        containsSpoiler: deepDiveSpoiler, // Utilise le state dédié
      });

      setNewComment("");
      setDeepDiveSpoiler(true); // Reset à true (default du backend)
      setShowCommentForm((prev) => ({ ...prev, deepDives: false }));

      // Refresh deep dives
      const res = await api.get(
        `/deepdive/book/${encodeURIComponent(bookKey)}`
      );
      setBookData((prev) => ({ ...prev, deepDives: res.data?.data || [] }));

      Alert.alert("Success", "Your deep dive has been posted!");
    } catch (e) {
      console.error("Deep dive error:", e.message);
      if (e.response?.data?.message) {
        Alert.alert("Error", e.response.data.message);
      } else {
        Alert.alert("Error", "Failed to post deep dive");
      }
    } finally {
      setSendingComment(false);
    }
  };

  // ================================
  // LIKE DEEP DIVE (NOUVEAU - correspond au backend)
  // ================================
  const handleLikeDeepDive = async (deepDiveId) => {
    try {
      const response = await api.post(`/deepdive/${deepDiveId}/like`);
      return response.data;
    } catch (e) {
      console.error("Like error:", e.message);
      Alert.alert("Error", "Failed to like deep dive");
      return null;
    }
  };

  // ================================
  // DELETE FUNCTIONS
  // ================================
  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete your review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/reviews/${reviewId}`);

              setBookData((prev) => ({
                ...prev,
                reviews: prev.reviews.filter((r) => r._id !== reviewId),
              }));

              const statsRes = await api.get(
                `/reviews/book/${encodeURIComponent(bookKey)}/stats`
              );
              setRating(statsRes.data?.averageRating || 0);

              Alert.alert("Success", "Your review has been deleted");
            } catch (e) {
              console.error("Delete error:", e.message);
              Alert.alert("Error", "Failed to delete review");
            }
          },
        },
      ]
    );
  };

  const handleDeleteExcerpt = async (excerptId) => {
    Alert.alert(
      "Delete Excerpt",
      "Are you sure you want to delete your excerpt?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/excerpt/${excerptId}`);
              setBookData((prev) => ({
                ...prev,
                excerpts: prev.excerpts.filter((e) => e._id !== excerptId),
              }));
              Alert.alert("Success", "Your excerpt has been deleted");
            } catch (e) {
              console.error("Delete error:", e.message);
              Alert.alert("Error", "Failed to delete excerpt");
            }
          },
        },
      ]
    );
  };

  const handleDeleteDeepDive = async (deepDiveId) => {
    Alert.alert(
      "Delete Deep Dive",
      "Are you sure you want to delete your deep dive?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/deepdive/${deepDiveId}`);
              setBookData((prev) => ({
                ...prev,
                deepDives: prev.deepDives.filter((d) => d._id !== deepDiveId),
              }));
              Alert.alert("Success", "Your deep dive has been deleted");
            } catch (e) {
              console.error("Delete error:", e.message);
              Alert.alert("Error", "Failed to delete deep dive");
            }
          },
        },
      ]
    );
  };

  // ================================
  // HELPER: Vérifier si propriétaire
  // ================================
  const isOwner = (item) => {
    if (!currentUserId) return false;
    const authorId = item.author?._id || item.author?.id || item.author;
    return authorId === currentUserId;
  };

  // ================================
  // SEE MORE / TOGGLE FORM
  // ================================
  const handleSeeMore = (setter, value) => {
    setter(!value);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const handleToggleCommentForm = (section) => {
    setShowCommentForm((prev) => ({ ...prev, [section]: !prev[section] }));
    setNewComment("");
    if (section === "reviews") {
      setNewRating(0);
      setContainsSpoiler(false);
    }
    if (section === "excerpts") {
      setContainsSpoiler(false);
    }
    if (section === "deepDives") {
      setDeepDiveSpoiler(true); // Reset à true (default du backend)
    }
  };

  // ================================
  // RENDER LOADING / ERROR
  // ================================
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!bookData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No book data available</Text>
      </View>
    );
  }

  // ================================
  // DATA TO SHOW
  // ================================
  const reviewsToShow = showAllReviews
    ? bookData.reviews
    : bookData.reviews.slice(0, 2);
  const excerptsToShow = showAllExcerpts
    ? bookData.excerpts
    : bookData.excerpts.slice(0, 2);
  const deepDivesToShow = showAllDeepDives
    ? bookData.deepDives
    : bookData.deepDives.slice(0, 2);

  // ================================
  // RENDER PRINCIPAL
  // ================================
  return (
    <ScrollView ref={scrollRef} style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
        <Ionicons name="chevron-back-outline" size={24} color="#000" />
      </TouchableOpacity>

      <View style={styles.livresque}>
        <SimpleLineIcons name="book-open" size={30} color="white" />
      </View>

      {/* Book Cover */}
      {bookData.coverUrl && (
        <Image
          source={{ uri: bookData.coverUrl }}
          style={styles.book_picture}
        />
      )}

      {/* Title & Author */}
      <Text style={styles.title}>{bookData.title}</Text>
      <Text style={styles.author}>
        by{" "}
        {bookData.authors.length > 0 ? bookData.authors.join(", ") : "Unknown"}
      </Text>

      {/* Average Rating */}
      <View style={styles.rate}>
        <StarRating rating={rating} starSize={20} onChange={() => {}} />
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>{bookData.description}</Text>

      {/* ================= REVIEWS SECTION ================= */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <View style={styles.plus3Points}>
            <TouchableOpacity
              onPress={() => handleToggleCommentForm("reviews")}
            >
              <FontAwesome6 name="add" size={18} color="#000" />
            </TouchableOpacity>
            {bookData.reviews.length > 2 && (
              <TouchableOpacity
                onPress={() => handleSeeMore(setShowAllReviews, showAllReviews)}
              >
                <FontAwesome6
                  name={showAllReviews ? "minus" : "ellipsis"}
                  size={18}
                  color="#000"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Review Form */}
        {showCommentForm.reviews && (
          <View style={styles.reviewForm}>
            <Text style={styles.formLabel}>Your Rating</Text>
            <StarRating
              rating={newRating}
              starSize={28}
              onChange={setNewRating}
              style={styles.starRating}
            />

            <Text style={styles.formLabel}>Your Review (optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your thoughts about this book..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />

            <View style={styles.spoilerContainer}>
              <Text style={styles.spoilerLabel}>Contains spoilers?</Text>
              <Switch
                value={containsSpoiler}
                onValueChange={setContainsSpoiler}
                trackColor={{ false: "#ddd", true: "#FF6B6B" }}
                thumbColor={containsSpoiler ? "#fff" : "#f4f3f4"}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmitReview}
              style={[
                styles.commentButton,
                sendingComment && styles.buttonDisabled,
              ]}
              disabled={sendingComment}
            >
              <Text style={styles.commentButtonText}>
                {sendingComment ? "Posting..." : "Post Review"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reviews List */}
        {reviewsToShow.length === 0 ? (
          <Text style={styles.emptyText}>No reviews yet. Be the first!</Text>
        ) : (
          reviewsToShow.map((item) => (
            <ReviewCard
              key={item._id}
              item={item}
              isOwner={isOwner(item)}
              onDelete={handleDeleteReview}
              formatDate={formatDate}
              avatarFallback={avatarFallback}
            />
          ))
        )}
      </View>

      {/* ================= EXCERPTS SECTION ================= */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Excerpts</Text>
          <View style={styles.plus3Points}>
            <TouchableOpacity
              onPress={() => handleToggleCommentForm("excerpts")}
            >
              <FontAwesome6 name="add" size={18} color="#000" />
            </TouchableOpacity>
            {bookData.excerpts.length > 2 && (
              <TouchableOpacity
                onPress={() =>
                  handleSeeMore(setShowAllExcerpts, showAllExcerpts)
                }
              >
                <FontAwesome6
                  name={showAllExcerpts ? "minus" : "ellipsis"}
                  size={18}
                  color="#000"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Excerpt Form */}
        {showCommentForm.excerpts && (
          <View style={styles.commentForm}>
            <TextInput
              style={styles.commentInput}
              placeholder="Share a favorite excerpt from this book..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <View style={styles.spoilerContainer}>
              <Text style={styles.spoilerLabel}>Contains spoilers?</Text>
              <Switch
                value={containsSpoiler}
                onValueChange={setContainsSpoiler}
                trackColor={{ false: "#ddd", true: "#FF6B6B" }}
                thumbColor={containsSpoiler ? "#fff" : "#f4f3f4"}
              />
            </View>
            <TouchableOpacity
              onPress={handleSubmitExcerpt}
              style={[
                styles.commentButton,
                sendingComment && styles.buttonDisabled,
              ]}
              disabled={sendingComment}
            >
              <Text style={styles.commentButtonText}>
                {sendingComment ? "Posting..." : "Post Excerpt"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Excerpts List */}
        {excerptsToShow.length === 0 ? (
          <Text style={styles.emptyText}>
            No excerpts yet. Share your favorite passage!
          </Text>
        ) : (
          excerptsToShow.map((item) => (
            <ExcerptCard
              key={item._id}
              item={item}
              isOwner={isOwner(item)}
              onDelete={handleDeleteExcerpt}
              onLike={handleLikeExcerpt}
              currentUserId={currentUserId}
              formatDate={formatDate}
              avatarFallback={avatarFallback}
            />
          ))
        )}
      </View>

      {/* ================= DEEP DIVES SECTION (CORRIGÉ) ================= */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Let's guess what happens next</Text>
          <View style={styles.plus3Points}>
            <TouchableOpacity
              onPress={() => handleToggleCommentForm("deepDives")}
            >
              <FontAwesome6 name="add" size={18} color="#000" />
            </TouchableOpacity>
            {bookData.deepDives.length > 2 && (
              <TouchableOpacity
                onPress={() =>
                  handleSeeMore(setShowAllDeepDives, showAllDeepDives)
                }
              >
                <FontAwesome6
                  name={showAllDeepDives ? "minus" : "ellipsis"}
                  size={18}
                  color="#000"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Deep Dive Form (CORRIGÉ - avec spoiler toggle) */}
        {showCommentForm.deepDives && (
          <View style={styles.commentForm}>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your predictions or thoughts..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            {/* Spoiler toggle ajouté - default true selon le backend */}
            <View style={styles.spoilerContainer}>
              <Text style={styles.spoilerLabel}>Contains spoilers?</Text>
              <Switch
                value={deepDiveSpoiler}
                onValueChange={setDeepDiveSpoiler}
                trackColor={{ false: "#ddd", true: "#FF6B6B" }}
                thumbColor={deepDiveSpoiler ? "#fff" : "#f4f3f4"}
              />
            </View>
            <TouchableOpacity
              onPress={handleSubmitDeepDive}
              style={[
                styles.commentButton,
                sendingComment && styles.buttonDisabled,
              ]}
              disabled={sendingComment}
            >
              <Text style={styles.commentButtonText}>
                {sendingComment ? "Posting..." : "Post"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Deep Dives List (CORRIGÉ - utilise DeepDiveCard) */}
        {deepDivesToShow.length === 0 ? (
          <Text style={styles.emptyText}>
            Nothing here yet. Be the first to add!
          </Text>
        ) : (
          deepDivesToShow.map((item) => (
            <DeepDiveCard
              key={item._id}
              item={item}
              isOwner={isOwner(item)}
              onDelete={handleDeleteDeepDive}
              onLike={handleLikeDeepDive}
              currentUserId={currentUserId}
              formatDate={formatDate}
              avatarFallback={avatarFallback}
            />
          ))
        )}
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ================================
// STYLES
// ================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  goBack: {
    marginBottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  livresque: {
    alignSelf: "center",
    marginBottom: 20,
    backgroundColor: "#FF6B6B",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  book_picture: {
    width: 220,
    height: 320,
    alignSelf: "center",
    borderRadius: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#000",
    letterSpacing: -0.5,
    paddingHorizontal: 20,
  },
  author: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 16,
    marginTop: 8,
    color: "#999",
    fontWeight: "600",
  },
  rate: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  description: {
    textAlign: "left",
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
    color: "#666",
  },
  section: {
    marginBottom: 20,
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  plus3Points: {
    flexDirection: "row",
    gap: 16,
  },
  reviewForm: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  commentForm: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 8,
  },
  starRating: {
    alignSelf: "center",
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    marginBottom: 12,
    backgroundColor: "#fff",
    textAlignVertical: "top",
    fontSize: 14,
  },
  spoilerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  spoilerLabel: {
    fontSize: 14,
    color: "#666",
  },
  commentButton: {
    backgroundColor: "#FF6B6B",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  commentButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    paddingVertical: 20,
  },
  card: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#000",
  },
  date: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  content: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  spoilerBadge: {
    backgroundColor: "#FFE4E4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  spoilerBadgeText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "600",
  },
  spoilerHidden: {
    backgroundColor: "#FFE4E4",
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FFD0D0",
    borderStyle: "dashed",
  },
  spoilerHiddenContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  spoilerHiddenText: {
    fontSize: 14,
    color: "#FF6B6B",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  spoilerTapText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  spoilerRevealed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  spoilerRevealedText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  ownerBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  ownerBadgeText: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "600",
  },
  likeSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  likeCount: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  likeCountActive: {
    color: "#FF6B6B",
  },
  bottomSpacer: {
    height: 40,
  },
});
