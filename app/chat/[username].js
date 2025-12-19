import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import api from "../../services/api";

export default function ChatRoom() {
  const { username } = useLocalSearchParams(); // other user
  const other = String(username || "");

  const [me, setMe] = useState(""); // ✅ username connecté
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const listRef = useRef(null);

  // ✅ load connected username once
  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync("authUsername");
      setMe(stored || "");
    })();
  }, []);

  const loadThread = async () => {
    if (!other) return;

    try {
      setError("");
      setLoading(true);

      const res = await api.get(`/messages/thread?with=${encodeURIComponent(other)}`);
      setMessages(Array.isArray(res.data) ? res.data : []);

      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 50);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Error");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThread();
  }, [other]);

  const send = async () => {
    const body = text.trim();
    if (!body || !other) return;

    try {
      setError("");
      setText("");

      const res = await api.post("/messages", { toUsername: other, text: body });

      // optimistic update
      setMessages((prev) => [...prev, res.data]);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Send failed");
    }
  };

  const renderItem = ({ item }) => {
    // ✅ correct "mine" logic
    const mine = me && item?.fromUsername === me;

    return (
      <View
        style={{
          alignSelf: mine ? "flex-end" : "flex-start",
          marginTop: 10,
          maxWidth: "80%",
          backgroundColor: mine ? "#111" : "#F1F1F1",
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 14,
        }}
      >
        <Text style={{ color: mine ? "#fff" : "#111", fontWeight: "600" }}>
          {item.text}
        </Text>
        <Text
          style={{
            color: mine ? "rgba(255,255,255,0.6)" : "#777",
            marginTop: 6,
            fontSize: 11,
          }}
        >
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={{ paddingTop: 70, paddingHorizontal: 20, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontWeight: "900" }}>Back</Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <Text style={{ fontWeight: "900", fontSize: 18 }}>{other}</Text>
            {!!me && <Text style={{ fontSize: 12, color: "#777" }}>You: {me}</Text>}
          </View>

          <TouchableOpacity onPress={loadThread}>
            <Text style={{ fontWeight: "900" }}>Reload</Text>
          </TouchableOpacity>
        </View>

        {!!error && (
          <Text style={{ color: "red", marginTop: 10, fontWeight: "700" }}>
            {error}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={{ paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item._id || item.id || Math.random())}
          onRefresh={loadThread}
          refreshing={loading}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          renderItem={renderItem}
        />
      )}

      <View style={{ paddingHorizontal: 16, paddingBottom: 18, flexDirection: "row", gap: 10 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          style={{
            flex: 1,
            height: 50,
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 16,
            paddingHorizontal: 12,
            backgroundColor: "#fafafa",
          }}
        />
        <TouchableOpacity
          onPress={send}
          style={{
            width: 90,
            height: 50,
            borderRadius: 16,
            backgroundColor: "#111",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}