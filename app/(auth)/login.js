// app/(auth)/login.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";

const Login = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { login: loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage("");

    // Validation basique
    if (!email || email.length < 3) {
      setErrorMessage("Email invalide");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Mot de passe trop court (min 6 caractères)");
      return;
    }

    try {
      setIsLoading(true);

      const response = await axios.post(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/user/login",
        { email, password }
      );

      console.log("Réponse login:", response.data);

      // ✅ CORRECTION : La structure est response.data.data.token
      if (response.data.success && response.data.data?.token) {
        // ✅ La réponse login a déjà la bonne structure : { token, user }
        const authData = {
          token: response.data.data.token,
          user: response.data.data.user,
        };

        console.log("AuthData préparé:", authData);

        await loginUser(authData);

        console.log("Login réussi, redirection...");

        if (params?.from) {
          router.replace(params.from);
        } else {
          router.replace("/");
        }
      } else {
        setErrorMessage("Un problème est survenu");
      }
    } catch (error) {
      console.log("Erreur login:", error);
      if (error.response) {
        setErrorMessage(
          error.response.data.message || "Identifiants incorrects"
        );
      } else {
        setErrorMessage("Erreur de connexion au serveur");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/5992373_1.jpg")}
      style={styles.background}
      resizeMode="repeat"
    >
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Se connecter</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mot de passe"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <Text style={styles.error}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(auth)/signup",
                params: { from: params?.from },
              })
            }
          >
            <Text style={styles.link}>Pas de compte ? Inscris-toi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 15,
    alignItems: "center",
    gap: 15,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    fontStyle: "italic",
  },
  form: {
    width: "100%",
    gap: 10,
    alignItems: "center",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  passwordInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    height: 50,
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: "#7fb8ff",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  error: {
    color: "rgb(212, 87, 87)",
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    color: "#007bff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  forgotLink: {
    color: "#666",
    fontSize: 14,
    marginTop: 5,
  },
});

export default Login;
