import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function ChatRoom() {
  const { id } = useLocalSearchParams(); // conversationId
  const { user } = useAuth();
  const username = useMemo(() => user?.account?.username || user?.username || "", [user]);

  const listRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      setError("");
      const res = await api.get(`/conversations/${id}/messages`);
      const data = Array.isArray(res.data) ? res.data : [];
      data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load messages");
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchMessages();
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 150);
    })();
  }, [fetchMessages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  const sendMessage = useCallback(async () => {
    const value = text.trim();
    if (!value || !id) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      senderUsername: username || "me",
      text: value,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    try {
      setSending(true);
      setError("");

      setMessages((prev) => [...prev, optimistic]);
      setText("");

      const res = await api.post(`/conversations/${id}/messages`, { text: value });

      setMessages((prev) => prev.map((m) => (m._id === tempId ? res.data : m)));
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Send failed");
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setText(value);
    } finally {
      setSending(false);
    }
  }, [text, id, username]);

  const renderItem = useCallback(
    ({ item }) => {
      const isMe = item.senderUsername === username;

      return (
        <View style={[styles.msgRow, isMe ? styles.right : styles.left]}>
          <View style={[styles.bubble, isMe ? styles.me : styles.other]}>
            {!isMe ? <Text style={styles.sender}>{item.senderUsername}</Text> : null}
            <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.text}</Text>
            <Text style={[styles.time, isMe && styles.timeMe]}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      );
    },
    [username]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.85}>
          <Text style={styles.headerBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerBtn} activeOpacity={0.85}>
          <Text style={styles.headerBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
        />
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          multiline
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={sending || !text.trim()}
          style={[styles.sendBtn, (sending || !text.trim()) && styles.sendBtnDisabled]}
          activeOpacity={0.85}
        >
          <Text style={styles.sendText}>{sending ? "…" : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F8" },

  header: {
    paddingTop: 60,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },
  headerBtn: {
    height: 36,
    minWidth: 64,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnText: { fontWeight: "900", color: "#111827" },

  error: {
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "700",
    paddingHorizontal: 12,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 12, paddingBottom: 12 },

  msgRow: { marginVertical: 6, flexDirection: "row" },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },

  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  other: { backgroundColor: "#fff", borderColor: "rgba(17,24,39,0.12)" },
  me: { backgroundColor: "#111827", borderColor: "#111827" },

  sender: { fontSize: 11, fontWeight: "900", color: "#6B7280", marginBottom: 4 },
  msgText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  msgTextMe: { color: "#fff" },
  time: { fontSize: 10, marginTop: 6, color: "#9CA3AF", alignSelf: "flex-end" },
  timeMe: { color: "rgba(255,255,255,0.65)" },

  composer: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  sendBtn: {
    width: 90,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "900" },
});
