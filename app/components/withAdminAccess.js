// components/withAdminAccess.js
import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export function withAdminAccess(WrappedComponent, options = {}) {
  const { allowedRoles = ["admin", "superAdmin"], redirectTo = "/(tabs)" } =
    options;

  return function ProtectedComponent(props) {
    const { user, isLoading } = useAuth();

    // 👇 DEBUG TEMPORAIRE
    console.log("========== DEBUG HOC ==========");
    console.log("isLoading:", isLoading);
    console.log("user:", JSON.stringify(user, null, 2));
    console.log("user?.roles:", user?.roles);
    console.log("user?.role:", user?.role);
    console.log("allowedRoles:", allowedRoles);

    const userRoles = user?.roles || [];
    const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

    console.log("userRoles:", userRoles);
    console.log("hasAccess:", hasAccess);
    console.log("================================");

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Vérification des accès...</Text>
        </View>
      );
    }

    // 👇 TEMPORAIRE : Afficher un message au lieu de rediriger
    if (!user || !hasAccess) {
      return (
        <View style={styles.loadingContainer}>
          <Text
            style={{
              fontSize: 18,
              color: "red",
              textAlign: "center",
              padding: 20,
            }}
          >
            ❌ ACCÈS REFUSÉ{"\n\n"}
            User: {user ? "connecté" : "non connecté"}
            {"\n"}
            Roles: {JSON.stringify(userRoles)}
            {"\n"}
            HasAccess: {hasAccess ? "OUI" : "NON"}
          </Text>
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

export function withAdminOnly(WrappedComponent) {
  return withAdminAccess(WrappedComponent, {
    allowedRoles: ["admin", "superAdmin"],
  });
}

export function withSuperAdminOnly(WrappedComponent) {
  return withAdminAccess(WrappedComponent, {
    allowedRoles: ["superAdmin"],
  });
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 15,
  },
  loadingText: {
    color: "#666",
    fontSize: 16,
  },
});

export default function _ComponentsIndex() {
  return null;
}
