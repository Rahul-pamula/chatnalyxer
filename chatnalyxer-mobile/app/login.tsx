import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadows } from "../src/theme/colors";

export default function Login() {
  const router = useRouter();
  const { signInWithPassword } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const formatPhoneNumber = (text: string) => text.replace(/\D/g, '').slice(0, 10);

  const handleLogin = async () => {
    try {
      setErr("");
      if (phoneNumber.length !== 10) return setErr("Please enter a valid 10-digit mobile number");
      if (!password) return setErr("Please enter your password");

      setLoading(true);
      await signInWithPassword(`+91${phoneNumber}`, password);
      router.replace("/setup");

    } catch (error: any) {
      console.error("Login Error:", error);
      setErr(error.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandSection}>
          <Image source={require("../assets/images/chatnalyxer-logo.jpg")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to access your account</Text>
        </View>

        <View style={styles.card}>
          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.countryBadge}>
                <Text style={styles.countryCode}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="98765 43210"
                placeholderTextColor={colors.textTertiary}
                value={phoneNumber}
                onChangeText={(t) => setPhoneNumber(formatPhoneNumber(t))}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.label}>Password</Text>
              <Pressable onPress={() => router.push('/forgot-password')}>
                <Text style={styles.forgotPass}>Forgot password?</Text>
              </Pressable>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          {err ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.err}>{err}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, loading && styles.btnDisabled, pressed && styles.btnPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/signup')}>
              <Text style={styles.linkText}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  brandSection: { alignItems: "center", marginBottom: 24 },
  logo: { width: 50, height: 50, marginBottom: 16, borderRadius: 12 },
  title: { fontSize: 24, fontWeight: "800", color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },

  card: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 4,
    padding: 24,
    ...shadows.lg,
  },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: { marginLeft: 12, marginRight: 8 },
  countryBadge: { paddingHorizontal: 12, paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border },
  countryCode: { fontWeight: "600", color: colors.textPrimary },
  input: { flex: 1, padding: 12, fontSize: 15, color: colors.textPrimary },

  forgotPass: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 16, gap: 6 },
  err: { color: colors.error, fontSize: 13, flex: 1 },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    ...shadows.md,
  },
  btnPressed: { opacity: 0.9 },
  btnDisabled: { backgroundColor: colors.textTertiary },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  linkText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
});
