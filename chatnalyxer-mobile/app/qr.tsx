import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Image, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getAdminOTPStatus, connectAdminOTP } from '../src/services/api';
import { colors, shadows } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function QRCodeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Initializing System WA...");
  const [retryCount, setRetryCount] = useState(0);

  // Initialize session
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        setStatusMsg("Starting OTP Service session...");
        await connectAdminOTP();
        if (mounted) setLoading(false);
      } catch (error) {
        console.error("Failed to start WA:", error);
        if (mounted) {
          setStatusMsg("Failed to start session. Retrying...");
        }
      }
    };

    init();

    return () => { mounted = false; };
  }, [retryCount]);

  // Poll for status
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        // Poll ADMIN OTP Status, not user status
        const data = await getAdminOTPStatus();
        if (mounted) {
          // Data structure from otp-service.js: { ready: bool, qr: string|null, expired: bool }
          setQrCode(data.qr);
          setIsReady(data.ready);

          if (data.expired) {
            setStatusMsg("QR Code Expired. Please regenerate.");
            setQrCode(null);
          } else {
            setStatusMsg(data.ready ? "System WhatsApp Connected!" : "Scan QR to Link System Account");
          }

          if (data.ready || data.expired) setLoading(false);
        }
      } catch (e) {
        console.log("Polling error", e);
      }
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setStatusMsg("Regenerating QR Code...");
    try {
      await connectAdminOTP();
      setRetryCount(c => c + 1);
    } catch (e) {
      setLoading(false);
      Alert.alert("Error", "Failed to regenerate QR");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Link WhatsApp</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          {isReady ? (
            <View style={styles.successState}>
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Connected!</Text>
              <Text style={styles.successText}>The system WhatsApp account is linked and active.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.instructions}>
                1. Open WhatsApp on your phone{'\n'}
                2. Go to Settings {'>'} Linked Devices{'\n'}
                3. Tap "Link a Device"{'\n'}
                4. Scan the QR code below
              </Text>

              <View style={styles.qrContainer}>
                {qrCode ? (
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}` }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.loadingContainer}>
                    {statusMsg.includes("Expired") ? (
                      <View style={{ alignItems: 'center' }}>
                        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                        <Text style={[styles.loadingText, { color: colors.error, marginBottom: 12 }]}>QR Code Expired</Text>
                        <Pressable
                          style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
                          onPress={handleRefresh}
                        >
                          <Text style={[styles.refreshText, { color: 'white' }]}>Regenerate QR</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>{statusMsg}</Text>
                      </>
                    )}
                  </View>
                )}
              </View>

              {!statusMsg.includes("Expired") && (
                <>
                  <Text style={styles.helperText}>
                    Keep this screen open while scanning.
                  </Text>

                  <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                    <Text style={styles.refreshText}>Force Refresh</Text>
                  </Pressable>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: 16 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...shadows.lg,
  },
  instructions: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'left',
    width: '100%',
  },
  qrContainer: {
    width: 280,
    height: 280,
    backgroundColor: 'white',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 20,
    gap: 6
  },
  refreshText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14
  },
  successState: {
    alignItems: 'center',
    padding: 20
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center'
  }
});
