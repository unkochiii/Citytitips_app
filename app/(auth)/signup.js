import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function SignUpScreen() {
    const { signup, isLoading } = useAuth();

    const [fullname, setFullname] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // optionnels (si ton backend les veut)
    const [birth, setBirth] = useState(""); // ex: "1998-02-14"
    const [genre, setGenre] = useState(""); // ex: "M" / "F" / ...
    const [favoriteGenres, setFavoriteGenres] = useState([]); // si tu fais une sélection plus tard

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const canSubmit = useMemo(() => {
        return (
            fullname.trim().length >= 2 &&
            username.trim().length >= 2 &&
            email.trim().includes("@") &&
            password.length >= 6
        );
    }, [fullname, username, email, password]);

    const onSubmit = async () => {
        setError("");

        // ✅ validations front (évite 403 inutiles)
        if (!fullname.trim() || !username.trim() || !email.trim() || !password) {
            setError("Please fill fullname, username, email and password.");
            return;
        }
        if (!email.includes("@")) {
            setError("Invalid email.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            setSubmitting(true);

            await signup({
                fullname: fullname.trim(),
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password,

                // champs optionnels (garde-les si ton backend les accepte)
                firstBookTitle: "",
                firstBookAuthor: "",
                secondBookTitle: "",
                secondBookAuthor: "",

                // styles: ton AuthContext.signup() prend favoriteGenres[0..2]
                favoriteGenres,

                // optionnels
                birth: birth.trim(),
                genre: genre.trim(),
            });
        } catch (e) {
            // ✅ affiche le message du backend (403)
            setError(e?.message || "Signup failed.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Sign up</Text>

                {!!error && <Text style={styles.error}>{error}</Text>}

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
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    secureTextEntry
                />

                {/* Optionnels - tu peux les enlever si tu veux */}
                <TextInput
                    style={styles.input}
                    placeholder="Birth (YYYY-MM-DD) - optional"
                    value={birth}
                    onChangeText={setBirth}
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Genre (M/F/...) - optional"
                    value={genre}
                    onChangeText={setGenre}
                    autoCapitalize="none"
                />

                <TouchableOpacity
                    onPress={onSubmit}
                    disabled={!canSubmit || submitting || isLoading}
                    style={[styles.button, (!canSubmit || submitting || isLoading) && styles.buttonDisabled]}
                >
                    <Text style={styles.buttonText}>
                        {submitting || isLoading ? "Creating..." : "Create account"}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.footer}>
                    Already have an account?{" "}
                    <Link href="/(auth)/login" style={styles.link}>
                        Login
                    </Link>
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: "#FAFAF0" },
    container: {
        flexGrow: 1,
        paddingHorizontal: 18,
        paddingTop: 80,
        paddingBottom: 40,
        backgroundColor: "#FAFAF0",
    },
    title: {
        fontSize: 34,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 14,
        color: "#111",
    },
    error: {
        textAlign: "center",
        color: "#C0392B",
        marginBottom: 12,
        fontSize: 13,
        fontWeight: "600",
    },
    input: {
        height: 54,
        borderWidth: 1,
        borderColor: "#E5E5E5",
        backgroundColor: "#fff",
        borderRadius: 14,
        paddingHorizontal: 14,
        marginBottom: 14,
        fontSize: 15,
    },
    button: {
        height: 56,
        borderRadius: 18,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
    footer: {
        marginTop: 16,
        textAlign: "center",
        color: "#444",
        fontSize: 13,
    },
    link: {
        color: "#D35400",
        fontWeight: "700",
    },
});
