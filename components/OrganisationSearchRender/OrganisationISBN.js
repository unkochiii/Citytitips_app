import { View, Text, StyleSheet, Image } from "react-native";

export default function OrganisationISBN({ item }) {
    const title = item?.title || "Unknown";
    const author =
        item?.authors?.length ? item.authors[0].name : "Unknown";
    const year = item?.publish_date || "Unknown";

    return (
        <View>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.text}>Author: {author}</Text>
                    <Text style={styles.text}>Year: {year}</Text>
                </View>

                {item?.cover?.large ? (
                    <Image source={{ uri: item.cover.large }} style={styles.book_picture} />
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    title: { fontWeight: "bold", marginBottom: 6, fontSize: 16 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    text: { color: "#444" },
    book_picture: { width: 90, height: 130, borderRadius: 8, backgroundColor: "#EEE" },
});
