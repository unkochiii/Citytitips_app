import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async () => {
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message);
    }
  };

  const goToSignUp = () => {
    navigation.navigate("signup"); 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

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
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.btn, isLoading && { opacity: 0.7 }]}
        onPress={onSubmit}
        disabled={isLoading}
      >
        <Text style={styles.btnText}>
          {isLoading ? "Loading..." : "Sign in"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goToSignUp}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#FAFAF0",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: {
    color: "white",
    fontWeight: "700",
  },
  error: {
    color: "crimson",
    textAlign: "center",
    marginBottom: 10,
  },
  link: {
    textAlign: "center",
    marginTop: 12,
    color: "#D35400",
    fontWeight: "600",
  },
});
