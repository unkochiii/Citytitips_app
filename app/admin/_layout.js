// app/(tabs)/admin/_layout.js
import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  // Debug temporaire
  console.log("========== DEBUG ADMIN LAYOUT ==========");
  console.log("isLoading:", isLoading);
  console.log("user:", JSON.stringify(user, null, 2));
  console.log("user?.roles:", user?.roles);
  console.log("=========================================");

  // Attendre que l'utilisateur soit chargé
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  // ✅ CORRECTION : Vérifier "roles" (array) au lieu de "role" (string)
  const userRoles = user?.roles || [];
  const isAdmin =
    userRoles.includes("admin") || userRoles.includes("superAdmin");

  console.log("userRoles:", userRoles);
  console.log("isAdmin:", isAdmin);

  // ✅ Si pas admin, redirection immédiate vers l'accueil
  if (!user || !isAdmin) {
    console.log("❌ Pas admin, redirection...");
    return <Redirect href="/(tabs)" />;
  }

  console.log("✅ Admin confirmé, affichage des pages");

  // ✅ Si admin, afficher les pages normalement
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#007bff" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen
        name="pending-posts"
        options={{ title: "Posts en attente" }}
      />
      <Stack.Screen
        name="pending-commerce"
        options={{ title: "Commerces en attente" }}
      />
      <Stack.Screen name="users" options={{ title: "Utilisateurs" }} />
      <Stack.Screen
        name="pending-blog"
        options={{ title: "Blogs en attente" }}
      />
    </Stack>
  );
}
