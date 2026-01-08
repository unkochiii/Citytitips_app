// app/_layout.js
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    }

    if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return <Slot />;
}

// ✅ Wrapper conditionnel selon la plateforme
function SafeAreaWrapper({ children }) {
  if (Platform.OS === "android") {
    return (
      <SafeAreaView
        style={{ flex: 1 }}
        edges={["top", "bottom", "left", "right"]}
      >
        {children}
      </SafeAreaView>
    );
  }

  // iOS : pas besoin de SafeAreaView ici
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaWrapper>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </SafeAreaWrapper>
    </SafeAreaProvider>
  );
}
