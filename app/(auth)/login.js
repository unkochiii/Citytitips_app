import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async () => {
    try {
      setError("");
      if (!email.trim() || !password) {
        setError("Email and password are required.");
        return;
      }
      await login(email.trim().toLowerCase(), password);
      // si ton app a une protection de routes, ça peut rediriger tout seul.
      // sinon, tu peux forcer :
      router.replace("/(tabs)");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Login failed";
      setError(msg);
    }
  };

  const goToSignUp = () => {
    router.push("/(auth)/signup");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(0,0,0,0.35)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(0,0,0,0.35)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
        />

        <TouchableOpacity
          style={[styles.btn, (isLoading || !email || !password) && { opacity: 0.7 }]}
          onPress={onSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{isLoading ? "Loading..." : "Sign in"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToSignUp} activeOpacity={0.85}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 40,
    textAlign: "center",
    color: "#000",
    letterSpacing: -0.5,
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
  error: {
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
    fontWeight: "600",
  },
  link: {
    textAlign: "center",
    marginTop: 20,
    color: "#FF6B6B",
    fontWeight: "700",
    fontSize: 15,
  },
});