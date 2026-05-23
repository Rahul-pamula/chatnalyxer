import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert, ScrollView } from "react-native";
import { registerAndRequestOTP, resetPassword, requestOTP } from "../src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadows } from "../src/theme/colors";

export default function ForgotPassword() {
    const router = useRouter();

    // Steps: 'phone' -> 'otp-reset'
    const [step, setStep] = useState<'phone' | 'otp-reset'>('phone');

    // Inputs
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI states
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [countdown, setCountdown] = useState(0);

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

    const handleRequestOTP = async () => {
        try {
            setErr("");
            if (phoneNumber.length !== 10) return setErr("Please enter a valid 10-digit mobile number");

            setLoading(true);

            // Reusing requestOTP. Username is optional for reset as we only need phone validation.
            // Backend endpoint should handle sending OTP to existing phone.
            // Note: Our requestOTP checks if user exists? 
            // The backend endpoint `/auth/request-otp` checks:
            // - If user exists -> Sends OTP (allowed).
            // - If user doesn't exist -> checks username uniqueness (but we pass dummy name for logic skip if needed, or backend logic).
            // Wait, backend logic:
            // user = query(phone).first()
            // if not user: check username... 
            // So if user EXISTS, it proceeds to send OTP. Perfect.

            const data = await requestOTP(`+91${phoneNumber}`, "User");

            setStep('otp-reset');
            setCountdown(data.expires_in || 300);
            setErr("");

        } catch (error: any) {
            console.error("Forgot Pass OTP Request Error:", error);
            setErr(error.response?.data?.detail || error.message || "Failed to send OTP. Check phone number.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            setErr("");
            if (otp.length !== 6) return setErr("Please enter 6-digit OTP");
            if (newPassword.length < 6) return setErr("Password must be at least 6 characters");
            if (newPassword !== confirmPassword) return setErr("Passwords do not match");

            setLoading(true);

            await resetPassword(`+91${phoneNumber}`, otp, newPassword);

            // Redirect immediately on success
            router.replace("/login");

        } catch (error: any) {
            console.error("Reset Password Error:", error);
            setErr(error.response?.data?.detail || error.message || "Failed to reset password. Invalid OTP?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.brandSection}>
                <Image source={require("../assets/images/chatnalyxer-logo.jpg")} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>Enter your phone number to receive OTP</Text>
            </View>

            <View style={styles.card}>
                {step === 'phone' ? (
                    <>
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

                        {err ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color={colors.error} />
                                <Text style={styles.err}>{err}</Text>
                            </View>
                        ) : null}

                        <Pressable
                            style={({ pressed }) => [styles.primaryBtn, loading && styles.btnDisabled, pressed && styles.btnPressed]}
                            onPress={handleRequestOTP}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send OTP</Text>}
                        </Pressable>
                    </>
                ) : (
                    <>
                        <View style={styles.otpHeader}>
                            <Text style={styles.otpSentText}>Enter OTP sent to +91 {phoneNumber}</Text>
                        </View>

                        <Text style={styles.label}>OTP Code</Text>
                        <TextInput
                            style={styles.otpInput}
                            placeholder="••••••"
                            placeholderTextColor={colors.textTertiary}
                            value={otp}
                            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                            keyboardType="number-pad"
                            maxLength={6}
                        />

                        <Text style={styles.label}>New Password</Text>
                        <View style={[styles.inputWrapper, { marginBottom: 16 }]}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="New Password"
                                placeholderTextColor={colors.textTertiary}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showPassword}
                            />
                            <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textTertiary} />
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={[styles.inputWrapper, { marginBottom: 16 }]}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm Password"
                                placeholderTextColor={colors.textTertiary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                            />
                        </View>

                        {err ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color={colors.error} />
                                <Text style={styles.err}>{err}</Text>
                            </View>
                        ) : null}

                        <Pressable
                            style={({ pressed }) => [styles.primaryBtn, loading && styles.btnDisabled, pressed && styles.btnPressed]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Reset Password</Text>}
                        </Pressable>

                        <Pressable style={styles.backLink} onPress={() => setStep('phone')}>
                            <Text style={styles.linkText}>Change Phone Number</Text>
                        </Pressable>
                    </>
                )}

                <View style={styles.footerRow}>
                    <Pressable onPress={() => router.back()}>
                        <Text style={styles.linkText}>Back to Login</Text>
                    </Pressable>
                </View>
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
    linkText: { color: colors.primary, fontWeight: "600", fontSize: 14 },

    otpHeader: { alignItems: 'center', marginBottom: 20 },
    otpSentText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    otpInput: { fontSize: 24, fontWeight: "700", textAlign: "center", letterSpacing: 8, color: colors.textPrimary, marginBottom: 20, height: 50, borderBottomWidth: 2, borderBottomColor: colors.primary },
    backLink: { alignItems: 'center', marginTop: 16 },
});
