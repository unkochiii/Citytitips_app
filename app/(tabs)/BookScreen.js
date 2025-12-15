import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import axios from "axios";
import { useEffect, useState, useRef } from "react";
import StarRating from "react-native-star-rating-widget";
import Ionicons from "@expo/vector-icons/Ionicons";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import { Link } from "expo-router";

import OrderSubjects from "../../components/OrderSubjects";
import Reviews from "../../components/BookScreen/Reviews";
import Excerpts from "../../components/BookScreen/Excerpts";
import DeepDives from "../../components/BookScreen/DeepDives";

export default function BookScreen() {
  const bookKey = "OL29226517W"; // à changer
  const scrollRef = useRef(null);
  const userToken = "token"; // à changer

  const [loading, setLoading] = useState(true);
  const [bookData, setBookData] = useState(null);

  const [rating, setRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [sendingRating, setSendingRating] = useState(false);

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllExcerpts, setShowAllExcerpts] = useState(false);
  const [showAllDeepDives, setShowAllDeepDives] = useState(false);

  const [showCommentForm, setShowCommentForm] = useState({
    reviews: false,
    excerpts: false,
    deepDives: false,
  });

  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  /* ================= HELPERS ================= */

  const avatarFallback = (
    name,
    url // avatar par défault
  ) =>
    url ||
    `https://ui-avatars.com/api/?name=${name}&background=4A281B&color=fff`;

  const handleSeeMore = (setter, value) => {
    //lorsqu'on clique sur "..." pour voir le reste des posts d'une catégorie spécifique
    setter(!value);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const formatDate = (date) => {
  if (!date) return ""; // date manquante
  const d = new Date(date);
  if (isNaN(d.getTime())) return ""; // date invalide
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};


  const handleToggleCommentForm = (section) => {
    // fonction pour afficher le form pour écrire un post
    setShowCommentForm((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  /* ================= API ================= */

  const handleSubmitRating = async () => {
    //Envoyer une note seule
    try {
      setSendingRating(true);

      await axios.post(
        "https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/reviews",
        {
          rating: userRating,
          content: "",
          book: {
            bookKey,
            title: bookData.title,
            author: bookData.authors.join(", "),
            coverUrl: bookData.coverUrl,
          },
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      setUserRating(0);

      const statsRes = await axios.get(
        `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/reviews/book/${bookKey}/stats`
      );
      setRating(statsRes.data.averageRating);
    } finally {
      setSendingRating(false);
    }
  };

  const handleSubmitComment = async (section) => {
    // Envoyer un avis complet
    if (!newComment.trim()) return;

    try {
      setSendingComment(true);

      await axios.post(
        "https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/reviews",
        {
          content: newComment,
          book: {
            bookKey,
            title: bookData.title,
            author: bookData.authors.join(", "),
            coverUrl: bookData.coverUrl,
          },
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const res = await axios.get(
        `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/reviews/book?bookKey=${bookKey}`
      );

      setBookData((prev) => ({ ...prev, reviews: res.data.reviews }));
      setNewComment("");
      setShowCommentForm((prev) => ({ ...prev, [section]: false }));
    } finally {
      setSendingComment(false);
    }
  };

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchAll = async () => {
      // aller chercher les différents posts existants
      const workRes = await axios.get(
        `https://openlibrary.org/works/${bookKey}.json`
      );

      const statsRes = await axios.get(
        `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/reviews/book/${bookKey}/stats`
      );

      const reviewsRes = await axios.get(
        `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/reviews/book?bookKey=${bookKey}`
      );

      const excerptsRes = await axios.get(
        `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/excerpt/book/${bookKey}`
      );

      const deepRes = await axios.get(
        `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/deepdive/book/${bookKey}`
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
        themes: OrderSubjects(workRes.data.subjects || []),
        reviews: reviewsRes.data.reviews,
        excerpts: excerptsRes.data.data,
        deepDives: deepRes.data.data,
      });

      setRating(statsRes.data.averageRating);
      setLoading(false);
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

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
    <ScrollView ref={scrollRef}>
      <View style={styles.container}>
        <Link href="/" style={styles.goBack}>
          <Ionicons name="chevron-back-outline" size={24} />
        </Link>

        <View style={styles.livresque}>
          <SimpleLineIcons name="book-open" size={30} />
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

        {/* USER RATING */}
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

        {/* THEMES */}
        <View style={styles.themes}>
          {bookData.themes.map((t, i) => (
            <Text
              key={i}
              style={[styles.themeBadge, { backgroundColor: t.color }]}
            >
              {t.name}
            </Text>
          ))}
        </View>

        <Text style={styles.description}>{bookData.description}</Text>

        {/* SECTIONS */}
        <Reviews
          section="reviews"
          items={bookData.reviews}
          itemsToShow={reviewsToShow}
          showAll={showAllReviews}
          setShowAll={setShowAllReviews}
          showCommentForm={showCommentForm}
          handleToggleCommentForm={handleToggleCommentForm}
          handleSubmitComment={handleSubmitComment}
          newComment={newComment}
          setNewComment={setNewComment}
          sendingComment={sendingComment}
          avatarFallback={avatarFallback}
          handleSeeMore={handleSeeMore}
          formatDate={formatDate}
        />

        <Excerpts
          excerptsToShow={excerptsToShow}
          showAllExcerpts={showAllExcerpts}
          setShowAllExcerpts={setShowAllExcerpts}
          avatarFallback={avatarFallback}
          handleSeeMore={handleSeeMore}
          showCommentForm={showCommentForm}
          handleToggleCommentForm={handleToggleCommentForm}
          handleSubmitComment={handleSubmitComment}
          newComment={newComment}
          setNewComment={setNewComment}
          sendingComment={sendingComment}
          formatDate={formatDate}
        />

        <DeepDives
          deepDivesToShow={deepDivesToShow}
          showAllDeepDives={showAllDeepDives}
          setShowAllDeepDives={setShowAllDeepDives}
          avatarFallback={avatarFallback}
          handleSeeMore={handleSeeMore}
          showCommentForm={showCommentForm}
          handleToggleCommentForm={handleToggleCommentForm}
          handleSubmitComment={handleSubmitComment}
          newComment={newComment}
          setNewComment={setNewComment}
          sendingComment={sendingComment}
          formatDate={formatDate}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: "#FAFAF0",
  },

  goBack: {
    marginBottom: 10,
  },

  livresque: {
    alignSelf: "center",
    marginBottom: 10,
    backgroundColor: "white",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  book_picture: {
    width: 200,
    height: 300,
    alignSelf: "center",
    borderRadius: 10,
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },

  author: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 10,
  },

  rate: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  sectionRatingUser: {
    marginBottom: 20,
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingTop: 10,
    alignItems: "center",
  },

  TitleRating: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },

  validateButton: {
    alignSelf: "center",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    marginTop: 7,
    width: 80,
    height: 28,
  },

  validateButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },

  themes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginVertical: 8,
  },

  themeBadge: {
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 11,
  },

  description: {
    textAlign: "center",
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
});
