import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

export default function BookCard({ book, isMasked, onToggleMask }) {
    if (!book) return null;

    return (
        <View style={styles.card}>
            <Image source={{ uri: book.cover }} style={styles.cover} />

            <Text style={styles.author}>{book.author}</Text>
            <Text style={styles.title} numberOfLines={2}>
                {book.title}
            </Text>

            <View style={styles.tagsRow}>
                {(book.tags || []).map((t, i) => (
                    <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{t}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity onPress={onToggleMask} style={styles.maskBtn}>
                <Text style={styles.maskText}>{isMasked ? "Unmask" : "Mask"}</Text>
            </TouchableOpacity>

            <Text style={styles.reason} numberOfLines={2}>
                {book.suggestionReason}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 320,
        borderRadius: 20,
        padding: 14,
        backgroundColor: "white",
        elevation: 6,
    },
    cover: {
        width: "100%",
        height: 340,
        borderRadius: 16,
        backgroundColor: "#EEE",
    },
    author: { marginTop: 10, color: "#777", fontWeight: "600" },
    title: { marginTop: 6, fontSize: 20, fontWeight: "800", color: "#5A2B18" },
    tagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 },
    tag: { backgroundColor: "#F5E6DC", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    tagText: { color: "#8B4A2B", fontWeight: "600", fontSize: 12 },
    maskBtn: { marginTop: 12, alignSelf: "flex-end", backgroundColor: "#000", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
    maskText: { color: "white", fontWeight: "700" },
    reason: { marginTop: 10, color: "#666" },
});
