import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator, Alert, Linking, Platform, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';
import { setupStyles as styles } from './setup-styles';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import PairingCodeDisplay from './components/PairingCodeDisplay';

export default function SetupScreen() {
    const router = useRouter();
    const { token, user } = useAuth();

    const [isCheckingConnection, setIsCheckingConnection] = useState(false);
    const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
    const [previousConnectionStatus, setPreviousConnectionStatus] = useState(false);
    const [whatsappStatusMessage, setWhatsappStatusMessage] = useState('');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [isPolling, setIsPolling] = useState(true);
    const [countdown, setCountdown] = useState(60);
    const [isMounted, setIsMounted] = useState(false);
    const [linkMethod, setLinkMethod] = useState<'qr' | 'pairing' | null>(null); // Toggle between QR and pairing code
    const [showPairingModal, setShowPairingModal] = useState(false);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false); // Loading state for QR generation

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted && !token) {
            router.replace('/login');
        }
    }, [token, isMounted]);

    useEffect(() => {
        if (token) {
            checkWhatsAppConnection();
        }
    }, [token]);

    useEffect(() => {
        if (isWhatsAppConnected && !previousConnectionStatus) {
            Alert.alert(
                'Connection Established! 🎉',
                'Your WhatsApp account is connected. You can now select groups to analyze.',
                [{ text: 'Great!', onPress: () => router.push('/groups') }]
            );
        }
        setPreviousConnectionStatus(isWhatsAppConnected);
    }, [isWhatsAppConnected]);

    // Polling for Status
    useEffect(() => {
        if (!isPolling) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                    headers: {
                        'Authorization': `Bearer ${token?.trim()}`,
                        'ngrok-skip-browser-warning': 'true',
                    },
                });

                // Stop polling on authentication errors
                if (response.status === 401) {
                    console.log('⚠️ Authentication failed, stopping WhatsApp status polling');
                    setIsPolling(false);
                    setIsGeneratingQR(false);
                    return;
                }

                if (response.ok) {
                    const data = await response.json();

                    setWhatsappStatusMessage(data.message || '');
                    setIsWhatsAppConnected(data.ready || false);
                    setQrCode(data.qr_code || null);

                    // Stop polling once WhatsApp is connected
                    if (data.ready === true) {
                        console.log('✅ WhatsApp connected, stopping status polling');
                        setIsPolling(false);
                        setIsGeneratingQR(false);
                        return;
                    }

                    // Turn off loading state when QR code arrives
                    if (data.qr_code && isGeneratingQR) {
                        setIsGeneratingQR(false);
                    }

                    if (data.pairing_code) {
                        setPairingCode(data.pairing_code);
                    }

                    if (data.expired === true) {
                        setIsExpired(true);
                        setQrCode(null);
                        setPairingCode(null);
                        setIsPolling(false);
                        setIsGeneratingQR(false);
                    }
                    setLastError(null);
                }
            } catch (error: any) {
                console.log("Polling error:", error);
                // Stop polling on network errors to prevent spam
                setIsPolling(false);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [token, isPolling, isGeneratingQR]);

    // Countdown Timer
    useEffect(() => {
        let timer: any;
        if ((qrCode || pairingCode) && !isExpired && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (countdown === 0) {
            setIsExpired(true);
        }
        return () => clearInterval(timer);
    }, [qrCode, pairingCode, isExpired, countdown]);

    const checkWhatsAppConnection = async () => {
        setIsCheckingConnection(true);
        try {
            const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                headers: {
                    'Authorization': `Bearer ${token?.trim()}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            if (response.ok) {
                const data = await response.json();
                setIsWhatsAppConnected(data.ready || false);
                setWhatsappStatusMessage(data.message || '');
            }
        } catch (error) {
            console.log('Connection check failed:', error);
        } finally {
            setIsCheckingConnection(false);
        }
    };

    const handleGenerateQR = async () => {
        // Prevent multiple clicks
        if (isGeneratingQR) return;

        try {
            setIsGeneratingQR(true);
            setIsExpired(false);
            setQrCode(null);
            setPairingCode(null);
            setIsPolling(true);
            setCountdown(60);
            setWhatsappStatusMessage('Generating QR code...');

            // NEW: Use /whatsapp/connect endpoint
            const response = await fetch(`${BASE_URL}/whatsapp/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to start WhatsApp');
            }

            // Keep loading state until QR code appears
            // The polling will set isGeneratingQR to false when QR arrives
        } catch (error) {
            console.error('Error starting WhatsApp:', error);
            Alert.alert('Error', 'Failed to generate connection code');
            setIsGeneratingQR(false);
            setWhatsappStatusMessage('');
        }
    };

    const handleLogout = async () => {
        const confirmLogout = async () => {
            try {
                setWhatsappStatusMessage('Disconnecting...');
                // NEW: Use /whatsapp/disconnect endpoint
                await fetch(`${BASE_URL}/whatsapp/disconnect`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token?.trim()}` }
                });
                setIsWhatsAppConnected(false);
                setWhatsappStatusMessage('Disconnected');
                setPreviousConnectionStatus(false);
                setQrCode(null);
                setPairingCode(null);
            } catch (error) {
                Alert.alert('Error', 'Failed to disconnect');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Disconnect WhatsApp? This stops message analysis.')) {
                await confirmLogout();
            }
        } else {
            Alert.alert(
                'Disconnect WhatsApp',
                'Are you sure? This will stop message analysis.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Disconnect', style: 'destructive', onPress: confirmLogout }
                ]
            );
        }
    };

    const handleEmailClick = () => {
        Alert.alert(
            "Coming Soon 🚀",
            "Email integration is under development! We're actively building this feature to help you analyze emails alongside WhatsApp.",
            [{ text: "Can't wait!" }]
        );
    };

    if (isCheckingConnection) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Connecting to server...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    {/* Profile Icon - Top Right */}
                    <TouchableOpacity
                        onPress={() => router.push('/profile')}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            zIndex: 10,
                            padding: 8
                        }}
                    >
                        <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
                    </TouchableOpacity>

                    <View style={{ paddingRight: 50 }}>
                        <Text style={styles.title}>Chatnalyxer Hub</Text>
                        <Text style={styles.subtitle}>
                            Central command for your academic AI assistants.
                        </Text>
                    </View>
                </View>

                {/* WhatsApp Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                        <Text style={styles.cardTitle}>  WhatsApp Integration</Text>
                    </View>

                    {/* Calendar Quick Access */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: colors.primary + '20',
                            padding: 12,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 16
                        }}
                        onPress={() => router.push('/calendar')}
                    >
                        <Ionicons name="calendar" size={20} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                            View Calendar & Events
                        </Text>
                    </TouchableOpacity>

                    {isWhatsAppConnected ? (
                        <View>
                            {/* Status Badge */}
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>✅ Connected & Analyzing</Text>
                            </View>
                            <Text style={styles.instructionText}>
                                WhatsApp is live. Click below to view your personalized dashboard.
                            </Text>

                            <TouchableOpacity
                                style={[styles.buttonPrimary, { marginBottom: 12 }]}
                                onPress={() => router.push('/dashboard')}
                            >
                                <Text style={styles.buttonTextPrimary}>Open WhatsApp Dashboard</Text>
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.buttonSecondary, { flex: 1 }]}
                                    onPress={() => router.push('/groups')}
                                >
                                    <Text style={styles.buttonTextSecondary}>Manage Groups</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.buttonDestructive, { flex: 1 }]}
                                    onPress={handleLogout}
                                >
                                    <Text style={styles.buttonTextDestructive}>Disconnect</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.whatsappContent}>
                            <Text style={styles.whatsappDesc}>
                                Link your WhatsApp to analyze group messages with AI
                            </Text>

                            {/* Link Method Selection */}
                            {!isWhatsAppConnected && !qrCode && !pairingCode && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#333' }}>
                                        Choose linking method:
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <TouchableOpacity
                                            style={[
                                                styles.methodButton,
                                                linkMethod === 'qr' && styles.methodButtonActive,
                                                isGeneratingQR && { opacity: 0.6 }
                                            ]}
                                            onPress={() => {
                                                setLinkMethod('qr');
                                                handleGenerateQR();
                                            }}
                                            disabled={isGeneratingQR}
                                        >
                                            {isGeneratingQR ? (
                                                <>
                                                    <ActivityIndicator size="small" color={colors.primary} />
                                                    <Text style={[styles.methodButtonText, styles.methodButtonTextActive]}>
                                                        Generating...
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Ionicons name="qr-code" size={24} color={linkMethod === 'qr' ? colors.primary : '#666'} />
                                                    <Text style={[styles.methodButtonText, linkMethod === 'qr' && styles.methodButtonTextActive]}>
                                                        QR Code
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.methodButton, styles.methodButtonDisabled]}
                                            disabled={true}
                                        >
                                            <View style={styles.methodButtonContent}>
                                                <Ionicons name="keypad" size={24} color="#999" />
                                                <Text style={[styles.methodButtonText, { color: '#999' }]}>
                                                    Pairing Code
                                                </Text>
                                                <View style={styles.comingSoonBadgeSmall}>
                                                    <Text style={styles.comingSoonTextSmall}>Coming Soon</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Loading State - Show while generating QR */}
                            {isGeneratingQR && !qrCode && (
                                <View style={{ alignItems: 'center', marginVertical: 30 }}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: colors.primary }}>
                                        🔄 Generating QR Code...
                                    </Text>
                                    <Text style={{ marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center' }}>
                                        Please wait, this will only take a few seconds
                                    </Text>
                                </View>
                            )}

                            {/* QR Code Display */}
                            {qrCode && linkMethod === 'qr' && !isExpired && (
                                <View style={styles.qrContainer}>
                                    <Text style={{ marginBottom: 10, fontWeight: '600' }}>Scan with WhatsApp:</Text>
                                    <Image
                                        source={{ uri: qrCode }}
                                        style={{ width: 220, height: 220 }}
                                        resizeMode="contain"
                                    />
                                    <Text style={styles.expiryWarning}>QR expires in {countdown}s</Text>
                                </View>
                            )}

                            {/* Expired State */}
                            {isExpired && (
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>Connection code expired</Text>
                                </View>
                            )}

                            {/* Generate New Code Button */}
                            {(qrCode || isExpired) && (
                                <TouchableOpacity
                                    style={[styles.buttonPrimary, isGeneratingQR && { opacity: 0.6 }]}
                                    onPress={handleGenerateQR}
                                    disabled={isGeneratingQR}
                                >
                                    {isGeneratingQR ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <ActivityIndicator size="small" color="#fff" />
                                            <Text style={styles.buttonTextPrimary}>Generating...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.buttonTextPrimary}>
                                            Generate New Code
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Pairing Code Modal */}
                <Modal
                    visible={showPairingModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowPairingModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <PairingCodeDisplay
                                onClose={() => setShowPairingModal(false)}
                                phoneNumber={user?.phone_number}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Email Section (Coming Soon) */}
                <View style={[styles.card, styles.emailSection]}>
                    <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </View>
                    <Text style={styles.emailHeader}>📧 Email Integration</Text>
                    <Text style={styles.emailDesc}>
                        Connect your Student Email (Gmail/Outlook) to catch important announcements directly from your inbox.
                    </Text>

                    <TouchableOpacity
                        style={[styles.buttonSecondary, { opacity: 0.7 }]}
                        onPress={handleEmailClick}
                    >
                        <Text style={styles.buttonTextSecondary}>Connect Email</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}
