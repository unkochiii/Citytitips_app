// app/(tabs)/index.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const SWIPE_THRESHOLD = 110;
const SWIPE_OUT_DURATION = 220;

const normalizeWorkKey = (k) => (k?.startsWith("/works/") ? k : `/works/${k || ""}`);

function Card({ item }) {
    return (
        <View style={styles.card}>
            {item?.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={styles.cover} />
            ) : (
                <View style={styles.coverPlaceholder} />
            )}
            <Text style={styles.cardTitle} numberOfLines={2}>
                {item?.title || "Untitled"}
            </Text>
            <Text style={styles.cardAuthor} numberOfLines={1}>
                {item?.author || "Unknown author"}
            </Text>
        </View>
    );
}

export default function HomeTab() {
    const { user } = useAuth(); // expects: user._id + token already set in api interceptor
    const [loading, setLoading] = useState(true);
    const [books, setBooks] = useState([]);
    const [idx, setIdx] = useState(0);
    const [liking, setLiking] = useState(false);

    const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    const current = books[idx];

    const rotation = position.x.interpolate({
        inputRange: [-240, 0, 240],
        outputRange: ["-9deg", "0deg", "9deg"],
    });

    const likeOpacity = position.x.interpolate({
        inputRange: [0, 60, 140],
        outputRange: [0, 0.2, 1],
        extrapolate: "clamp",
    });

    const nopeOpacity = position.x.interpolate({
        inputRange: [-140, -60, 0],
        outputRange: [1, 0.2, 0],
        extrapolate: "clamp",
    });

    const cardStyle = {
        transform: [...position.getTranslateTransform(), { rotate: rotation }],
    };

    const fetchBooks = useCallback(async () => {
        try {
            setLoading(true);

            // ✅ from your backend (public route)
            // If you prefer search instead: GET /books?q=...
            const res = await api.get("/books/trending?limit=30");

            const raw = res?.data?.books || [];
            const normalized = raw
                .map((b) => ({
                    key: normalizeWorkKey(b.key),
                    title: b.title,
                    author: b.author || (Array.isArray(b.authors) ? b.authors.join(", ") : "Unknown author"),
                    firstPublishYear: b.firstPublishYear ?? null,
                    coverId: b.coverId ?? null,
                    coverUrl: b.coverUrl ?? null,
                }))
                .filter((b) => b.key && b.title);

            // ✅ sort by title
            normalized.sort((a, b) => (a.title || "").localeCompare(b.title || "", "en", { sensitivity: "base" }));

            setBooks(normalized);
            setIdx(0);
        } catch (e) {
            console.error("Fetch books error:", e?.response?.data || e?.message);
            setBooks([]);
            setIdx(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    const goToBook = useCallback(() => {
        if (!current?.key) return;
        const workId = current.key.replace("/works/", "");
        router.push({ pathname: "/book/[bookKey]", params: { bookKey: workId } });
    }, [current]);

    const advance = useCallback(() => {
        setIdx((prev) => Math.min(prev + 1, Math.max(books.length - 1, 0)));
    }, [books.length]);

    const resetPosition = useCallback(() => {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 6,
        }).start();
    }, [position]);

    const swipeOut = useCallback(
        (direction) => {
            const toX = direction === "right" ? 420 : -420;
            Animated.timing(position, {
                toValue: { x: toX, y: 0 },
                duration: SWIPE_OUT_DURATION,
                useNativeDriver: false,
            }).start(() => {
                position.setValue({ x: 0, y: 0 });
                advance();
            });
        },
        [advance, position]
    );

    const likeBook = useCallback(async () => {
        if (!user?._id || !current) return;

        try {
            setLiking(true);

            // ✅ your backend route expects { user, book } and is not protected in your code
            await api.post("/favorite", {
                user: user._id,
                book: {
                    key: current.key,
                    title: current.title,
                    author: current.author,
                    firstPublishYear: current.firstPublishYear,
                    coverId: current.coverId,
                    coverUrl: current.coverUrl,
                },
            });
        } catch (e) {
            // 409 = already favorited (ok)
            if (e?.response?.status !== 409) {
                console.error("Like error:", e?.response?.data || e?.message);
            }
        } finally {
            setLiking(false);
        }
    }, [current, user?._id]);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
                onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
                    useNativeDriver: false,
                }),
                onPanResponderRelease: async (_, gesture) => {
                    if (!current) return;

                    if (gesture.dx > SWIPE_THRESHOLD) {
                        await likeBook();
                        swipeOut("right");
                        return;
                    }

                    if (gesture.dx < -SWIPE_THRESHOLD) {
                        swipeOut("left");
                        return;
                    }

                    resetPosition();
                },
            }),
        [current, likeBook, position.x, position.y, resetPosition, swipeOut]
    );

    const manualNope = useCallback(() => {
        swipeOut("left");
    }, [swipeOut]);

    const manualLike = useCallback(async () => {
        await likeBook();
        swipeOut("right");
    }, [likeBook, swipeOut]);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator />
                <Text style={{ marginTop: 10, opacity: 0.6 }}>Loading books…</Text>
            </View>
        );
    }

    if (!current) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 8 }}>No books</Text>
                <TouchableOpacity onPress={fetchBooks} style={styles.primaryBtn}>
                    <Text style={styles.primaryText}>Reload</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.h1}>Discover</Text>
                <TouchableOpacity onPress={fetchBooks} style={styles.headerIconBtn}>
                    <Ionicons name="refresh" size={20} />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, justifyContent: "center" }}>
                <Animated.View style={[styles.badge, styles.likeBadge, { opacity: likeOpacity }]}>
                    <Ionicons name="heart" size={18} color="#fff" />
                    <Text style={styles.badgeText}>LIKE</Text>
                </Animated.View>

                <Animated.View style={[styles.badge, styles.nopeBadge, { opacity: nopeOpacity }]}>
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.badgeText}>NOPE</Text>
                </Animated.View>

                <Animated.View style={[cardStyle]} {...panResponder.panHandlers}>
                    <TouchableOpacity activeOpacity={0.92} onPress={goToBook}>
                        <Card item={current} />
                    </TouchableOpacity>
                </Animated.View>

                <Text style={styles.counter}>
                    {idx + 1} / {books.length}
                </Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity onPress={manualNope} style={styles.circle}>
                    <Ionicons name="close" size={22} />
                </TouchableOpacity>

                <TouchableOpacity onPress={goToBook} style={styles.primaryBtn}>
                    <Text style={styles.primaryText}>Open</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={manualLike} disabled={liking} style={[styles.circle, liking && styles.disabled]}>
                    <Ionicons name="heart" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#FAFAF0",paddingTop: 70 },
    center: { alignItems: "center", justifyContent: "center" },

    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    h1: { fontSize: 22, fontWeight: "800", marginBottom: 12 },
    headerIconBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
    },

    card: {
        backgroundColor: "white",
        borderRadius: 18,
        padding: 14,
        alignItems: "center",
        shadowOpacity: 0.08,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
    },
    cover: { width: 180, height: 260, borderRadius: 12, marginBottom: 12 },
    coverPlaceholder: { width: 180, height: 260, borderRadius: 12, marginBottom: 12, backgroundColor: "#eee" },
    cardTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
    cardAuthor: { fontSize: 12, opacity: 0.7, marginTop: 4 },

    counter: { textAlign: "center", marginTop: 10, opacity: 0.6 },

    actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
    circle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
    },
    disabled: { opacity: 0.45 },
    primaryBtn: {
        flex: 1,
        marginHorizontal: 12,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },
    primaryText: { color: "white", fontWeight: "800" },

    badge: {
        position: "absolute",
        top: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        zIndex: 9,
    },
    likeBadge: { left: 12, backgroundColor: "#16a34a" },
    nopeBadge: { right: 12, backgroundColor: "#dc2626" },
    badgeText: { color: "white", fontWeight: "900", letterSpacing: 1 },
});
