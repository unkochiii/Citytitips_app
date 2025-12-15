import { Text, View, Image, StyleSheet, ScrollView } from "react-native";
import axios from "axios";
import { useEffect, useState } from "react";
import Feather from "@expo/vector-icons/Feather";

const Profile = () => {
  const [data, setData] = useState(null);
  const token =
    "8NH3VYttUIa6lDQQRORkJT85PSciM0aUrQ6oa-nL_iCgAfQLkUOxwxQkXCguQKD0"; // à changer
  const id = "6939799a4062b44279b19831"; // à changer

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await axios.get(
          `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/user/profile/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setData(results.data);
      } catch (error) {
        console.log("Error fetching profile:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* AVATAR */}
      {data?.user?.account?.avatar?.secure_url && (
        <Image
          source={{ uri: data.user.account.avatar.secure_url }}
          style={styles.avatar}
        />
      )}

      {/* NAME */}
      <Text style={styles.username}>{data?.user?.fullname}</Text>

      <Feather name="user-plus" size={22} style={styles.icon} />

      <Text style={styles.handle}>@{data?.user?.account?.username}</Text>

      {/* BIO */}
      <View style={styles.bio}>
        <Text style={styles.bioTitle}>Bio</Text>
        <Text style={styles.bioText}>Passionate reader ✨</Text>
      </View>

      {/* FAVORITE BOOKS */}
      <Text style={styles.sectionTitle}>Favorite Books</Text>
      <View style={styles.carousel}>
        {Object.entries(data?.user?.favBooks || {}).map(([key, book]) => (
          <View key={key} style={styles.bookCard}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookAuthor}>{book.author_name}</Text>
          </View>
        ))}
      </View>

      {/* FAVORITE SUBJECTS */}
      <Text style={styles.sectionTitle}>Favorite Subjects</Text>
      <View style={styles.carousel}>
        {Object.entries(data?.user?.style || {}).map(([key, name]) => (
          <View key={key} style={styles.styleRound}>
            <Text style={styles.styleText}>{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default Profile;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    paddinTop: 100,
    flex: 1,
    backgroundColor: "#FAFAF0",
    paddingHorizontal: 16,
  },

  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 10,
  },

  username: {
    alignSelf: "center",
    fontSize: 16,
    fontWeight: "600",
  },

  handle: {
    alignSelf: "center",
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },

  icon: {
    alignSelf: "center",
    marginBottom: 10,
  },

  bio: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginVertical: 20,
    elevation: 3,
  },

  bioTitle: {
    fontWeight: "bold",
    marginBottom: 6,
    fontSize: 14,
  },

  bioText: {
    fontSize: 13,
    color: "#444",
  },

  sectionTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  carousel: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },

  bookCard: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    minWidth: 120,
    alignItems: "center",
    elevation: 2,
  },

  bookTitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  bookAuthor: {
    fontSize: 11,
    color: "#666",
  },

  styleRound: {
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  styleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
