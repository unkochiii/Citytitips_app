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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../../context/AuthContext";

const API_BASE_URL = "https://site--citytitipsback--fp64tcf5fhqm.code.run";

// ===== COMPOSANTS ENFANTS (déclarés AVANT le composant principal) =====
const StatCard = ({ icon, color, label, value }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statHeader}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color: color }]}>{value}</Text>
    </View>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ConversionCard = ({ title, value, icon, color }) => (
  <View style={styles.conversionCard}>
    <View style={styles.conversionHeader}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.conversionTitle}>{title}</Text>
    </View>
    <Text style={[styles.conversionValue, { color: color }]}>{value}</Text>
  </View>
);

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={20} color="#3498db" />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

// ===== COMPOSANT PRINCIPAL =====
export default function BlogDashboardScreen() {
  const router = useRouter();
  const { blogIds } = useLocalSearchParams();
  const { user, token: authToken } = useAuth(); // UN SEUL APPEL

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ===== FORMATTERS =====
  const formatNumber = (num) => {
    if (!num && num !== 0) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // ===== API CALL ROBUSTE =====
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // STRATÉGIE ROBUSTE : Essayer plusieurs sources avec retry
      let token = authToken;

      // 1. Si pas de token dans le context, essayer AsyncStorage
      if (!token) {
        console.log("Token AuthContext absent, tentative AsyncStorage...");
        token = await AsyncStorage.getItem("userToken");
      }

      // 2. Si toujours pas, attendre un peu et réessayer (race condition)
      if (!token) {
        console.log("Token non trouvé, attente de 500ms...");
        await new Promise((resolve) => setTimeout(resolve, 500));
        token = await AsyncStorage.getItem("userToken");
      }

      console.log("Token final:", token ? "OK" : "NULL");

      if (!token) {
        throw new Error("Non authentifié. Veuillez vous reconnecter.");
      }

      // Construire l'URL avec les IDs de blogs sélectionnés
      let url = `${API_BASE_URL}/blog/dashboard/metrics`;
      if (blogIds) {
        const ids = Array.isArray(blogIds) ? blogIds : [blogIds];
        if (ids.length > 0) {
          url += `?${ids.map((id) => `blogIds=${id}`).join("&")}`;
        }
      }

      console.log("URL appelée:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur HTTP:", response.status, errorText);

        if (response.status === 401) {
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        }

        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const data = await response.json();

      // Validation de la structure
      if (!data?.summary || !data?.conversionRates) {
        console.error("Structure de réponse invalide:", data);
        throw new Error("Structure de données inattendue");
      }

      setMetrics(data);
    } catch (err) {
      console.error("Erreur fetchMetrics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ===== EFFECTS =====
  useEffect(() => {
    // Attendre un peu si le token n'est pas immédiatement disponible
    if (!authToken) {
      console.log("Token non disponible immédiatement, attente...");
      setTimeout(() => fetchMetrics(), 100);
    } else {
      fetchMetrics();
    }
  }, [authToken, blogIds]); // Re-fetch quand le token ou les blogIds changent

  // ===== RENDER STATES =====
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <Ionicons name="alert-circle-outline" size={70} color="#e74c3c" />
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorMessage}>{error}</Text>

        {error.includes("Non authentifié") ||
        error.includes("Session expirée") ? (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: "#3498db" }]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.retryBtnText}>Se reconnecter</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.retryBtn} onPress={fetchMetrics}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // Vérification des permissions (utiliser `user` déjà extrait)
  if (!user?.roles?.includes("blog")) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <Ionicons name="lock-closed-outline" size={70} color="#e74c3c" />
        <Text style={styles.errorTitle}>Accès réservé</Text>
        <Text style={styles.errorMessage}>
          Cette section est réservée aux blogueurs approuvés
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Vérification finale des données
  if (!metrics) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <Ionicons name="warning-outline" size={70} color="#f39c12" />
        <Text style={styles.errorTitle}>Aucune donnée</Text>
        <Text style={styles.errorMessage}>
          Impossible de charger les métriques
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchMetrics}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ===== RENDER METRICS =====
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchMetrics();
            }}
            colors={["#3498db"]}
            tintColor="#3498db"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Bouton retour ajouté ici */}
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Tableau de bord</Text>
            <Text style={styles.headerSubtitle}>
              {blogIds
                ? Array.isArray(blogIds)
                  ? blogIds.length
                  : 1
                : "Tous les"}{" "}
              blog(s) sélectionné(s)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              setRefreshing(true);
              fetchMetrics();
            }}
          >
            <Ionicons name="refresh" size={24} color="#3498db" />
          </TouchableOpacity>
        </View>

        {/* Bouton pour changer la sélection */}
        {blogIds && (
          <View style={styles.selectionBanner}>
            <Text style={styles.selectionText}>
              {Array.isArray(blogIds) ? blogIds.length : 1} blog(s)
              sélectionné(s)
            </Text>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => router.push("/blog/selector")}
            >
              <Text style={styles.changeBtnText}>Modifier la sélection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Synthèse globale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="eye-outline"
              color="#3498db"
              label="Vues totales"
              value={formatNumber(metrics.summary.totalViews)}
            />
            <StatCard
              icon="heart-outline"
              color="#e74c3c"
              label="Likes totaux"
              value={formatNumber(metrics.summary.totalLikes)}
            />
            <StatCard
              icon="chatbox-outline"
              color="#2ecc71"
              label="Commentaires"
              value={formatNumber(metrics.summary.totalComments)}
            />
            <StatCard
              icon="newspaper-outline"
              color="#f39c12"
              label="Blogs publiés"
              value={formatNumber(metrics.summary.totalBlogs)}
            />
          </View>
        </View>

        {/* Taux de conversion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taux de conversion</Text>
          <View style={styles.conversionGrid}>
            <ConversionCard
              title="Taux de like"
              value={metrics.conversionRates.likeConversion}
              icon="heart"
              color="#e74c3c"
            />
            <ConversionCard
              title="Engagement"
              value={metrics.conversionRates.engagementRate}
              icon="people"
              color="#2ecc71"
            />
            <ConversionCard
              title="Taux de clic"
              value={metrics.conversionRates.clickRate}
              icon="finger-print"
              color="#3498db"
            />
          </View>
        </View>

        {/* Statistiques détaillées */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques détaillées</Text>
          <View style={styles.detailList}>
            <DetailItem
              icon="time-outline"
              label="Temps de lecture moyen"
              value={`${metrics.summary.averageReadTime} min`}
            />
            <DetailItem
              icon="eye-outline"
              label="Vues par blog"
              value={formatNumber(metrics.summary.avgViewsPerBlog)}
            />
            <DetailItem
              icon="person-outline"
              label="Vues uniques"
              value={formatNumber(metrics.summary.uniqueViewers)}
            />
            <DetailItem
              icon="share-outline"
              label="Clics totaux"
              value={formatNumber(metrics.summary.totalClicks)}
            />
          </View>
        </View>

        {/* Dernière mise à jour */}
        <View style={styles.footer}>
          <Text style={styles.lastUpdate}>
            Dernière mise à jour :{" "}
            {new Date(metrics.lastUpdate).toLocaleString("fr-FR")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== STYLES =====
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
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
  refreshButton: {
    padding: 8,
  },
  selectionBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectionText: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "600",
  },
  changeBtn: {
    backgroundColor: "#3498db",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  conversionGrid: {
    gap: 12,
  },
  conversionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  conversionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conversionTitle: {
    fontSize: 14,
    color: "#666",
  },
  conversionValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  detailList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  lastUpdate: {
    fontSize: 12,
    color: "#888",
  },
});
