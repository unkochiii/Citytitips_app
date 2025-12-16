import { View, Text, Image, StyleSheet } from "react-native";

export default function OrganisationAuthor({ item }) {
    const photo = item?.photo || null;

    return (
        <View style={styles.container}>
            {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarFallback]} />
            )}

            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {item?.name || "Unknown author"}
                </Text>

                <Text style={styles.meta}>
                    Books: {item?.numberOfBooks ?? 0}
                </Text>

                {!!(item?.topSubjects?.length) && (
                    <Text style={styles.subjects} numberOfLines={2}>
                        Top subjects: {item.topSubjects.slice(0, 6).join(", ")}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: "row", gap: 12, alignItems: "center" },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#EEE" },
    avatarFallback: { backgroundColor: "#DDD" },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: "700" },
    meta: { marginTop: 2, color: "#666" },
    subjects: { marginTop: 6, color: "#666", fontSize: 12 },
});
