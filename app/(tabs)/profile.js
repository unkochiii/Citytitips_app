import {
  Text,
  View,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState } from "react";
import axios from "axios";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useAuth } from "../../context/AuthContext";

const Profile = () => {
  const { user, token } = useAuth(); // Récupère l'id et token dynamiquement
  const [data, setData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id || !token) return;
      try {
        const result = await axios.get(
          `https://site--en2versv0-backend--ftkq8hkxyc7l.code.run/user/profile/${user._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setData(result.data);
      } catch (error) {
        console.log("Error fetching profile:", error);
      }
    };
    fetchData();
  }, [user?._id, token]);

  if (!data) {
    return (
      <Text style={{ textAlign: "center", marginTop: 50 }}>Loading...</Text>
    );
  }

  const profile = data.user;

  return (
    <ScrollView style={styles.container}>
      {/* MENU */}
      <TouchableOpacity
        style={styles.modifyProfile}
        onPress={() => setMenuOpen(!menuOpen)}
      >
        <AntDesign name="plus" size={24} color="black" />
      </TouchableOpacity>

      {menuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem}>
            <Text>Modify Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text>Account Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* AVATAR */}
        {data?.user?.account?.avatar?.secure_url && (
          <Image
            source={{ uri: data.user.account.avatar.secure_url }}
            style={styles.avatar}
          />
        )}


      {/* NAME & HANDLE */}
      <Text style={styles.username}>{profile.fullname}</Text>
      <Text style={styles.handle}>@{profile.account.username}</Text>

      {/* BIO */}
        <View style={styles.bio}>
          <Text style={styles.bioTitle}>Bio</Text>
          <Text style={styles.bioText}>Passionate reader ✨</Text>
        </View>

      {/* FAVORITE BOOKS */}
      {profile.favBooks?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Favorite Books</Text>
          <View style={styles.carousel}>
            {profile.favBooks.map((book, index) => (
              <View key={index} style={styles.bookCard}>
                {book.coverUrl && (
                  <Image
                    source={{ uri: book.coverUrl }}
                    style={styles.favBookPicture}
                  />
                )}
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>{book.author_name}</Text>
              </View>
            ))}
          </View>
        </>
      )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF0",
    paddingHorizontal: 16,
    paddingTop: 70,
  },
  modifyProfile: { alignSelf: "flex-end", marginBottom: 10 },
  menu: {
    position: "absolute",
    top: 60,
    right: 16,
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 8,
    elevation: 5,
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 10 },

  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: "center",
    marginBottom: 10,
  },
  username: { alignSelf: "center", fontSize: 16, fontWeight: "600" },
  handle: {
    alignSelf: "center",
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },

  bio: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginVertical: 20,
    elevation: 3,
  },
  bioTitle: { fontWeight: "bold", marginBottom: 6, fontSize: 14 },
  bioText: { fontSize: 13, color: "#444" },

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
    marginBottom: 20,
  },
  bookCard: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    width: 150,
    alignItems: "center",
    margin: 5,
    elevation: 2,
  },
  bookTitle: {
    paddingTop: 10,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  bookAuthor: { paddingTop: 5, fontSize: 11, color: "#666" },
  favBookPicture: { width: 100, height: 150 },

  styleRound: {
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    margin: 5,
  },
  styleText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
