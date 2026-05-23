import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function Register() {
  const router = useRouter();

  // Redirect to login since registration is now part of OTP flow
  useEffect(() => {
    router.replace("/login");
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <Image
          source={require("../assets/images/chatnalyxer-logo.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Redirecting...</Text>
        <Text style={styles.subtitle}>Registration is now part of login</Text>
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
});
