import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
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
      router.replace("/groups"); // ✅ replace: don’t go back to login
    } catch {
      setErr("Login failed. Try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chatnalyxer</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
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
      <Button title="Sign In" onPress={onLogin} />
      <View style={{ height: 12 }} />
      <Button title="Create account" onPress={() => router.push("/register")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "600", marginBottom: 24, textAlign: "center", color: "#000" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12, color: "#000" },
  err: { color: "red", marginBottom: 8 },
});
