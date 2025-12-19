import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import api from "../../services/api";

export default function ChatTab() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState("");

  // New chat modal
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState("");

  const loadConversations = async () => {
    try {
      setError("");
      setLoading(true);
      const res = await api.get("/messages/conversations");
      setConversations(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const openRoom = (username) => {
    setOpen(false);
    setQ("");
    setResults([]);
    router.push(`/chat/${encodeURIComponent(username)}`);
  };

  const searchUsers = async () => {
    const query = q.trim();
    if (!query) return;
    try {
      setSearchError("");
      setSearching(true);

      // ✅ ton back: GET /user?username=...
      const res = await api.get(`/user?username=${encodeURIComponent(query)}`);
      const users = res?.data?.user || [];

      // users likely: [{ _id, account: { username, avatar } }]
      const normalized = users
        .map((u) => ({
          id: u._id,
          username: u?.account?.username || u?.username,
        }))
        .filter((u) => !!u.username);

      setResults(normalized);
    } catch (e) {
      setSearchError(e?.response?.data?.message || e?.message || "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 20, backgroundColor: "#fff" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 34, fontWeight: "800" }}>Chat</Text>

        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: "#111" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>New chat</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={{ color: "red", marginTop: 12, fontWeight: "700" }}>{error}</Text>}

      {loading ? (
        <View style={{ marginTop: 20 }}>
          <ActivityIndicator />
        </View>
      ) : conversations.length === 0 ? (
        <Text style={{ marginTop: 14, color: "#777" }}>
          No conversations yet. Tap "New chat".
        </Text>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.otherUsername}
          contentContainerStyle={{ paddingTop: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openRoom(item.otherUsername)}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#eee",
              }}
            >
              <Text style={{ fontWeight: "900", fontSize: 16 }}>{item.otherUsername}</Text>
              <Text style={{ color: "#444", marginTop: 4 }} numberOfLines={1}>
                {item?.lastMessage?.text || ""}
              </Text>
            </TouchableOpacity>
          )}
          onRefresh={loadConversations}
          refreshing={loading}
        />
      )}

      {/* New Chat Modal */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 20, backgroundColor: "#fff" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "900" }}>Start new chat</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={{ fontWeight: "900", color: "#111" }}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search username..."
              autoCapitalize="none"
              style={{
                flex: 1,
                height: 46,
                borderWidth: 1,
                borderColor: "#eee",
                borderRadius: 14,
                paddingHorizontal: 12,
                backgroundColor: "#fafafa",
              }}
            />
            <TouchableOpacity
              onPress={searchUsers}
              disabled={!canSearch || searching}
              style={{
                width: 110,
                height: 46,
                borderRadius: 14,
                backgroundColor: !canSearch || searching ? "#bbb" : "#111",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {searching ? "..." : "Search"}
              </Text>
            </TouchableOpacity>
          </View>

          {!!searchError && <Text style={{ color: "red", marginTop: 10, fontWeight: "700" }}>{searchError}</Text>}

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingTop: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => openRoom(item.username)}
                style={{
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eee",
                }}
              >
                <Text style={{ fontWeight: "900" }}>{item.username}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ marginTop: 14, color: "#777" }}>
                Search a username to start a chat.
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}