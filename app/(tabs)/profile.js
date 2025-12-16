import { Text, View, Image, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import { useAuth } from "../../context/AuthContext";
import { getUserProfile } from "../../services/api";

export default function Profile() {
    const { user, logout } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const run = async () => {
            try {
                if (!user?._id) return;
                const profile = await getUserProfile(user._id);
                setData(profile);
            } catch (e) {
                console.log("Error fetching profile:", e);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [user?._id]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {data?.account?.avatar?.secure_url && (
                <Image source={{ uri: data.account.avatar.secure_url }} style={styles.avatar} />
            )}

            <Text style={styles.username}>{data?.fullname || user?.username}</Text>

            <Feather name="user-plus" size={22} style={styles.icon} />
            <Text style={styles.handle}>@{data?.account?.username || user?.username}</Text>

            <View style={styles.bio}>
                <Text style={styles.bioTitle}>Bio</Text>
                <Text style={styles.bioText}>Passionate reader ✨</Text>
            </View>

            <Text style={styles.sectionTitle}>Favorite Books</Text>
            <View style={styles.carousel}>
                {Object.entries(data?.favBooks || {}).map(([key, book]) => (
                    <View key={key} style={styles.bookCard}>
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        <Text style={styles.bookAuthor}>{book.author_name}</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Favorite Subjects</Text>
            <View style={styles.carousel}>
                {Object.entries(data?.style || {}).map(([key, name]) => (
                    <View key={key} style={styles.styleRound}>
                        <Text style={styles.styleText}>{name}</Text>
                    </View>
                ))}
            </View>

            <Text onPress={logout} style={{ textAlign: "center", marginTop: 20, color: "crimson", fontWeight: "700" }}>
                Logout
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { paddingTop: 60, flex: 1, backgroundColor: "#FAFAF0", paddingHorizontal: 16 },
    avatar: { width: 140, height: 140, borderRadius: 70, alignSelf: "center", marginTop: 20, marginBottom: 10 },
    username: { alignSelf: "center", fontSize: 16, fontWeight: "600" },
    handle: { alignSelf: "center", fontSize: 13, color: "#666", marginBottom: 10 },
    icon: { alignSelf: "center", marginBottom: 10 },
    bio: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginVertical: 20, elevation: 3 },
    bioTitle: { fontWeight: "bold", marginBottom: 6, fontSize: 14 },
    bioText: { fontSize: 13, color: "#444" },
    sectionTitle: { textAlign: "center", fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    carousel: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 20 },
    bookCard: { backgroundColor: "#fff", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, minWidth: 120, alignItems: "center", elevation: 2 },
    bookTitle: { fontSize: 13, fontWeight: "600", textAlign: "center" },
    bookAuthor: { fontSize: 11, color: "#666" },
    styleRound: { backgroundColor: "#000", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    styleText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
