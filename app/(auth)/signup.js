import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import axios from "axios";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";

const STEPS = ["Account", "Themes", "Favorites", "Review"];

const THEMES = [
  "Fantasy","Romance","Thriller","Mystery","History","Biography","Science Fiction",
  "Self-Help","Philosophy","Psychology","Business","Politics","Poetry","Comics",
  "Young Adult","Children","Travel","Cooking","Health","Religion","Art","Music","Sports","Technology",
];

const normalizeWorkKey = (k) =>
  k?.startsWith("/works/") ? k : k ? `/works/${k}` : null;

/** --- UI LOGIN STYLE COMPONENTS --- */
function PrimaryButton({ title, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && { opacity: 0.7 }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );
}

function SecondaryLink({ title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.link}>{title}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StepDots({ step }) {
  return (
    <View style={styles.progressRow}>
      {STEPS.map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i <= step ? styles.dotActive : styles.dotIdle,
            i === step && styles.dotCurrent,
          ]}
        />
      ))}
    </View>
  );
}

export default function SignUpScreen() {
  const { signup, isLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 0: account
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [birth, setBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1: themes
  const [themeQuery, setThemeQuery] = useState("");
  const [themes, setThemes] = useState([]);

  // Step 2: favorites
  const [favQuery, setFavQuery] = useState("");
  const [favLoading, setFavLoading] = useState(false);
  const [favResults, setFavResults] = useState([]);
  const [favBooks, setFavBooks] = useState([]);

  const accountValid = useMemo(() => {
    return (
      fullname.trim().length >= 2 &&
      username.trim().length >= 2 &&
      email.includes("@") &&
      password.length >= 6
    );
  }, [fullname, username, email, password]);

  const themesValid = themes.length === 3;
  const favValid = favBooks.length >= 3;

  const canGoNext = useMemo(() => {
    if (step === 0) return accountValid;
    if (step === 1) return themesValid;
    if (step === 2) return favValid;
    return true;
  }, [step, accountValid, themesValid, favValid]);

  const filteredThemes = useMemo(() => {
    const q = themeQuery.trim().toLowerCase();
    if (!q) return THEMES;
    return THEMES.filter((t) => t.toLowerCase().includes(q));
  }, [themeQuery]);

  const toggleTheme = useCallback((t) => {
    setThemes((prev) => {
      const exists = prev.includes(t);
      if (exists) return prev.filter((x) => x !== t);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, t];
    });
  }, []);

  const toggleFav = useCallback((b) => {
    const k = normalizeWorkKey(b?.key);
    if (!k) return;

    setFavBooks((prev) => {
      const exists = prev.some((x) => x.key === k);
      if (exists) return prev.filter((x) => x.key !== k);
      return [...prev, { ...b, key: k }];
    });
  }, []);

  const fetchFavResults = useCallback(async () => {
    const q = favQuery.trim();
    if (!q) {
      setFavResults([]);
      return;
    }

    try {
      setError("");
      setFavLoading(true);

      const res = await axios.get(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=20`
      );

      const docs = res?.data?.docs || [];
      const normalized = docs
        .map((d) => {
          const key = normalizeWorkKey(d?.key);
          const title = d?.title;
          const author = Array.isArray(d?.author_name) ? d.author_name[0] : null;
          const coverUrl = d?.cover_i
            ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
            : null;

          if (!key || !title) return null;
          return { key, title, author: author || "Unknown", coverUrl };
        })
        .filter(Boolean);

      setFavResults(normalized);
    } catch (e) {
      setFavResults([]);
      setError(e?.message || "Failed to search books");
    } finally {
      setFavLoading(false);
    }
  }, [favQuery]);

  const goToLogin = useCallback(() => {
    router.replace("/(auth)/login");
  }, []);

  const next = useCallback(() => {
    if (!canGoNext) return;
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [canGoNext]);

  const back = useCallback(() => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const onSubmit = useCallback(async () => {
    setError("");

    if (!accountValid) {
      setError("Complete account details.");
      setStep(0);
      return;
    }
    if (!themesValid) {
      setError("Pick exactly 3 themes.");
      setStep(1);
      return;
    }
    if (!favValid) {
      setError("Select at least 3 favorite books.");
      setStep(2);
      return;
    }

    const [t1, t2, t3] = themes;
    const [b1, b2, b3] = favBooks;

    const payload = {
      fullname,
      username,
      email,
      password,
      birth,

      firstStyle: t1,
      secondStyle: t2,
      thirdStyle: t3,
      genre: t1,

      firstBookTitle: b1?.title || "",
      firstBookAuthor: b1?.author || "",
      secondBookTitle: b2?.title || "",
      secondBookAuthor: b2?.author || "",

      thirdBookTitle: b3?.title || "",
      thirdBookAuthor: b3?.author || "",

      themes,
      favBooks,
    };

    try {
      setSubmitting(true);
      await signup(payload);
      Alert.alert("Success", "Account created!");
      router.replace("/(tabs)");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Signup failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    accountValid,
    themesValid,
    favValid,
    themes,
    favBooks,
    fullname,
    username,
    email,
    password,
    birth,
    signup,
  ]);

  const title = STEPS[step];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sign up</Text>

      <Text style={styles.stepTitle}>{title}</Text>
      <StepDots step={step} />

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* STEP 0: Account */}
      {step === 0 && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            value={fullname}
            onChangeText={setFullname}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Birth (YYYY-MM-DD) (optional)"
            value={birth}
            onChangeText={setBirth}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </>
      )}

      {/* STEP 1: Themes */}
      {step === 1 && (
        <>
          <Text style={styles.hintStrong}>Pick exactly 3 themes ({themes.length}/3)</Text>
          <TextInput
            style={styles.input}
            placeholder="Search themes…"
            value={themeQuery}
            onChangeText={setThemeQuery}
            autoCapitalize="none"
          />

          <View style={styles.chipsWrap}>
            {themes.map((t) => (
              <Chip key={t} label={t} selected onPress={() => toggleTheme(t)} />
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.chipsWrap}>
            {(themeQuery.trim() ? filteredThemes : filteredThemes.slice(0, 40)).map((t) => (
              <Chip
                key={t}
                label={t}
                selected={themes.includes(t)}
                onPress={() => toggleTheme(t)}
              />
            ))}
          </View>
        </>
      )}

      {/* STEP 2: Favorites */}
      {step === 2 && (
        <>
          <Text style={styles.hintStrong}>Select at least 3 favorite books ({favBooks.length}/3)</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Search by title…"
              value={favQuery}
              onChangeText={setFavQuery}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.smallBtn, (favLoading || !favQuery.trim()) && { opacity: 0.6 }]}
              onPress={fetchFavResults}
              disabled={favLoading || !favQuery.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.smallBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          {favLoading && (
            <View style={{ paddingTop: 12 }}>
              <ActivityIndicator />
            </View>
          )}

          <View style={[styles.chipsWrap, { marginTop: 12 }]}>
            {favBooks.map((b) => (
              <Chip
                key={b.key}
                label={b.title.length > 22 ? `${b.title.slice(0, 22)}…` : b.title}
                selected
                onPress={() => toggleFav(b)}
              />
            ))}
          </View>

          <View style={styles.divider} />

          {favResults.length === 0 ? (
            <Text style={styles.hint}>Search a book title, then tap results to select.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {favResults.map((b) => {
                const selected = favBooks.some((x) => x.key === b.key);
                return (
                  <TouchableOpacity
                    key={b.key}
                    activeOpacity={0.85}
                    onPress={() => toggleFav(b)}
                    style={[styles.resultRow, selected && styles.resultRowSelected]}
                  >
                    {b.coverUrl ? (
                      <Image source={{ uri: b.coverUrl }} style={styles.resultCover} />
                    ) : (
                      <View style={[styles.resultCover, { backgroundColor: "#eee" }]} />
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {b.title}
                      </Text>
                      <Text style={styles.resultAuthor} numberOfLines={1}>
                        {b.author}
                      </Text>
                    </View>

                    <Text style={[styles.pickMark, selected && styles.pickMarkSelected]}>
                      {selected ? "✓" : "+"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <>
          <View style={styles.reviewBox}>
            <Text style={styles.reviewLine}>
              <Text style={styles.reviewKey}>Username: </Text>
              {username}
            </Text>
            <Text style={styles.reviewLine}>
              <Text style={styles.reviewKey}>Email: </Text>
              {email}
            </Text>
            <Text style={styles.reviewLine}>
              <Text style={styles.reviewKey}>Themes: </Text>
              {themes.join(", ")}
            </Text>
            <Text style={styles.reviewLine}>
              <Text style={styles.reviewKey}>Favorites: </Text>
              {favBooks.slice(0, 3).map((b) => b.title).join(", ")}
              {favBooks.length > 3 ? "…" : ""}
            </Text>
          </View>

          <PrimaryButton
            title={submitting || isLoading ? "Loading..." : "Create account"}
            onPress={onSubmit}
            disabled={submitting || isLoading}
            style={{ marginTop: 10 }}
          />
        </>
      )}

      {/* Footer buttons */}
      <View style={styles.footerRow}>
        {step < 3 ? (
          <>
            <PrimaryButton
              title={step === 2 ? "Review" : "Next"}
              onPress={next}
              disabled={!canGoNext || submitting || isLoading}
              style={{ flex: 1 }}
            />
            <TouchableOpacity onPress={goToLogin} activeOpacity={0.85}>
              <Text style={[styles.link, { marginTop: 0 }]}>Login</Text>
            </TouchableOpacity>
          </>
        ) : (
          <SecondaryLink title="Back to login" onPress={goToLogin} />
        )}
      </View>

      <SecondaryLink title="Already have an account? Login" onPress={goToLogin} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // === LOGIN UI ===
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
    color: "#000",
    letterSpacing: -0.5,
  },
  stepTitle: {
    textAlign: "center",
    marginBottom: 8,
    color: "#000",
    fontWeight: "800",
    fontSize: 14,
    opacity: 0.55,
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderWidth: 0,
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    fontSize: 16,
    color: "#000",
  },
  btn: {
    backgroundColor: "#FF6B6B",
    padding: 18,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  btnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  link: {
    textAlign: "center",
    marginTop: 20,
    color: "#FF6B6B",
    fontWeight: "700",
    fontSize: 15,
  },
  error: {
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
    fontWeight: "600",
  },

  // progress
  progressRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { backgroundColor: "#FF6B6B" },
  dotIdle: { backgroundColor: "rgba(0,0,0,0.12)" },
  dotCurrent: { transform: [{ scale: 1.25 }] },

  // chips
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F8F8F8",
  },
  chipIdle: { opacity: 1 },
  chipSelected: { backgroundColor: "rgba(255,107,107,0.20)" },
  chipText: { fontWeight: "700", fontSize: 12, color: "#000", opacity: 0.85 },
  chipTextSelected: { color: "#FF6B6B", opacity: 1 },

  hintStrong: { fontWeight: "800", marginBottom: 10, color: "#000", opacity: 0.65 },
  hint: { color: "#000", opacity: 0.55, marginBottom: 10 },

  divider: { height: 12 },

  // favorites results
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
  },
  resultRowSelected: {
    backgroundColor: "rgba(255,107,107,0.18)",
  },
  resultCover: { width: 42, height: 60, borderRadius: 10 },
  resultTitle: { fontWeight: "800", color: "#000" },
  resultAuthor: { color: "#000", opacity: 0.55 },
  pickMark: { fontWeight: "900", color: "#000", opacity: 0.35, fontSize: 18 },
  pickMarkSelected: { color: "#FF6B6B", opacity: 1 },

  // search row
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  smallBtn: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  smallBtnText: { color: "white", fontWeight: "800" },

  // review
  reviewBox: {
    backgroundColor: "#F8F8F8",
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  reviewLine: { color: "#000", marginBottom: 8 },
  reviewKey: { fontWeight: "900" },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
});