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
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";

const Profile = () => {
  const { user, token, logout } = useAuth(); // Récupère l'id le token et le logout dynamiquement
  const [data, setData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router=useRouter()

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
    <View style={{ flex: 1 }}>
      {/* OVERLAY */}
      {menuOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        />
      )}

      {/* MENU */}
      {menuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              router.push("/AccountSettings")
            }}
          >
            <Text>Account Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              logout();
            }}
          >
            <Text>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.container}>
        {/* BOUTON MENU */}
        <TouchableOpacity
          style={styles.modifyProfile}
          onPress={() => setMenuOpen(true)}
        >
          <Ionicons
            name="ellipsis-horizontal-circle-outline"
            size={24}
            color="black"
          />
        </TouchableOpacity>

        {/* AVATAR */}
        <Image
          source={{
            uri:
              data?.user?.account?.avatar?.secure_url ||
              "https://ui-avatars.com/api/?name=User",
          }}
          style={styles.avatar}
        />

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
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 70,
  },
  modifyProfile: { alignSelf: "flex-end", marginBottom: 16 },
  menu: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 8,
    zIndex: 100,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    zIndex: 50,
  },

  menuItem: { paddingHorizontal: 20, paddingVertical: 12 },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "#F8F8F8",
  },
  username: {
    alignSelf: "center",
    fontSize: 24,
    fontWeight: "800",
    color: "#000",
    letterSpacing: -0.5,
  },
  handle: {
    alignSelf: "center",
    fontSize: 15,
    color: "#999",
    marginBottom: 16,
    fontWeight: "600",
  },

  bio: {
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
  },
  bioTitle: { fontWeight: "800", marginBottom: 8, fontSize: 16, color: "#000" },
  bioText: { fontSize: 15, color: "#666", lineHeight: 22 },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
    color: "#000",
    letterSpacing: -0.5,
  },
  carousel: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 24,
  },
  bookCard: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    width: 160,
    alignItems: "center",
    margin: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  bookTitle: {
    paddingTop: 12,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: "#000",
  },
  bookAuthor: { paddingTop: 6, fontSize: 12, color: "#999", fontWeight: "500" },
  favBookPicture: { width: 110, height: 160, borderRadius: 12 },

  styleRound: {
    backgroundColor: "#FF6B6B",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 6,
  },
  styleText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
