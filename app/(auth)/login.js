// app/login.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { login: loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    try {
      if (email && email.length > 3 && password && password.length > 6) {
        const response = await axios.post(
          "https://api--tanjablabla--t4nqvl4d28d8.code.run/user/login",
          { email, password }
        );

        console.log("Réponse login:", response.data);

        if (response.data.token) {
          // ✅ CORRECTION : Passer l'objet complet response.data
          await loginUser(response.data);
          setErrorMessage("");

          console.log("Login réussi, redirection...");

          if (params?.from) {
            router.replace(params.from);
          } else {
            router.replace("/");
          }
        } else {
          setErrorMessage("Un problème est survenu");
        }
      } else {
        setErrorMessage("Email pas au bon format ou mot de passe trop court.");
      }
    } catch (error) {
      console.log("Erreur login:", error);
      if (error.response) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Erreur de connexion");
      }
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/5992373_1.jpg")}
      style={styles.background}
      resizeMode="repeat"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
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

            {errorMessage ? (
              <Text style={styles.error}>{errorMessage}</Text>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/signup",
                params: { from: params?.from },
              })
            }
          >
            <Text style={styles.link}>Pas de compte ? Inscris-toi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  // ... (styles inchangés)
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
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
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  error: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    color: "#007bff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

export default Login;
