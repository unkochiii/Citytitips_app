// app/(auth)/forgot-password.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Alert,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";

const ForgotPassword = () => {
  const router = useRouter();
  const { login: loginUser } = useAuth();

  // États pour les étapes
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password

  // États des champs
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

  // États UI
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [showPassword, setShowPassword] = useState(false);

  // Refs pour les inputs du code
  const codeInputs = useRef([]);

  // Timer pour renvoyer le code
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // ========== ÉTAPE 1: Envoyer l'email ==========
  const handleSendCode = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !email.includes("@")) {
      setErrorMessage("Veuillez entrer un email valide");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/user/forgot-password`, {
        email: email.trim(),
      });

      // ✅ CORRECTION : Accéder au message correctement
      const message =
        response.data.message || response.data.data?.message || "Code envoyé !";

      console.log("✅ Forgot password response:", response.data);

      setSuccessMessage(message);
      setStep(2);
      setResendTimer(60);
    } catch (error) {
      console.log("Forgot password error:", error.response?.data);
      if (error.response) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Erreur de connexion au serveur");
      }
    } finally {
      setLoading(false);
    }
  };

  // ========== ÉTAPE 2: Vérifier le code ==========
  const handleCodeChange = (text, index) => {
    // Accepter seulement les chiffres
    if (text && !/^\d+$/.test(text)) return;

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus sur le prochain input
    if (text && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }

    // Auto-submit quand tous les chiffres sont entrés
    if (text && index === 5 && newCode.every((digit) => digit !== "")) {
      handleVerifyCode(newCode.join(""));
    }
  };

  const handleCodeKeyPress = (e, index) => {
    // Retour arrière pour aller à l'input précédent
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (fullCode = code.join("")) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (fullCode.length !== 6) {
      setErrorMessage("Veuillez entrer le code à 6 chiffres");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/user/verify-code`, {
        email: email.trim(),
        code: fullCode,
      });

      // ✅ DEBUG : Voir la réponse complète
      console.log("========== DEBUG VERIFY CODE ==========");
      console.log("Response:", JSON.stringify(response.data, null, 2));
      console.log("=======================================");

      // ✅ CORRECTION : Accéder à response.data.data
      const apiData = response.data.data || response.data;

      console.log("ResetToken reçu:", apiData.resetToken);

      if (!apiData.resetToken) {
        setErrorMessage("Erreur: Token non reçu du serveur");
        return;
      }

      setSuccessMessage("Code vérifié !");
      setResetToken(apiData.resetToken); // ✅ CORRIGÉ
      setStep(3);
    } catch (error) {
      console.log("Verify code error:", error);
      console.log("Error response:", error.response?.data);

      if (error.response) {
        setErrorMessage(error.response.data.message);
        if (error.response.data.attemptsLeft !== undefined) {
          setAttemptsLeft(error.response.data.attemptsLeft);
        }
        if (error.response.status === 429) {
          setStep(1);
          setCode(["", "", "", "", "", ""]);
          setAttemptsLeft(5);
        }
      } else {
        setErrorMessage("Erreur de connexion au serveur");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setCode(["", "", "", "", "", ""]);
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/user/forgot-password`, {
        email: email.trim(),
      });

      setSuccessMessage("Nouveau code envoyé !");
      setResendTimer(60);
      setAttemptsLeft(5);
    } catch (error) {
      setErrorMessage("Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  // ========== ÉTAPE 3: Nouveau mot de passe ==========
  const handleResetPassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (newPassword.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas");
      return;
    }

    // ✅ Vérifier que le resetToken existe
    if (!resetToken) {
      setErrorMessage("Session expirée. Veuillez recommencer.");
      setStep(1);
      return;
    }

    setLoading(true);

    console.log("========== DEBUG RESET PASSWORD ==========");
    console.log("Email:", email.trim());
    console.log("ResetToken:", resetToken);
    console.log("==========================================");

    try {
      const response = await axios.post(`${API_URL}/user/reset-password`, {
        email: email.trim(),
        resetToken: resetToken,
        newPassword: newPassword,
      });

      console.log("✅ Reset response:", response.data);

      // ✅ CORRECTION : Accéder à response.data.data
      const apiData = response.data.data || response.data;
      const message = response.data.message || "Mot de passe modifié !";

      setSuccessMessage(message);

      if (apiData.token) {
        await loginUser({
          token: apiData.token,
          email: email,
        });

        Alert.alert(
          "Succès",
          "Votre mot de passe a été modifié. Vous êtes maintenant connecté.",
          [{ text: "OK", onPress: () => router.replace("/") }]
        );
      } else {
        Alert.alert(
          "Succès",
          "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      }
    } catch (error) {
      console.log("========== DEBUG ERROR ==========");
      console.log("Status:", error.response?.status);
      console.log("Data:", JSON.stringify(error.response?.data, null, 2));
      console.log("=================================");

      if (error.response) {
        setErrorMessage(error.response.data.message);
        if (
          error.response.data.message?.includes("expiré") ||
          error.response.data.message?.includes("invalide")
        ) {
          setStep(1);
          setCode(["", "", "", "", "", ""]);
          setResetToken("");
        }
      } else {
        setErrorMessage("Erreur de connexion au serveur");
      }
    } finally {
      setLoading(false);
    }
  };

  // ========== RENDU DES ÉTAPES ==========
  const renderStep1 = () => (
    <>
      <Text style={styles.title}>Mot de passe oublié</Text>
      <Text style={styles.subtitle}>
        Entrez votre email pour recevoir un code de récupération
      </Text>

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
          editable={!loading}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {successMessage ? (
          <Text style={styles.success}>{successMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Envoyer le code</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.title}>Vérification</Text>
      <Text style={styles.subtitle}>
        Entrez le code à 6 chiffres envoyé à{"\n"}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (codeInputs.current[index] = ref)}
            style={[
              styles.codeInput,
              digit && styles.codeInputFilled,
              errorMessage && styles.codeInputError,
            ]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={(e) => handleCodeKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!loading}
            selectTextOnFocus
          />
        ))}
      </View>

      {errorMessage ? (
        <Text style={styles.error}>
          {errorMessage}
          {attemptsLeft < 5 && ` (${attemptsLeft} tentatives restantes)`}
        </Text>
      ) : null}

      {successMessage ? (
        <Text style={styles.success}>{successMessage}</Text>
      ) : null}

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Pas reçu de code ? </Text>
        <TouchableOpacity
          onPress={handleResendCode}
          disabled={resendTimer > 0 || loading}
        >
          <Text
            style={[
              styles.resendLink,
              (resendTimer > 0 || loading) && styles.resendLinkDisabled,
            ]}
          >
            {resendTimer > 0 ? `Renvoyer dans ${resendTimer}s` : "Renvoyer"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator color="#007bff" style={{ marginTop: 10 }} />
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setStep(1);
          setCode(["", "", "", "", "", ""]);
          setErrorMessage("");
        }}
      >
        <Text style={styles.backButtonText}>← Modifier l'email</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.title}>Nouveau mot de passe</Text>
      <Text style={styles.subtitle}>
        Créez un nouveau mot de passe sécurisé
      </Text>

      <View style={styles.form}>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Nouveau mot de passe"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={styles.hint}>Minimum 6 caractères</Text>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {successMessage ? (
          <Text style={styles.success}>{successMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Changer le mot de passe</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

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
          {/* Indicateur d'étapes */}
          <View style={styles.stepsIndicator}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  step >= s && styles.stepDotActive,
                  step === s && styles.stepDotCurrent,
                ]}
              />
            ))}
          </View>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
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
  stepsIndicator: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ddd",
  },
  stepDotActive: {
    backgroundColor: "#007bff",
  },
  stepDotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  emailHighlight: {
    fontWeight: "bold",
    color: "#007bff",
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
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginVertical: 10,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    backgroundColor: "#fafafa",
  },
  codeInputFilled: {
    borderColor: "#007bff",
    backgroundColor: "#f0f7ff",
  },
  codeInputError: {
    borderColor: "#ff4444",
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#99c9ff",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  error: {
    color: "#ff4444",
    fontSize: 14,
    textAlign: "center",
  },
  success: {
    color: "#00aa00",
    fontSize: 14,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    alignSelf: "flex-start",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  resendText: {
    color: "#666",
    fontSize: 14,
  },
  resendLink: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "bold",
  },
  resendLinkDisabled: {
    color: "#999",
  },
  backButton: {
    marginTop: 10,
  },
  backButtonText: {
    color: "#666",
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 5,
  },
  cancelButtonText: {
    color: "#999",
    fontSize: 14,
  },
});

export default ForgotPassword;
