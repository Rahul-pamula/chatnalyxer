import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";

export default function Register() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onRegister = async () => {
    try {
      await signUp(username, email, password);
      // Navigate to login page after successful registration
      router.replace("/login");
    } catch (error) {
      Alert.alert("Registration Failed", "Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <Image
          source={require("../assets/images/chatnalyxer-logo.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Chatnalyxer in seconds</Text>
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.primaryBtn} onPress={onRegister}>
          <Text style={styles.primaryBtnText}>Create account</Text>
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={() => router.replace("/login")}>
          <Text style={styles.linkBtnText}>I already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#F7F8FA" },
  brandWrap: { alignItems: "center", marginBottom: 16 },
  logo: { width: 72, height: 72, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#475569", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    color: "#0F172A",
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkBtnText: { color: "#2563EB", fontWeight: "600" },
});
