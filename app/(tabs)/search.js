import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import axios from "axios";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import DropDownPicker from "react-native-dropdown-picker";

import OrganisationTitle from "../../components/OrganisationSearchRender/OrganisationTitle";
import OrganisationAuthor from "../../components/OrganisationSearchRender/OrganisationAuthor";
import OrganisationISBN from "../../components/OrganisationSearchRender/OrganisationISBN";
import OrganisationSubject from "../../components/OrganisationSearchRender/OrganisationSubject";

export default function Search() {
    const dropdownRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [type, setType] = useState("title"); // ✅ default
    const [items, setItems] = useState([
        { label: "Title", value: "title" },
        { label: "Author", value: "author" },
        { label: "Subject", value: "subject" },
        { label: "ISBN", value: "ISBN" },
    ]);

    const [search, setSearch] = useState("");

    // Pour types autres que subject
    const [data, setData] = useState([]);

    // Pour subject (pagination)
    const [books, setBooks] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const limit = 20;

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // -----------------------------
    // Helpers
    // -----------------------------
    const handleOutsidePress = () => {
        Keyboard.dismiss();
        setOpen(false);
    };

    const safeWorkKeyToId = (workKey) => {
        // workKey: "/works/OL29226517W"
        if (!workKey || typeof workKey !== "string") return null;
        const parts = workKey.split("/works/");
        return parts?.[1] || null;
    };

    const openBook = (item) => {
        const bookKey = safeWorkKeyToId(item?.key);
        if (!bookKey) return;
        router.push(`/(tabs)/book/${bookKey}`);
    };

    // -----------------------------
    // FETCH - TITLE / AUTHOR / ISBN
    // -----------------------------
    const fetchOtherTypes = useCallback(async () => {
        setIsLoading(true);
        try {
            if (type === "title") {
                const res = await axios.get(
                    `https://openlibrary.org/search.json?title=${encodeURIComponent(search)}`
                );
                setData(res.data?.docs || []);
            } else if (type === "author") {
                const resAuthor = await axios.get(
                    `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(search)}`
                );

                const author = resAuthor.data?.docs?.[0];
                if (!author) {
                    setData([
                        { name: "No author found", topSubjects: [], numberOfBooks: 0, photo: null },
                    ]);
                    return;
                }

                const authorKey = (author.key || "").replace(/^\/+/, "");
                const worksRes = await axios.get(
                    `https://openlibrary.org/authors/${authorKey}/works.json`
                );

                setData([
                    {
                        name: author.name,
                        topSubjects: author.top_subjects || [],
                        numberOfBooks: worksRes.data?.size || 0,
                        photo: author.photo_id
                            ? `https://covers.openlibrary.org/a/id/${author.photo_id}-M.jpg`
                            : null,
                    },
                ]);
            } else if (type === "ISBN") {
                const ISBNKey = `ISBN:${search}`;
                const res = await axios.get(
                    `https://openlibrary.org/api/books?bibkeys=${ISBNKey}&format=json&jscmd=data`
                );
                const key = Object.keys(res.data || {})[0];
                setData(key ? [res.data[key]] : []);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("API Error:", error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [search, type]);

    // -----------------------------
    // FETCH - SUBJECT first page
    // -----------------------------
    const fetchSubjectFirstPage = useCallback(async () => {
        setIsLoading(true);
        setIsLoadingMore(false);

        // reset subject state
        setBooks([]);
        setOffset(0);
        setHasMore(true);

        try {
            const res = await axios.get(
                `https://openlibrary.org/subjects/${encodeURIComponent(search)}.json?limit=${limit}&offset=0`
            );

            const works = res.data?.works || [];
            const workCount = res.data?.work_count || works.length;

            setBooks(works);
            setOffset(limit);
            setHasMore(works.length < workCount);
        } catch (error) {
            console.error("API Error Subject:", error);
            setBooks([]);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [search]);

    // -----------------------------
    // FETCH - SUBJECT next pages
    // -----------------------------
    const fetchMoreSubject = useCallback(async () => {
        if (!hasMore || isLoadingMore || isLoading) return;
        if (!search.trim() || type !== "subject") return;

        setIsLoadingMore(true);
        try {
            const res = await axios.get(
                `https://openlibrary.org/subjects/${encodeURIComponent(search)}.json?limit=${limit}&offset=${offset}`
            );

            const newBooks = res.data?.works || [];
            const workCount = res.data?.work_count || 0;

            // ✅ éviter stale state : on calcule avec prev
            setBooks((prev) => {
                const merged = [...prev, ...newBooks];
                if (workCount && merged.length >= workCount) setHasMore(false);
                return merged;
            });

            setOffset((prev) => prev + limit);
        } catch (error) {
            console.error("API Error Subject (more):", error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [hasMore, isLoadingMore, isLoading, search, type, offset]);

    // -----------------------------
    // Main effect: déclenche recherche
    // -----------------------------
    useEffect(() => {
        // champ vide => reset total
        if (!search.trim()) {
            setData([]);
            setBooks([]);
            setOffset(0);
            setHasMore(true);
            setIsLoading(false);
            setIsLoadingMore(false);
            return;
        }

        if (type === "subject") {
            fetchSubjectFirstPage();
        } else {
            fetchOtherTypes();
        }
    }, [search, type, fetchOtherTypes, fetchSubjectFirstPage]);

    // -----------------------------
    // Render item
    // -----------------------------
    const renderItem = ({ item }) => {
        // TITLE / SUBJECT (works)
        const title = item?.title || "No Title";
        const authors = item?.author_name?.join(", ") || "Unknown";
        const year = item?.first_publish_year || item?.first_publish_date || "Unknown";
        const coverUri = item?.cover_i
            ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
            : "https://via.placeholder.com/100x150.png?text=No+Cover";

        // subject items possèdent cover_id (pas cover_i)
        const subjectCoverUri = item?.cover_id
            ? `https://covers.openlibrary.org/b/id/${item.cover_id}-M.jpg`
            : coverUri;

        // clickable uniquement quand on peut en déduire un bookKey (work key)
        const isClickable =
            type === "title" || type === "subject"
                ? !!safeWorkKeyToId(item?.key)
                : false;

        return (
            <TouchableOpacity
                activeOpacity={isClickable ? 0.75 : 1}
                onPress={() => (isClickable ? openBook(item) : null)}
                style={styles.resultItem}
            >
                {type === "title" && (
                    <OrganisationTitle
                        title={title}
                        authors={authors}
                        year={year}
                        coverUri={coverUri}
                    />
                )}

                {type === "author" && <OrganisationAuthor item={item} />}

                {type === "ISBN" && item && <OrganisationISBN item={item} />}

                {type === "subject" && (
                    <OrganisationSubject
                        item={{
                            ...item,
                            // pour que ton component garde le même comportement
                            _coverUri: subjectCoverUri,
                        }}
                    />
                )}
            </TouchableOpacity>
        );
    };

    // -----------------------------
    // UI
    // -----------------------------
    return (
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back-outline" size={28} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Research</Text>
                </View>

                <View style={styles.row}>
                    <View style={styles.dropdownContainer}>
                        <DropDownPicker
                            ref={dropdownRef}
                            open={open}
                            value={type}
                            items={items}
                            setOpen={setOpen}
                            setValue={setType}
                            setItems={setItems}
                            placeholder="Type"
                            zIndex={3000}
                            zIndexInverse={1000}
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropDownContainerStyle}
                            onOpen={() => Keyboard.dismiss()}
                        />
                    </View>

                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="books, ISBN, author ..."
                        returnKeyType="search"
                        onFocus={() => setOpen(false)}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {/* Loader (hors subject ou subject first load) */}
                {isLoading && (
                    <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
                )}

                <FlatList
                    data={type === "subject" ? books : data}
                    keyExtractor={(item, index) =>
                        (item?.key || item?.cover_edition_key || item?.title || index).toString()
                    }
                    renderItem={renderItem}
                    onEndReached={type === "subject" ? fetchMoreSubject : null}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    style={{ marginTop: 12 }}
                    ListEmptyComponent={
                        !isLoading && search.trim() ? (
                            <Text style={{ textAlign: "center", marginTop: 30, color: "#777" }}>
                                No results
                            </Text>
                        ) : null
                    }
                    ListFooterComponent={
                        type === "subject" && isLoadingMore ? (
                            <ActivityIndicator size="large" color="black" style={{ marginTop: 16 }} />
                        ) : null
                    }
                />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#FAFAF0" ,paddingTop: 70,},
    header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    headerTitle: { fontSize: 18, marginLeft: 8, fontWeight: "600" },

    row: { flexDirection: "row", alignItems: "center", gap: 10 },

    dropdownContainer: {
        width: 120,
        ...Platform.select({ ios: { zIndex: 3000 }, android: {} }),
    },
    dropdown: {
        borderColor: "#ccc",
        height: 44,
        justifyContent: "center",
        backgroundColor: "white",
    },
    dropDownContainerStyle: { borderColor: "#ccc", backgroundColor: "white" },

    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ccc",
        height: 44,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: "white",
    },

    resultItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#DDD",
        backgroundColor: "white",
        borderRadius: 10,
        marginBottom: 10,
    },
});
