import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import api from "../../services/api";

export default function Chat() {
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const res = await api.get("/messages/all");
        setMessages(res.data || []);
      } catch (e) {
        // si 404 -> tu affiches ton message rouge
        const msg = e?.response?.data?.message || e?.message || "Error";
        setError(msg);
        console.log("CHAT API URL:", e?.response?.config?.baseURL + e?.response?.config?.url);
      }
    };
    load();
  }, []);

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 34, fontWeight: "800" }}>Chat</Text>
        <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: "#111" }}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>New chat</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={{ color: "red", marginTop: 12, fontWeight: "700" }}>{error}</Text>}

      {messages.length === 0 ? (
        <Text style={{ marginTop: 14, color: "#777" }}>
          No conversations yet. Tap "New chat".
        </Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingTop: 16 }}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
              <Text style={{ fontWeight: "800" }}>{item.senderUsername}</Text>
              <Text style={{ color: "#444" }}>{item.text}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}