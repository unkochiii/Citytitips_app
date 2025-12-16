import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import axios from "axios";
import api from "../../../services/api";
import StarRating from "react-native-star-rating-widget";
import Ionicons from "@expo/vector-icons/Ionicons";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";

// ================================
// utils (inline for simplicity)
// ================================
const normalizeBookKey = (key) => {
    if (!key) return null;
    return key.startsWith("/works/") ? key : `/works/${key}`;
};

const stripBookKey = (key) => key?.replace("/works/", "");

export default function BookScreen() {
    const { bookKey: rawBookKey } = useLocalSearchParams();
    const scrollRef = useRef(null);

    const bookKey = normalizeBookKey(decodeURIComponent(rawBookKey));
    const workId = stripBookKey(bookKey);

    const [loading, setLoading] = useState(true);
    const [bookData, setBookData] = useState(null);
    const [rating, setRating] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [sendingRating, setSendingRating] = useState(false);
    const [error, setError] = useState(null);

    // ================================
    // FETCH DATA (✅ await inside useEffect)
    // ================================
    useEffect(() => {
        let mounted = true;

        const fetchAll = async () => {
            try {
                setLoading(true);

                // OpenLibrary (public)
                const workRes = await axios.get(
                    `https://openlibrary.org/works/${workId}.json`
                );

                // Backend (token auto via api)
                const [statsRes, reviewsRes, excerptsRes, deepRes] = await Promise.all([
                    api.get(`/reviews/book/${encodeURIComponent(bookKey)}/stats`),
                    api.get(`/reviews/book?bookKey=${encodeURIComponent(bookKey)}`),
                    api.get(`/excerpt/book/${encodeURIComponent(bookKey)}`),
                    api.get(`/deepdive/book/${encodeURIComponent(bookKey)}`),
                ]);

                // Authors
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
                    reviews: reviewsRes.data.reviews || [],
                    excerpts: excerptsRes.data.data || [],
                    deepDives: deepRes.data.data || [],
                });

                setRating(statsRes.data.averageRating || 0);
            } catch (e) {
                console.error("Book fetch error:", e.message);
                if (mounted) {
                    setError(e.response?.status === 503
                        ? "Server is temporarily unavailable. Please try again later."
                        : "Failed to load book data. Please check your connection.");
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
    // POST RATING (protected)
    // ================================
    const handleSubmitRating = async () => {
        try {
            setSendingRating(true);

            await api.post("/reviews", {
                rating: userRating,
                content: "",
                book: {
                    bookKey, // ✅ FULL KEY
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

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
                    <Ionicons name="chevron-back-outline" size={24} />
                </TouchableOpacity>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => { setError(null); setLoading(true); }} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!bookData) {
        return (
            <View style={styles.container}>
                <Text>No data available</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
                    <Ionicons name="chevron-back-outline" size={24} />
                </TouchableOpacity>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => { setError(null); setLoading(true); }} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!bookData) {
        return (
            <View style={styles.container}>
                <Text>No data available</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
                    <Ionicons name="chevron-back-outline" size={24} />
                </TouchableOpacity>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => { setError(null); setLoading(true); }} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!bookData) {
        return (
            <View style={styles.container}>
                <Text>No data available</Text>
            </View>
        );
    }

    return (
        <ScrollView ref={scrollRef}>
            <View style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.goBack}>
                    <Ionicons name="chevron-back-outline" size={24} />
                </TouchableOpacity>

                <View style={styles.livresque}>
                    <SimpleLineIcons name="book-open" size={30} />
                </View>

                {bookData.coverUrl && (
                    <Image source={{ uri: bookData.coverUrl }} style={styles.book_picture} />
                )}

                <Text style={styles.title}>{bookData.title}</Text>
                <Text style={styles.author}>
                    by {bookData.authors.join(", ")}
                </Text>

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
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 12, backgroundColor: "#FAFAF0" },
    goBack: { marginBottom: 10, width: 40 },
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
    title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
    author: { textAlign: "center", fontSize: 12, marginBottom: 10 },
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
    description: {
        textAlign: "center",
        fontSize: 13,
        marginBottom: 20,
        lineHeight: 18,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        textAlign: "center",
        color: "#C0392B",
        fontSize: 14,
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: "#000",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    retryButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14,
    },
});
