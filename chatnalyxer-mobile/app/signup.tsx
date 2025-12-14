import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { registerAndRequestOTP } from "../src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadows } from "../src/theme/colors";

export default function Signup() {
    const router = useRouter();
    const { signInWithOTP } = useAuth(); // Use this for step 2 verification

    // Step 1: User Details
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [username, setUsername] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Step 2: Enter OTP
    const [otp, setOtp] = useState("");
    const [countdown, setCountdown] = useState(0);

    // UI states
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const formatPhoneNumber = (text: string) => text.replace(/\D/g, '').slice(0, 10);
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleRegister = async () => {
        try {
            setErr("");

            if (!username.trim()) return setErr("Please enter your full name");
            if (phoneNumber.length !== 10) return setErr("Please enter a valid 10-digit mobile number");
            if (password.length < 6) return setErr("Password must be at least 6 characters");
            if (password !== confirmPassword) return setErr("Passwords do not match");

            setLoading(true);

            // Fix: Send undefined if email is empty to pass backend validation
            const validEmail = email.trim() ? email.trim() : undefined;

            const data = await registerAndRequestOTP(
                username.trim(),
                `+91${phoneNumber}`,
                password,
                validEmail as string // Type assertion or change api signature
            );

            // Move to OTP step
            setStep('otp');
            setCountdown(data.expires_in || 300);
            setErr("");

        } catch (error: any) {
            console.error("Signup error:", error);

            // Fix: Handle 422 Validation Error (Array of objects)
            let errorMessage = "Registration failed. Try again.";

            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail)) {
                    // Extract first validation error message
                    errorMessage = detail.map(e => e.msg).join(', ');
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setErr(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        try {
            setErr("");
            if (otp.length !== 6) return setErr("Please enter a valid 6-digit OTP");

            setLoading(true);
            await signInWithOTP(`+91${phoneNumber}`, otp);
            router.replace("/setup"); // Or dashboard

        } catch (error: any) {
            setErr(error.message || "Invalid OTP. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.brandSection}>
                <Image source={require("../assets/images/chatnalyxer-logo.jpg")} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Sign up to start managing your chats</Text>
            </View>

            <View style={styles.card}>
                {step === 'details' ? (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your full name"
                                    placeholderTextColor={colors.textTertiary}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Email (Optional) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your email address"
                                    placeholderTextColor={colors.textTertiary}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Phone Number (Compulsory) */}
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
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Create a password"
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

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm your password"
                                    placeholderTextColor={colors.textTertiary}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
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
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Verification Code</Text>}
                        </Pressable>

                        <View style={styles.footerRow}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <Pressable onPress={() => router.push('/login')}>
                                <Text style={styles.linkText}>Sign in</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                ) : (
                    <>
                        {/* OTP Verification Step Same as Login */}
                        <View style={styles.otpHeader}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="chatbox-ellipses-outline" size={24} color={colors.primary} />
                            </View>
                            <Text style={styles.otpSentText}>Enter OTP sent to +91 {phoneNumber}</Text>
                        </View>

                        <TextInput
                            style={styles.otpInput}
                            placeholder="••••••"
                            placeholderTextColor={colors.textTertiary}
                            value={otp}
                            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                        />

                        {err ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color={colors.error} />
                                <Text style={styles.err}>{err}</Text>
                            </View>
                        ) : null}

                        <Pressable
                            style={({ pressed }) => [styles.primaryBtn, loading && styles.btnDisabled, pressed && styles.btnPressed]}
                            onPress={handleVerifyOTP}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Create Account</Text>}
                        </Pressable>

                        <Pressable style={styles.backLink} onPress={() => setStep('details')}>
                            <Text style={styles.linkText}>Change Details</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
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
        // maxHeight: '80%', // To ensure it doesn't overflow on small screens
        ...shadows.lg,
    },

    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginLeft: 2 },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 8, // More rectangular
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcon: { marginLeft: 12, marginRight: 8 },
    countryBadge: { paddingHorizontal: 12, paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border },
    countryCode: { fontWeight: "600", color: colors.textPrimary },
    input: { flex: 1, padding: 12, fontSize: 15, color: colors.textPrimary },

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

    otpHeader: { alignItems: 'center', marginBottom: 20 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    otpSentText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    otpInput: { fontSize: 24, fontWeight: "700", textAlign: "center", letterSpacing: 8, color: colors.textPrimary, marginBottom: 20, height: 50, borderBottomWidth: 2, borderBottomColor: colors.primary },
    backLink: { alignItems: 'center', marginTop: 16 },
});
