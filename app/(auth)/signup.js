// import React, { useCallback, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Image,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import axios from "axios";
// import { router } from "expo-router";

// import { useAuth } from "../../context/AuthContext";
// import { GENRES } from "../../constants/genres";
// import { setUserFavBooks, setUserThemes } from "../../utils/preferences";

// import Chip from "../../components/ui/Chip";
// import PrimaryButton from "../../components/ui/PrimaryButton";
// import Surface from "../../components/ui/Surface";
// import { Colors } from "../../components/ui/tokens";

// const STEPS = ["Account", "Themes", "Favorites", "Review"];

// const normalizeWorkKey = (k) =>
//   k?.startsWith("/works/") ? k : k ? `/works/${k}` : null;

// export default function SignUpScreen() {
//   const { signup, isLoading } = useAuth();

//   const [step, setStep] = useState(0);
//   const [error, setError] = useState("");
//   const [submitting, setSubmitting] = useState(false);

//   // Step 1: account
//   const [fullname, setFullname] = useState("");
//   const [username, setUsername] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [birth, setBirth] = useState("");

//   // Step 2: themes
//   const [themeQuery, setThemeQuery] = useState("");
//   const [themes, setThemes] = useState([]); // exactly 3

//   // Step 3: favorites
//   const [favQuery, setFavQuery] = useState("");
//   const [favLoading, setFavLoading] = useState(false);
//   const [favResults, setFavResults] = useState([]);
//   const [favBooks, setFavBooks] = useState([]); // min 3

//   const accountValid = useMemo(() => {
//     return fullname && username && email.includes("@") && password.length >= 6;
//   }, [fullname, username, email, password]);

//   const themesValid = themes.length === 3;
//   const favValid = favBooks.length >= 3;

//   const canGoNext = useMemo(() => {
//     if (step === 0) return accountValid;
//     if (step === 1) return themesValid;
//     if (step === 2) return favValid;
//     return true;
//   }, [step, accountValid, themesValid, favValid]);

//   const filteredGenres = useMemo(() => {
//     const q = themeQuery.trim().toLowerCase();
//     if (!q) return GENRES;
//     return GENRES.filter((g) => g.toLowerCase().includes(q));
//   }, [themeQuery]);

//   const toggleTheme = useCallback(
//     (g) => {
//       setThemes((prev) => {
//         const exists = prev.includes(g);
//         if (exists) return prev.filter((x) => x !== g);
//         if (prev.length >= 3) return prev; // exactly 3
//         return [...prev, g];
//       });
//     },
//     [setThemes]
//   );

//   const toggleFav = useCallback((b) => {
//     const k = normalizeWorkKey(b?.key);
//     if (!k) return;

//     setFavBooks((prev) => {
//       const exists = prev.some((x) => x.key === k);
//       if (exists) return prev.filter((x) => x.key !== k);
//       return [...prev, { ...b, key: k }];
//     });
//   }, []);

//   const fetchFavResults = useCallback(async () => {
//     const q = favQuery.trim();
//     if (!q) {
//       setFavResults([]);
//       return;
//     }

//     try {
//       setFavLoading(true);
//       const res = await axios.get(
//         `https://openlibrary.org/search.json?title=${encodeURIComponent(
//           q
//         )}&limit=20`
//       );

//       const docs = res?.data?.docs || [];
//       const normalized = docs
//         .map((d) => {
//           const key = normalizeWorkKey(d?.key);
//           const title = d?.title;
//           const author = Array.isArray(d?.author_name)
//             ? d.author_name[0]
//             : null;
//           const coverUrl = d?.cover_i
//             ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
//             : null;

//           if (!key || !title) return null;

//           return { key, title, author: author || "Unknown", coverUrl };
//         })
//         .filter(Boolean);

//       setFavResults(normalized);
//     } catch (e) {
//       setFavResults([]);
//       setError(e?.message || "Failed to search books");
//     } finally {
//       setFavLoading(false);
//     }
//   }, [favQuery]);

//   const next = useCallback(() => {
//     if (!canGoNext) return;
//     setStep((s) => Math.min(s + 1, STEPS.length - 1));
//   }, [canGoNext]);

//   const back = useCallback(() => {
//     setError("");
//     setStep((s) => Math.max(s - 1, 0));
//   }, []);

//   const onSubmit = useCallback(async () => {
//     setError("");

//     if (!accountValid) {
//       setError("Please complete your account details.");
//       setStep(0);
//       return;
//     }
//     if (!themesValid) {
//       setError("Please pick exactly 3 themes.");
//       setStep(1);
//       return;
//     }
//     if (!favValid) {
//       setError("Please select at least 3 favorite books.");
//       setStep(2);
//       return;
//     }

//     const [t1, t2, t3] = themes;
//     const [b1, b2, b3] = favBooks;

//     const payload = {
//       fullname,
//       username,
//       email,
//       password,
//       birth,

//       // legacy fields (keep backend compatibility)
//       firstStyle: t1,
//       secondStyle: t2,
//       thirdStyle: t3,
//       genre: t1,

//       firstBookTitle: b1?.title || "",
//       firstBookAuthor: b1?.author || "",
//       secondBookTitle: b2?.title || "",
//       secondBookAuthor: b2?.author || "",

//       // new fields (backend can adopt later)
//       thirdBookTitle: b3?.title || "",
//       thirdBookAuthor: b3?.author || "",
//       themes,
//       favBooks,
//     };

//     try {
//       setSubmitting(true);
//       await signup(payload);

//       // store locally for personalization (fallback)
//       await setUserThemes(themes);
//       await setUserFavBooks(favBooks);
//     } catch (e) {
//       const msg = e?.response?.data?.message || e?.message || "Signup failed";
//       setError(msg);
//     } finally {
//       setSubmitting(false);
//     }
//   }, [
//     accountValid,
//     birth,
//     email,
//     favBooks,
//     favValid,
//     fullname,
//     password,
//     signup,
//     themes,
//     themesValid,
//     username,
//   ]);

//   const goToLogin = useCallback(() => {
//     router.replace("/(auth)/login");
//   }, []);

//   const title = STEPS[step];

//   return (
//     <ScrollView
//       contentContainerStyle={styles.container}
//       keyboardShouldPersistTaps="handled"
//     >
//       <View style={styles.headerRow}>
//         <TouchableOpacity
//           onPress={step === 0 ? goToLogin : back}
//           style={styles.backBtn}
//         >
//           <Text style={{ fontWeight: "900" }}>
//             {step === 0 ? "Login" : "Back"}
//           </Text>
//         </TouchableOpacity>
//         <Text style={styles.h1}>Sign Up</Text>
//         <View style={{ width: 64 }} />
//       </View>

//       <Text style={styles.stepTitle}>{title}</Text>

//       <View style={styles.progressRow}>
//         {STEPS.map((s, i) => (
//           <View
//             key={s}
//             style={[
//               styles.dot,
//               i <= step ? styles.dotActive : styles.dotIdle,
//               i === step && styles.dotCurrent,
//             ]}
//           />
//         ))}
//       </View>

//       {!!error && <Text style={styles.error}>{error}</Text>}

//       {step === 0 && (
//         <Surface>
//           <Text style={styles.label}>Full name</Text>
//           <TextInput
//             style={styles.input}
//             value={fullname}
//             onChangeText={setFullname}
//             placeholder="Jane Doe"
//           />

//           <Text style={styles.label}>Username</Text>
//           <TextInput
//             style={styles.input}
//             value={username}
//             onChangeText={setUsername}
//             placeholder="janedoe"
//             autoCapitalize="none"
//           />

//           <Text style={styles.label}>Email</Text>
//           <TextInput
//             style={styles.input}
//             value={email}
//             onChangeText={setEmail}
//             placeholder="jane@domain.com"
//             keyboardType="email-address"
//             autoCapitalize="none"
//           />

//           <Text style={styles.label}>Password</Text>
//           <TextInput
//             style={styles.input}
//             value={password}
//             onChangeText={setPassword}
//             placeholder="Min 6 characters"
//             secureTextEntry
//           />

//           <Text style={styles.label}>Birth (optional)</Text>
//           <TextInput
//             style={styles.input}
//             value={birth}
//             onChangeText={setBirth}
//             placeholder="YYYY-MM-DD"
//           />

//           <Text style={styles.hint}>Next: pick exactly 3 themes.</Text>
//         </Surface>
//       )}

//       {step === 1 && (
//         <>
//           <Surface style={{ marginBottom: 12 }}>
//             <Text style={styles.hintStrong}>
//               Pick exactly 3 themes ({themes.length}/3)
//             </Text>
//             <TextInput
//               style={styles.input}
//               value={themeQuery}
//               onChangeText={setThemeQuery}
//               placeholder="Search themes (e.g. Fantasy, History…)"
//               autoCapitalize="none"
//             />

//             <View style={styles.chipsWrap}>
//               {themes.map((t) => (
//                 <Chip
//                   key={t}
//                   label={t}
//                   selected
//                   onPress={() => toggleTheme(t)}
//                 />
//               ))}
//             </View>
//           </Surface>

//           <Surface>
//             <View style={styles.chipsWrap}>
//               {(themeQuery.trim()
//                 ? filteredGenres
//                 : filteredGenres.slice(0, 60)
//               ).map((g) => (
//                 <Chip
//                   key={g}
//                   label={g}
//                   selected={themes.includes(g)}
//                   onPress={() => toggleTheme(g)}
//                 />
//               ))}
//             </View>
//             <Text style={styles.hint}>
//               Tip: use the search box to find a theme faster.
//             </Text>
//           </Surface>
//         </>
//       )}

//       {step === 2 && (
//         <>
//           <Surface style={{ marginBottom: 12 }}>
//             <Text style={styles.hintStrong}>
//               Select at least 3 favorite books ({favBooks.length}/3)
//             </Text>

//             <View style={{ flexDirection: "row", gap: 10 }}>
//               <TextInput
//                 style={[styles.input, { flex: 1, marginBottom: 0 }]}
//                 value={favQuery}
//                 onChangeText={setFavQuery}
//                 placeholder="Search by title…"
//                 autoCapitalize="none"
//               />
//               <View style={{ width: 110 }}>
//                 <PrimaryButton
//                   title="Search"
//                   onPress={fetchFavResults}
//                   disabled={favLoading || !favQuery.trim()}
//                 />
//               </View>
//             </View>

//             {favLoading && (
//               <View style={{ paddingTop: 12 }}>
//                 <ActivityIndicator />
//               </View>
//             )}

//             <View style={[styles.chipsWrap, { marginTop: 12 }]}>
//               {favBooks.map((b) => (
//                 <Chip
//                   key={b.key}
//                   label={
//                     b.title.length > 22 ? `${b.title.slice(0, 22)}…` : b.title
//                   }
//                   selected
//                   onPress={() => toggleFav(b)}
//                 />
//               ))}
//             </View>
//           </Surface>

//           <Surface>
//             {favResults.length === 0 ? (
//               <Text style={styles.hint}>
//                 Search a book title, then tap results to select.
//               </Text>
//             ) : (
//               <View style={{ gap: 10 }}>
//                 {favResults.map((b) => {
//                   const selected = favBooks.some((x) => x.key === b.key);
//                   return (
//                     <TouchableOpacity
//                       key={b.key}
//                       activeOpacity={0.85}
//                       onPress={() => toggleFav(b)}
//                       style={[
//                         styles.resultRow,
//                         selected && styles.resultRowSelected,
//                       ]}
//                     >
//                       {b.coverUrl ? (
//                         <Image
//                           source={{ uri: b.coverUrl }}
//                           style={styles.resultCover}
//                         />
//                       ) : (
//                         <View
//                           style={[
//                             styles.resultCover,
//                             { backgroundColor: "#eee" },
//                           ]}
//                         />
//                       )}
//                       <View style={{ flex: 1 }}>
//                         <Text
//                           style={{ fontWeight: "900", color: Colors.text }}
//                           numberOfLines={1}
//                         >
//                           {b.title}
//                         </Text>
//                         <Text style={{ color: Colors.muted }} numberOfLines={1}>
//                           {b.author}
//                         </Text>
//                       </View>
//                       <Text
//                         style={{
//                           fontWeight: "900",
//                           color: selected ? Colors.success : Colors.muted,
//                         }}
//                       >
//                         {selected ? "✓" : "+"}
//                       </Text>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>
//             )}
//           </Surface>
//         </>
//       )}

//       {step === 3 && (
//         <>
//           <Surface style={{ marginBottom: 12 }}>
//             <Text style={styles.hintStrong}>Review</Text>
//             <Text style={styles.reviewRow}>
//               <Text style={styles.reviewKey}>Username: </Text>
//               {username}
//             </Text>
//             <Text style={styles.reviewRow}>
//               <Text style={styles.reviewKey}>Email: </Text>
//               {email}
//             </Text>
//             <Text style={styles.reviewRow}>
//               <Text style={styles.reviewKey}>Themes: </Text>
//               {themes.join(", ")}
//             </Text>
//             <Text style={styles.reviewRow}>
//               <Text style={styles.reviewKey}>Favorites: </Text>
//               {favBooks
//                 .slice(0, 3)
//                 .map((b) => b.title)
//                 .join(", ")}
//               {favBooks.length > 3 ? "…" : ""}
//             </Text>
//           </Surface>

//           <PrimaryButton
//             title={submitting || isLoading ? "Creating…" : "Create account"}
//             onPress={onSubmit}
//             disabled={submitting || isLoading}
//           />
//         </>
//       )}

//       <View style={styles.footerRow}>
//         {step < 3 ? (
//           <>
//             <PrimaryButton
//               title={step === 2 ? "Review" : "Next"}
//               onPress={next}
//               disabled={!canGoNext || submitting || isLoading}
//               style={{ flex: 1 }}
//             />
//             <PrimaryButton
//               title="Login"
//               variant="secondary"
//               onPress={goToLogin}
//               style={{ width: 110 }}
//             />
//           </>
//         ) : (
//           <PrimaryButton
//             title="Back to login"
//             variant="secondary"
//             onPress={goToLogin}
//           />
//         )}
//       </View>

//       <Text style={styles.bottomLink}>
//         Already have an account?{" "}
//         <Text style={styles.bottomLinkStrong} onPress={goToLogin}>
//           Login
//         </Text>
//       </Text>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 16,
//     paddingTop: 70,
//     backgroundColor: Colors.bg,
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 10,
//   },
//   backBtn: {
//     width: 64,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: Colors.surface,
//     borderWidth: 1,
//     borderColor: Colors.line,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   h1: { fontSize: 22, fontWeight: "900", color: Colors.text },
//   stepTitle: {
//     fontSize: 16,
//     fontWeight: "800",
//     color: Colors.muted,
//     marginBottom: 10,
//   },

//   progressRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
//   dot: { width: 10, height: 10, borderRadius: 5 },
//   dotActive: { backgroundColor: Colors.text },
//   dotIdle: { backgroundColor: "rgba(0,0,0,0.12)" },
//   dotCurrent: { transform: [{ scale: 1.2 }] },

//   label: {
//     fontSize: 12,
//     fontWeight: "800",
//     color: Colors.muted,
//     marginTop: 10,
//     marginBottom: 6,
//   },
//   input: {
//     height: 44,
//     borderRadius: 12,
//     backgroundColor: Colors.surface,
//     borderWidth: 1,
//     borderColor: Colors.line,
//     paddingHorizontal: 12,
//     marginBottom: 10,
//   },

//   error: {
//     color: Colors.danger,
//     textAlign: "center",
//     marginBottom: 10,
//     fontWeight: "700",
//   },
//   hint: { marginTop: 10, color: Colors.muted },
//   hintStrong: { color: Colors.text, fontWeight: "900", marginBottom: 10 },

//   chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

//   resultRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//     padding: 10,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: Colors.line,
//     backgroundColor: Colors.surface,
//   },
//   resultRowSelected: {
//     borderColor: "rgba(22,163,74,0.35)",
//     backgroundColor: "rgba(22,163,74,0.06)",
//   },
//   resultCover: { width: 42, height: 60, borderRadius: 8 },

//   reviewRow: { marginTop: 8, color: Colors.text },
//   reviewKey: { fontWeight: "900" },

//   footerRow: { flexDirection: "row", gap: 10, marginTop: 14 },

//   bottomLink: { textAlign: "center", marginTop: 16, color: Colors.muted },
//   bottomLinkStrong: { color: Colors.text, fontWeight: "900" },
// });
