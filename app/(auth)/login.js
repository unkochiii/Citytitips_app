import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function LogInScreen() {
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const onSubmit = async () => {
        setError("");
        try {
            await login(email.trim(), password);
        } catch (e) {
            setError(e.message || "Erreur de connexion");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.btn} onPress={onSubmit} disabled={isLoading}>
                <Text style={styles.btnText}>{isLoading ? "..." : "Sign in"}</Text>
            </TouchableOpacity>

            <Link href="/(auth)/signup" style={styles.link}>
                No account? Create one
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#FAFAF0" },
    title: { fontSize: 22, fontWeight: "700", marginBottom: 16, textAlign: "center" },
    input: { backgroundColor: "white", borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10, marginBottom: 10 },
    btn: { backgroundColor: "#000", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 6 },
    btnText: { color: "white", fontWeight: "700" },
    link: { textAlign: "center", marginTop: 12, color: "#D35400", fontWeight: "600" },
    error: { color: "crimson", textAlign: "center", marginBottom: 10 },
});
