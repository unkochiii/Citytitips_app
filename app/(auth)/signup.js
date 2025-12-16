import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function SignUpScreen() {
  const { signup, isLoading } = useAuth();
  const navigation = useNavigation();

  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstBook, setFirstBook] = useState("");
  const [firstBookAuthor, setFirstBookAuthor] = useState("");
  const [secondBook, setSecondBook] = useState("");
  const [secondBookAuthor, setSecondBookAuthor] = useState("");
  const [firstStyle, setFirstStyle] = useState("");
  const [secondStyle, setSecondStyle] = useState("");
  const [thirdStyle, setThirdStyle] = useState("");
  const [birth, setBirth] = useState("");
  const [genre, setGenre] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return fullname && username && email.includes("@") && password.length >= 6;
  }, [fullname, username, email, password]);

  const onSubmit = async () => {
    setError("");
    try {
      setSubmitting(true);
      await signup({
        fullname,
        username,
        email,
        password,
        firstBookTitle: firstBook,
        firstBookAuthor,
        secondBookTitle: secondBook,
        secondBookAuthor,
        firstStyle,
        secondStyle,
        thirdStyle,
        birth,
        genre,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate("login");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Full name"
        value={fullname}
        onChangeText={setFullname}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
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

      <TextInput
        style={styles.input}
        placeholder="First Book Title"
        value={firstBook}
        onChangeText={setFirstBook}
      />
      <TextInput
        style={styles.input}
        placeholder="First Book Author"
        value={firstBookAuthor}
        onChangeText={setFirstBookAuthor}
      />
      <TextInput
        style={styles.input}
        placeholder="Second Book Title"
        value={secondBook}
        onChangeText={setSecondBook}
      />
      <TextInput
        style={styles.input}
        placeholder="Second Book Author"
        value={secondBookAuthor}
        onChangeText={setSecondBookAuthor}
      />

      <TextInput
        style={styles.input}
        placeholder="First Style"
        value={firstStyle}
        onChangeText={setFirstStyle}
      />
      <TextInput
        style={styles.input}
        placeholder="Second Style"
        value={secondStyle}
        onChangeText={setSecondStyle}
      />
      <TextInput
        style={styles.input}
        placeholder="Third Style"
        value={thirdStyle}
        onChangeText={setThirdStyle}
      />

      <TextInput
        style={styles.input}
        placeholder="Birth"
        value={birth}
        onChangeText={setBirth}
      />
      <TextInput
        style={styles.input}
        placeholder="Genre"
        value={genre}
        onChangeText={setGenre}
      />

      <TouchableOpacity
        style={[
          styles.btn,
          (!canSubmit || submitting || isLoading) && { opacity: 0.7 },
        ]}
        onPress={onSubmit}
        disabled={!canSubmit || submitting || isLoading}
      >
        <Text style={styles.btnText}>
          {submitting || isLoading ? "Creating..." : "Create account"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goToLogin}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginTop: 10,
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
