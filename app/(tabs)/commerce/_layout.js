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
          headerShown: false, // Le header est géré dans le composant
          title: "Commerces",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Détail du commerce",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Ajouter un commerce",
          presentation: "modal", // Optionnel : ouvre en modal
        }}
      />
    </Stack>
  );
}
