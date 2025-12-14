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
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import { Link } from "expo-router";
import OrderSubjects from "../../components/OrderSubjects";

export default function BookScreen() {
  const bookKey = "OL29226517W"; //à changer, utiliser ici comme exemple
  const scrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [bookData, setBookData] = useState(null);
  const [rating, setRating] = useState(0);

  // États pour "See more"
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllExcerpts, setShowAllExcerpts] = useState(false);
  const [showAllDeepDives, setShowAllDeepDives] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // BOOK
        const workRes = await axios.get(
          `https://openlibrary.org/works/${bookKey}.json`
        );

        // STATS
        const statsRes = await axios.get(
          `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/reviews/book/${bookKey}/stats`
        );
        setRating(statsRes.data.averageRating);

        // REVIEWS
        const reviewsRes = await axios.get(
          `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/reviews/book?bookKey=${bookKey}`
        );

        // EXCERPTS
        const excerptsRes = await axios.get(
          `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/excerpt/book/${bookKey}`
        );

        // DEEP DIVES
        const deepRes = await axios.get(
          `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/deepdive/book/${bookKey}`
        );

        // AUTHORS
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

        setLoading(false);
      } catch (err) {
        console.log(err);
      }
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

  // ---------- HELPERS ----------
  const formatDate = (date) => // a changer aussi, car n'indique pas la bonne date
    new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const avatarFallback = (name, url) =>
    url ||
    `https://ui-avatars.com/api/?name=${name}&background=4A281B&color=fff`;

  // ---------- LOGIQUE SEE MORE ----------
  const reviewsToShow = showAllReviews
    ? bookData.reviews
    : bookData.reviews.slice(0, 2);

  const excerptsToShow = showAllExcerpts
    ? bookData.excerpts
    : bookData.excerpts.slice(0, 2);

  const deepDivesToShow = showAllDeepDives
    ? bookData.deepDives
    : bookData.deepDives.slice(0, 2);

  const handleSeeMore = (setter, value) => {
    setter(!value);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  return (
    <ScrollView ref={scrollRef}>
      <View style={styles.container}>
        {/* BACK */}
        <Link href="/" style={styles.goBack}>
          <Ionicons name="chevron-back-outline" size={24} />
        </Link>

        {/* ICON */}
        <View style={styles.livresque}>
          <SimpleLineIcons name="book-open" size={30} />
        </View>

        {/* COVER */}
        {bookData.coverUrl && (
          <Image source={{ uri: bookData.coverUrl }} style={styles.book_picture} />
        )}

        <Text style={styles.title}>{bookData.title}</Text>
        <Text style={styles.author}>by {bookData.authors.join(", ")}</Text>

        {/* RATING */}
        <View style={styles.rate}>
          <StarRating rating={rating} starSize={20} onChange={() => {}} />
          <Text>{rating}</Text>
        </View>

        {/* THEMES */}
        <View style={styles.themes}>
          {bookData.themes.map((t, i) => (
            <Text key={i} style={[styles.themeBadge, { backgroundColor: t.color }]}>
              {t.name}
            </Text>
          ))}
        </View>

        <Text style={styles.description}>{bookData.description}</Text>

        {/* ================= REVIEWS ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {bookData.reviews.length > 2 && (
              <TouchableOpacity onPress={() => handleSeeMore(setShowAllReviews, showAllReviews)}>
                <FontAwesome6 name={showAllReviews ? "minus" : "ellipsis"} size={18} />
              </TouchableOpacity>
            )}
          </View>

          {/* extraire un composant ReviewCard */}
          {reviewsToShow.map((r) => (
            <View key={r._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Image
                  source={{
                    uri: avatarFallback(
                      r.author.account.username,
                      r.author.account.avatar?.secure_url
                    ),
                  }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.username}>{r.author.account.username}</Text>
                  <Text style={styles.date}>{formatDate(r.createdAt)}</Text>
                </View>
                <StarRating rating={r.rating} starSize={14} onChange={() => {}} />
              </View>
              <Text style={styles.content}>{r.content}</Text>
            </View>
          ))}
        </View>

        {/* ================= EXCERPTS ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Excerpts</Text>
            {bookData.excerpts.length > 2 && (
              <TouchableOpacity onPress={() => handleSeeMore(setShowAllExcerpts, showAllExcerpts)}>
                <FontAwesome6 name={showAllExcerpts ? "minus" : "ellipsis"} size={18} />
              </TouchableOpacity>
            )}
          </View>

          {/* extraire un composant ExcerptCard */}
          {excerptsToShow.map((e) => (
            <View key={e._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Image
                  source={{
                    uri: avatarFallback(
                      e.author.account.username,
                      e.author.account.avatar?.secure_url
                    ),
                  }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.username}>{e.author.account.username}</Text>
                  <Text style={styles.date}>{formatDate(e.createdAt)}</Text>
                </View>
              </View>
              <Text style={styles.content}>{e.content}</Text>
            </View>
          ))}
        </View>

        {/* ================= DEEP DIVES ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Let’s guess what happens next</Text>
            {bookData.deepDives.length > 2 && (
              <TouchableOpacity onPress={() => handleSeeMore(setShowAllDeepDives, showAllDeepDives)}>
                <FontAwesome6 name={showAllDeepDives ? "minus" : "ellipsis"} size={18} />
              </TouchableOpacity>
            )}
          </View>

          {/* extraire un composant DeepDiveCard */}
          {deepDivesToShow.map((d) => (
            <View key={d._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Image
                  source={{
                    uri: avatarFallback(d.author.username, d.author.avatar?.secure_url),
                  }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.username}>{d.author.username}</Text>
                  <Text style={styles.date}>{formatDate(d.createdAt)}</Text>
                </View>
              </View>
              <Text style={styles.content}>{d.content}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: "#FAFAF0",
  },
  goBack: { marginBottom: 10 },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontWeight: "bold",
    fontSize: 14,
  },
  date: {
    fontSize: 11,
    color: "#777",
  },
  content: {
    fontSize: 13,
    color: "#333",
  },
});
