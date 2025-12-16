import { View, Text, Image, StyleSheet } from "react-native";

export default function OrganisationSubject({ item }) {
    // cover_id (subject works) ou cover_i (search title docs)
    const coverUri =
        item?._coverUri ||
        (item?.cover_id
            ? `https://covers.openlibrary.org/b/id/${item.cover_id}-M.jpg`
            : item?.cover_i
                ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
                : "https://via.placeholder.com/80x120.png?text=No+Cover");

    // authors: subject = [{ name }] | parfois string
    const author =
        item?.authors?.[0]?.name ||
        item?.authors?.[0] ||
        item?.author_name?.[0] ||
        "Unknown";

    return (
        <View style={styles.container}>
            <Image source={{ uri: coverUri }} style={styles.cover} />

            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                    {item?.title || "No title"}
                </Text>
                <Text style={styles.authors} numberOfLines={1}>
                    {author}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: "row", gap: 12, alignItems: "center" },
    cover: { width: 60, height: 90, borderRadius: 6, backgroundColor: "#EEE" },
    info: { flex: 1, justifyContent: "center" },
    title: { fontSize: 14, fontWeight: "700", color: "#5A2B18" },
    authors: { fontSize: 12, color: "#7A7A7A", marginTop: 4 },
});
