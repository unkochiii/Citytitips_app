// app/(tabs)/_layout.js
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#eee",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: "Publier",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Événements",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="commerce"
        options={{
          title: "Commerces",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />

      {/* ✅ Cache la page post/[id] de la tab bar */}
      <Tabs.Screen
        name="post/[id]"
        options={{
          href: null,
        }}
      />

      {/* ✅ Cache la page post/[id]/edit de la tab bar */}
      <Tabs.Screen
        name="post/[id]/edit"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="commerce/create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="commerce/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
