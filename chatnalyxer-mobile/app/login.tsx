import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onLogin = async () => {
    try {
      setErr("");
      await signIn(email, password);
      // After login, navigate to setup page to connect WhatsApp
      router.replace("/setup");
    } catch {
      setErr("Login failed. Try again.");
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
        <Text style={styles.title}>Chatnalyxer</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.card}>
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
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={onLogin}>
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={() => router.push("/register")}>
          <Text style={styles.linkBtnText}>Create an account</Text>
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
  err: { color: "#DC2626", marginBottom: 8, textAlign: "center" },
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
