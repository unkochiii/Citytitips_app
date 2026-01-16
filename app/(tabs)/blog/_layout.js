// app/(tabs)/commerce/_layout.js
import { Stack } from "expo-router";

export default function CommerceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTintColor: "#333",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerBackTitle: "Retour",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Blog",
        }}
      />
      <Stack.Screen
        name="dashboardB"
        options={{
          title: "Dashboard blog",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="selector"
        options={{ title: "Sélectionner les blogs" }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Détail du blog",
        }}
      />
      <Stack.Screen
        name="write"
        options={{
          title: "Ajouter un blog",
          presentation: "modal", // Optionnel : ouvre en modal
        }}
      />
    </Stack>
  );
}
