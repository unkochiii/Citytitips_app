import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

export default function BlogSelectorScreen() {
  const router = useRouter();
  const { user, token: authToken } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [selectedBlogs, setSelectedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch les blogs de l'utilisateur
  const fetchUserBlogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = authToken || (await AsyncStorage.getItem("userToken"));
      console.log("🔍 [SELECTOR] Token récupéré:", token ? "Présent" : "NULL");

      if (!token) throw new Error("Non authentifié");

      const response = await fetch(`${API_BASE_URL}/blog/me/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expirée");
        }
        throw new Error("Erreur de chargement");
      }

      const data = await response.json();
      console.log("🔍 [SELECTOR] Blogs chargés:", data.blogs?.length || 0);
      setBlogs(data.blogs || []);

      // Sélectionner tous les blogs par défaut
      const allIds = (data.blogs || []).map((blog) => blog._id);
      console.log("🔍 [SELECTOR] IDs par défaut:", allIds);
      setSelectedBlogs(allIds);
    } catch (err) {
      console.error("❌ [SELECTOR] Erreur fetch:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(
      "🔍 [SELECTOR] useEffect déclenché, authToken:",
      authToken ? "Présent" : "NULL"
    );
    fetchUserBlogs();
  }, [authToken]);

  // Basculer la sélection d'un blog
  const toggleBlogSelection = (blogId) => {
    setSelectedBlogs((prev) => {
      const newSelection = prev.includes(blogId)
        ? prev.filter((id) => id !== blogId)
        : [...prev, blogId];
      console.log("🔍 [SELECTOR] Sélection mise à jour:", newSelection);
      return newSelection;
    });
  };

  // Aller à la dashboard avec les blogs sélectionnés
  const goToDashboard = () => {
    console.log("🔍 [SELECTOR] Bouton appuyé, selectedBlogs:", selectedBlogs);

    if (selectedBlogs.length === 0) {
      Alert.alert(
        "Aucun blog sélectionné",
        "Veuillez sélectionner au moins un blog"
      );
      return;
    }

    // Construire l'URL avec les IDs sélectionnés
    // ✅ CORRIGÉ : Ajout du ? manquant
    const queryString = selectedBlogs.map((id) => `blogIds=${id}`).join("&");
    const targetUrl = `/blog/dashboardB?${queryString}`;

    console.log("🔍 [SELECTOR] Redirection vers:", targetUrl);
    console.log("🔍 [SELECTOR] Query string complète:", queryString);
    console.log("🔍 [SELECTOR] Route cible: /blog/dashboardB");

    try {
      router.push(targetUrl);
      console.log("✅ [SELECTOR] Navigation lancée avec succès");
    } catch (navError) {
      console.error("❌ [SELECTOR] Erreur de navigation:", navError);
      Alert.alert("Erreur", "Impossible de naviguer vers la dashboard");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement de vos blogs...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <Ionicons name="alert-circle-outline" size={70} color="#e74c3c" />
        <Text style={styles.errorTitle}>Erreur</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchUserBlogs}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (blogs.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <Ionicons name="document-outline" size={70} color="#888" />
        <Text style={styles.errorTitle}>Aucun blog</Text>
        <Text style={styles.errorMessage}>
          Vous n'avez pas encore créé de blog
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: "#3498db" }]}
          onPress={() => router.push("/blog/create")}
        >
          <Text style={styles.retryBtnText}>Créer un blog</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sélectionner les blogs</Text>
          <Text style={styles.headerSubtitle}>
            Choisissez les blogs pour la dashboard
          </Text>
        </View>
      </View>

      <FlatList
        data={blogs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.blogItem}
            onPress={() => toggleBlogSelection(item._id)}
            activeOpacity={0.7}
          >
            <View style={styles.checkboxContainer}>
              <View
                style={[
                  styles.checkbox,
                  selectedBlogs.includes(item._id) && styles.checkboxSelected,
                ]}
              >
                {selectedBlogs.includes(item._id) && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
            </View>
            <View style={styles.blogInfo}>
              <Text style={styles.blogTitle}>{item.title}</Text>
              <Text style={styles.blogStats}>
                {item.views || 0} vues • {item.likesCount || 0} likes
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <Text style={styles.selectionCount}>
          {selectedBlogs.length} blog{selectedBlogs.length > 1 ? "s" : ""}{" "}
          sélectionné
          {selectedBlogs.length > 1 ? "s" : ""}
        </Text>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            selectedBlogs.length === 0 && styles.disabledBtn,
          ]}
          onPress={goToDashboard}
          disabled={selectedBlogs.length === 0}
        >
          <Text style={styles.primaryBtnText}>Voir la dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  header: {
    padding: 16,
    paddingTop: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a2e",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  blogItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#3498db",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  blogInfo: {
    flex: 1,
  },
  blogTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  blogStats: {
    fontSize: 13,
    color: "#888",
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  selectionCount: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#3498db",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledBtn: {
    backgroundColor: "#ccc",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
