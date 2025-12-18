import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import axios from "axios";
import api from "../../../services/api";
import StarRating from "react-native-star-rating-widget";
import Ionicons from "@expo/vector-icons/Ionicons";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

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
  url || `https://ui-avatars.com/api/?name=${name}&background=4A281B&color=fff`; // avatar par défaut

export default function BookScreen() {
  const { bookKey: rawBookKey } = useLocalSearchParams(); //récupère l'URL du navigateur
  const scrollRef = useRef(null);
  const bookKey = normalizeBookKey(decodeURIComponent(rawBookKey));
  const workId = stripBookKey(bookKey); //identifiant pour l'API

  const [loading, setLoading] = useState(true);
  const [bookData, setBookData] = useState(null);
  const [rating, setRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [sendingRating, setSendingRating] = useState(false);
  const [error, setError] = useState(null);

  // ================================
  // SEE MORE STATES
  // ================================
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllExcerpts, setShowAllExcerpts] = useState(false);
  const [showAllDeepDives, setShowAllDeepDives] = useState(false);

  // ================================
  // COMMENT STATES
  // ================================
  const [showCommentForm, setShowCommentForm] = useState({
    reviews: false,
    excerpts: false,
    deepDives: false,
  });
  const [newComment, setNewComment] = useState(""); //texte du commentaire en cours de saisie
  const [sendingComment, setSendingComment] = useState(false); 

  // ================================
  // FETCH DATA
  // ================================
  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
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
            const res = await axios.get(
              `https://openlibrary.org${a.author.key}.json`
            );
            authors.push(res.data.name);
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
  // POST RATING
  // ================================
  const handleSubmitRating = async () => {
    try {
      setSendingRating(true);
      await api.post("/reviews", {
        rating: userRating,
        content: "",
        book: {
          bookKey,
          title: bookData.title,
          author: bookData.authors.join(", "),
          coverUrl: bookData.coverUrl,
        },
      });
      setUserRating(0);

      const statsRes = await api.get(
        `/reviews/book/${encodeURIComponent(bookKey)}/stats`
      );
      setRating(statsRes.data.averageRating || 0);
    } catch (e) {
      console.error("Rating error:", e.message);
    } finally {
      setSendingRating(false);
    }
  };

  // ================================
  // POST COMMENT
  // ================================
  const handleSubmitComment = async (section) => {
    if (!newComment.trim()) return;
    try {
      setSendingComment(true);
      await api.post("/reviews", {
        rating: 0,
        content: newComment,
        book: {
          bookKey,
          title: bookData.title,
          author: bookData.authors.join(", "),
          coverUrl: bookData.coverUrl,
        },
      });
      setNewComment("");
      setShowCommentForm((prev) => ({ ...prev, [section]: false }));

      const res = await api.get(
        `/reviews/book?bookKey=${encodeURIComponent(bookKey)}`
      );
      setBookData((prev) => ({ ...prev, reviews: res.data.reviews }));
    } catch (e) {
      console.error("Comment error:", e.message);
    } finally {
      setSendingComment(false);
    }
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
  };

  // ================================
  // RENDER
  // ================================
  if (loading)
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.container}>
        <Text>{error}</Text>
      </View>
    );

  const reviewsToShow = showAllReviews
    ? bookData.reviews
    : bookData.reviews.slice(0, 2);
  const excerptsToShow = showAllExcerpts
    ? bookData.excerpts
    : bookData.excerpts.slice(0, 2);
  const deepDivesToShow = showAllDeepDives
    ? bookData.deepDives
    : bookData.deepDives.slice(0, 2);

  return (
    <ScrollView ref={scrollRef} style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
        <Ionicons name="chevron-back-outline" size={24} />
      </TouchableOpacity>

      <View style={styles.livresque}>
        <SimpleLineIcons name="book-open" size={30} color="white" />
      </View>

      {bookData.coverUrl && (
        <Image
          source={{ uri: bookData.coverUrl }}
          style={styles.book_picture}
        />
      )}

      <Text style={styles.title}>{bookData.title}</Text>
      <Text style={styles.author}>by {bookData.authors.join(", ")}</Text>

      <View style={styles.rate}>
        <StarRating rating={rating} starSize={20} onChange={() => {}} />
        <Text>{rating}</Text>
      </View>

      <View style={styles.sectionRatingUser}>
        <Text style={styles.TitleRating}>Rate this book</Text>
        <StarRating
          rating={userRating}
          onChange={setUserRating}
          starSize={15}
        />
        <TouchableOpacity
          onPress={handleSubmitRating}
          disabled={userRating === 0 || sendingRating}
          style={styles.validateButton}
        >
          <Text style={styles.validateButtonText}>Validate</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>{bookData.description}</Text>

      {/* ================= REVIEWS ================= */}
      <Section
        title="Reviews"
        items={reviewsToShow}
        showAll={showAllReviews}
        onSeeMore={() => handleSeeMore(setShowAllReviews, showAllReviews)}
        showCommentForm={showCommentForm.reviews}
        onToggleCommentForm={() => handleToggleCommentForm("reviews")}
        newComment={newComment}
        setNewComment={setNewComment}
        onSubmitComment={() => handleSubmitComment("reviews")}
      />

      {/* ================= EXCERPTS ================= */}
      <Section
        title="Excerpts"
        items={excerptsToShow}
        showAll={showAllExcerpts}
        onSeeMore={() => handleSeeMore(setShowAllExcerpts, showAllExcerpts)}
        showCommentForm={showCommentForm.excerpts}
        onToggleCommentForm={() => handleToggleCommentForm("excerpts")}
        newComment={newComment}
        setNewComment={setNewComment}
        onSubmitComment={() => handleSubmitComment("excerpts")}
      />

      {/* ================= DEEP DIVES ================= */}
      <Section
        title="Let’s guess what happens next"
        items={deepDivesToShow}
        showAll={showAllDeepDives}
        onSeeMore={() => handleSeeMore(setShowAllDeepDives, showAllDeepDives)}
        showCommentForm={showCommentForm.deepDives}
        onToggleCommentForm={() => handleToggleCommentForm("deepDives")}
        newComment={newComment}
        setNewComment={setNewComment}
        onSubmitComment={() => handleSubmitComment("deepDives")}
      />
    </ScrollView>
  );
}

// ================================
// Section component
// ================================
function Section({
  title,
  items,
  showAll,
  onSeeMore,
  showCommentForm,
  onToggleCommentForm,
  newComment,
  setNewComment,
  onSubmitComment,
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.plus3Points}>
          <TouchableOpacity onPress={onToggleCommentForm}>
            <FontAwesome6 name="add" size={18} />
          </TouchableOpacity>
          {items.length > 2 && (
            <TouchableOpacity onPress={onSeeMore}>
              <FontAwesome6 name={showAll ? "minus" : "ellipsis"} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showCommentForm && (
        <View style={styles.commentForm}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write your comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            onPress={onSubmitComment}
            style={styles.commentButton}
          >
            <Text style={styles.commentButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      )}

      {items.map((item) => (
        <View key={item._id} style={styles.card}>
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
            <View style={{ flex: 1 }}>
              <Text style={styles.username}>
                {item.author?.account?.username || item.author?.username}
              </Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.rating !== undefined && (
              <StarRating
                rating={item.rating}
                starSize={14}
                onChange={() => {}}
              />
            )}
          </View>
          <Text style={styles.content}>{item.content}</Text>
        </View>
      ))}
    </View>
  );
}

// ================================
// STYLES
// ================================
const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#FFFFFF" },
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
  sectionRatingUser: {
    marginBottom: 24,
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  TitleRating: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
    color: "#000",
  },
  validateButton: {
    alignSelf: "center",
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    marginTop: 12,
    paddingHorizontal: 32,
    height: 50,
  },
  validateButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
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
    borderColor: "#ddd",
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  plus3Points: { flexDirection: "row", gap: 10 },
  card: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  username: { fontWeight: "bold", fontSize: 14 },
  date: { fontSize: 11, color: "#777" },
  content: { fontSize: 14, color: "#333" },
  commentForm: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 8,
    minHeight: 50,
    marginBottom: 6,
  },
  commentButton: {
    backgroundColor: "#FF6B6B",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  commentButtonText: { color: "#fff", fontWeight: "bold" },
});
