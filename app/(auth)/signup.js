// app/signup.js
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
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../context/AuthContext";

const CITIES = [
  "Tanger",
  "Tétouan",
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fès",
  "Meknès",
  "Agadir",
  "Oujda",
  "Kenitra",
  "El Jadida",
  "Safi",
  "Mohammedia",
  "Khouribga",
  "Béni Mellal",
  "Nador",
  "Taza",
  "Settat",
  "Berrechid",
  "Khemisset",
  "Larache",
  "Ksar El Kebir",
  "Guelmim",
  "Errachidia",
  "Ouarzazate",
];

const Signup = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { login: loginUser } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!username || !email || !password || !city) {
      setErrorMessage("Tous les champs sont obligatoires");
      return;
    }

    try {
      setIsLoading(true);

      const response = await axios.post(
        "https://api--tanjablabla--t4nqvl4d28d8.code.run/user/signup",
        {
          email,
          username,
          password,
          city,
        }
      );

      console.log("Réponse signup:", response.data);

      if (response.data.token) {
        // ✅ CORRECT : Passer l'objet complet response.data
        await loginUser(response.data);

        console.log("Signup réussi, redirection...");

        if (params?.from) {
          router.replace(params.from);
        } else {
          router.replace("/");
        }
      } else {
        setErrorMessage("Un problème est survenu...");
      }
    } catch (error) {
      console.log("Erreur signup:", error);
      if (error.response) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Erreur de connexion au serveur");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ IL MANQUAIT TOUT ÇA !
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
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>S'inscrire</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nom d'utilisateur"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

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

              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                autoCapitalize="none"
              />

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={city}
                  onValueChange={(itemValue) => setCity(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  <Picker.Item
                    label="-- Sélectionne ta ville --"
                    value=""
                    color="#999"
                  />
                  {CITIES.map((cityName) => (
                    <Picker.Item
                      key={cityName}
                      label={cityName}
                      value={cityName}
                    />
                  ))}
                </Picker>
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
                  <Text style={styles.buttonText}>S'inscrire</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/login",
                  params: { from: params?.from },
                })
              }
            >
              <Text style={styles.link}>Déjà un compte ? Connecte-toi !</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
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
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: Platform.OS === "ios" ? 150 : 50,
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
});

export default Signup;
