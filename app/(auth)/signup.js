import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";

// Configuration et constants
const API_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";
const CITIES = ["Tanger", "Thue & Mue"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;

const Signup = memo(() => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login: loginUser } = useAuth();

  // États
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validation email (useCallback évite de recréer la fonction à chaque rendu)
  const validateEmail = useCallback((email) => EMAIL_REGEX.test(email), []);

  // Gestion centralisée des erreurs
  const handleError = useCallback(
    (error) => {
      console.error("Erreur signup:", error.response?.data || error.message);

      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (status === 401) {
        Alert.alert(
          "Session expirée",
          "Votre session a expiré. Veuillez vous reconnecter.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
        return;
      }

      if (status === 409) {
        setErrorMessage("Cet email est déjà utilisé");
      } else if (status === 400) {
        setErrorMessage(serverMessage || "Données invalides");
      } else if (status >= 500) {
        // Log details for debugging and show a clear (but informative) message to the user
        console.error("Server error details:", serverMessage);
        setErrorMessage(
          serverMessage
            ? `Erreur serveur: ${serverMessage}`
            : "Erreur serveur. Réessayez plus tard."
        );
      } else if (serverMessage) {
        // If backend returned a message but status isn't covered above, show it
        setErrorMessage(serverMessage);
      } else {
        setErrorMessage("Erreur de connexion au serveur. Réessayez.");
      }
    },
    [router]
  );

  // Fonction de soumission (useCallback évite de recréer la fonction à chaque rendu)
  const handleSubmit = useCallback(async () => {
    // Reset message
    setErrorMessage("");

    // Validation frontend robuste
    const trimmedUsername = username.trim();
    const trimmedEmail = email.toLowerCase().trim();
    const trimmedCity = city.trim();

    if (!trimmedUsername || !trimmedEmail || !password || !trimmedCity) {
      setErrorMessage("Tous les champs sont obligatoires");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setErrorMessage("Format d'email invalide");
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      setErrorMessage(
        `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`
      );
      return;
    }

    try {
      setIsLoading(true);

      // ✅ DONNÉES NORMALISÉES avant envoi (comme le backend les attend)
      const payload = {
        email: trimmedEmail,
        username: trimmedUsername,
        password,
        city: trimmedCity.toLowerCase(), // IMPORTANT : normaliser la ville
      };

      const response = await axios.post(`${API_URL}/user/signup`, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000, // Timeout pour éviter les blocages
      });

      console.log("Réponse signup:", response.data);

      // ✅ CORRECTION : Structure de réponse correcte du backend
      if (response.data.success && response.data.token) {
        const authData = {
          token: response.data.token,
          user: {
            _id: response.data._id,
            username: response.data.account?.username || trimmedUsername,
            email: response.data.email || trimmedEmail,
            city: response.data.location?.city || trimmedCity.toLowerCase(),
            roles: response.data.roles || ["user"],
            avatar: response.data.account?.avatar || null,
            isCommerce: response.data.isCommerce || false,
            isAdmin: response.data.isAdmin || false,
          },
        };

        await loginUser(authData);

        Alert.alert("Succès", "Inscription réussie ! Bienvenue.", [
          { text: "OK", onPress: () => router.replace(params?.from || "/") },
        ]);
      } else {
        setErrorMessage(response.data.message || "Un problème est survenu");
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [
    username,
    email,
    password,
    city,
    validateEmail,
    loginUser,
    router,
    params?.from,
    handleError,
  ]);

  // ✅ CORRECTION : Pas besoin de useMemo ici, calcul simple direct
  // useMemo était potentiellement source de confusion et inutile pour un calcul si simple
  const canSubmit =
    username.trim() !== "" &&
    email.trim() !== "" &&
    password.length >= PASSWORD_MIN_LENGTH &&
    city !== "";

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
          <Text style={styles.title}>S'inscrire</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur *"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />

            <TextInput
              style={styles.input}
              placeholder="Email *"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={`Mot de passe * (min ${PASSWORD_MIN_LENGTH})`}
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                minLength={PASSWORD_MIN_LENGTH}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={city}
                onValueChange={(itemValue) => setCity(itemValue)}
                style={styles.picker}
                dropdownIconColor="#666"
                mode="dropdown"
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
              style={[
                styles.button,
                (!canSubmit || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() =>
              router.push({
                pathname: "/(auth)/login",
                params: { from: params?.from },
              })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.link}>Déjà un compte ? Connecte-toi !</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
});

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
    color: "#333",
  },
  form: {
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fafafa",
    color: "#333",
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
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: "#fafafa",
    color: "#333",
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: Platform.OS === "ios" ? 150 : 50,
    color: "#333",
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: "#7fb8ff",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkContainer: {
    marginTop: 10,
    paddingVertical: 10,
  },
  link: {
    color: "#007bff",
    fontSize: 14,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  error: {
    color: "#e74c3c",
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
  },
});

export default Signup;
