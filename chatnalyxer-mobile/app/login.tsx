import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { BASE_URL } from "../src/config";

export default function Login() {
  const router = useRouter();
  const { signInWithOTP } = useAuth();

  // Step 1: Enter username and phone
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Step 2: Enter OTP
  const [otp, setOtp] = useState("");
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // UI states
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    // Limit to 10 digits (Indian phone number)
    return digits.slice(0, 10);
  };

  const handleRequestOTP = async () => {
    try {
      setErr("");

      if (!username.trim()) {
        setErr("Please enter a username");
        return;
      }

      if (phoneNumber.length !== 10) {
        setErr("Please enter a valid 10-digit phone number");
        return;
      }

      setLoading(true);

      const response = await fetch(`${BASE_URL}/auth/register-and-request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          phone_number: `+91${phoneNumber}`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to send OTP");
      }

      // Move to OTP step
      setStep('otp');
      setCountdown(data.expires_in || 300); // 5 minutes default
      setErr("");

    } catch (error: any) {
      setErr(error.message || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setErr("");

      if (otp.length !== 6) {
        setErr("Please enter a valid 6-digit OTP");
        return;
      }

      setLoading(true);

      await signInWithOTP(`+91${phoneNumber}`, otp);

      // Navigate to setup page after successful login
      router.replace("/setup");

    } catch (error: any) {
      setErr(error.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp("");
    await handleRequestOTP();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <Text style={styles.subtitle}>
          {step === 'phone' ? 'Sign in to continue' : 'Enter OTP'}
        </Text>
      </View>

      <View style={styles.card}>
        {step === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!loading}
            />

            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="Phone Number"
                placeholderTextColor="#888"
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading}
              />
            </View>

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleRequestOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              )}
            </Pressable>

            <Text style={styles.infoText}>
              We'll send a 6-digit OTP to your WhatsApp
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.otpSentText}>
              OTP sent to +91{phoneNumber}
            </Text>

            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#888"
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
              autoFocus
            />

            {countdown > 0 && (
              <Text style={styles.timerText}>
                OTP expires in {formatTime(countdown)}
              </Text>
            )}

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify OTP</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.linkBtn}
              onPress={handleResendOTP}
              disabled={loading || countdown > 240} // Allow resend after 1 minute
            >
              <Text style={[styles.linkBtnText, (loading || countdown > 240) && styles.textDisabled]}>
                Resend OTP
              </Text>
            </Pressable>

            <Pressable
              style={styles.linkBtn}
              onPress={() => {
                setStep('phone');
                setOtp("");
                setErr("");
              }}
            >
              <Text style={styles.linkBtnText}>Change Phone Number</Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push('/admin/login')}
            >
              <Text style={styles.secondaryBtnText}>Login as Admin</Text>
            </Pressable>
          </>
        )}
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
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: "#F8FAFC",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    color: "#0F172A",
    backgroundColor: "#fff",
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 8,
  },
  otpSentText: {
    fontSize: 14,
    color: "#10B981",
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  timerText: {
    fontSize: 13,
    color: "#F59E0B",
    marginBottom: 12,
    textAlign: "center",
  },
  infoText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
  err: { color: "#DC2626", marginBottom: 8, textAlign: "center", fontSize: 14 },
  primaryBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: {
    backgroundColor: "#94A3B8",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkBtnText: { color: "#2563EB", fontWeight: "600", fontSize: 14 },
  textDisabled: { color: "#94A3B8" },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 10, color: '#94A3B8', fontSize: 12 },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 0,
  },
  secondaryBtnText: { color: '#475569', fontWeight: '500', fontSize: 13 },
});
