import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator, Alert, Linking, Platform, ScrollView, TouchableOpacity, Modal, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';
import { setupStyles as styles } from './setup-styles';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import PairingCodeDisplay from './_components/PairingCodeDisplay';

// Fix for web globals
declare const window: any;

interface WhatsAppStatusResponse {
    ready?: boolean;
    message?: string;
    qr_code?: string;
    pairing_code?: string;
    expired?: boolean;
}

export default function SetupScreen() {
    const router = useRouter();
    const { token, user } = useAuth();
    // ... (keep all state variables exactly the same)
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
    const [linkMethod, setLinkMethod] = useState<'qr' | 'pairing' | null>(null);
    const [showPairingModal, setShowPairingModal] = useState(false);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);

    // ... (keep all useEffects and handlers exactly the same)
    useEffect(() => { setIsMounted(true); }, []);

    useEffect(() => { if (isMounted && !token) { router.replace('/login'); } }, [token, isMounted]);

    useEffect(() => { if (token) { checkWhatsAppConnection(); } }, [token]);

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

    // Polling
    useEffect(() => {
        if (!isPolling) return;
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                    headers: { 'Authorization': `Bearer ${token?.trim()}`, 'ngrok-skip-browser-warning': 'true' },
                });
                if (response.status === 401) { setIsPolling(false); setIsGeneratingQR(false); return; }
                if (response.ok) {
                    const data = await response.json() as WhatsAppStatusResponse;
                    setWhatsappStatusMessage(data.message || '');
                    setIsWhatsAppConnected(data.ready || false);
                    setQrCode(data.qr_code || null);
                    if (data.ready === true) { setIsPolling(false); setIsGeneratingQR(false); return; }
                    if (data.qr_code && isGeneratingQR) { setIsGeneratingQR(false); }
                    if (data.pairing_code) { setPairingCode(data.pairing_code); }
                    if (data.expired === true) { setIsExpired(true); setQrCode(null); setPairingCode(null); setIsPolling(false); setIsGeneratingQR(false); }
                    setLastError(null);
                }
            } catch (error: any) { setIsPolling(false); }
        }, 3000);
        return () => clearInterval(interval);
    }, [token, isPolling, isGeneratingQR]);

    // Timer
    useEffect(() => {
        let timer: any;
        if ((qrCode || pairingCode) && !isExpired && countdown > 0) {
            timer = setInterval(() => { setCountdown((prev) => prev - 1); }, 1000);
        } else if (countdown === 0) { setIsExpired(true); }
        return () => clearInterval(timer);
    }, [qrCode, pairingCode, isExpired, countdown]);

    const checkWhatsAppConnection = async () => {
        setIsCheckingConnection(true);
        try {
            const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                headers: { 'Authorization': `Bearer ${token?.trim()}`, 'ngrok-skip-browser-warning': 'true' },
            });
            if (response.ok) {
                const data = await response.json() as WhatsAppStatusResponse;
                setIsWhatsAppConnected(data.ready || false);
                setWhatsappStatusMessage(data.message || '');
            }
        } catch (error) { console.log('Connection check failed:', error); } finally { setIsCheckingConnection(false); }
    };

    const handleGenerateQR = async () => {
        if (isGeneratingQR) return;
        try {
            setIsGeneratingQR(true);
            setIsExpired(false);
            setQrCode(null);
            setPairingCode(null);
            setIsPolling(true);
            setCountdown(60);
            setWhatsappStatusMessage('Generating QR code...');
            const response = await fetch(`${BASE_URL}/whatsapp/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) { throw new Error('Failed to start WhatsApp'); }
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
                // Don't use Alert on web for errors if possible, or use simple alert
                if (Platform.OS === 'web') {
                    (window as any).alert('Failed to disconnect');
                } else {
                    Alert.alert('Error', 'Failed to disconnect');
                }
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = (window as any).confirm('Are you sure you want to disconnect? This stops message analysis.');
            if (confirmed) {
                confirmLogout();
            }
        } else {
            Alert.alert(
                'Disconnect WhatsApp',
                'Are you sure? This stops message analysis.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Disconnect', style: 'destructive', onPress: confirmLogout }
                ]
            );
        }
    };

    const handleEmailClick = () => {
        Alert.alert("Coming Soon 🚀", "Email integration is under development!", [{ text: "Can't wait!" }]);
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>Chatnalyxer Hub</Text>
                                <Text style={styles.subtitle}>
                                    Command center for your AI assistants.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => router.push('/profile')}
                                style={styles.profileButton}
                            >
                                <Ionicons name="person" size={24} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* WhatsApp Section */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                            <Text style={styles.cardTitle}>WhatsApp Integration</Text>
                        </View>

                        {isWhatsAppConnected ? (
                            <View style={styles.connectedContainer}>
                                {/* Operational Badge */}
                                <View style={styles.operationalBadge}>
                                    <View style={styles.badgeDot} />
                                    <Text style={styles.statusText}>System Operational</Text>
                                </View>

                                {/* Connection Details */}
                                <Text style={styles.connectionDetails}>
                                    Connected via {user?.phone_number || 'WhatsApp'}
                                </Text>
                                <Text style={styles.connectionSubtext}>
                                    Message analysis is active and running.
                                </Text>

                                {/* Use Primary Action for Dashboard */}
                                <TouchableOpacity
                                    style={styles.buttonPrimary}
                                    onPress={() => router.push('/dashboard')}
                                >
                                    <Text style={styles.buttonTextPrimary}>Go to Dashboard</Text>
                                </TouchableOpacity>

                                {/* Secondary Actions Row */}
                                <View style={styles.secondaryActionsRow}>
                                    <TouchableOpacity
                                        style={styles.buttonSecondary}
                                        onPress={() => router.push('/groups')}
                                    >
                                        <Text style={styles.buttonTextSecondary}>Manage Groups</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.buttonDestructive}
                                        onPress={handleLogout}
                                    >
                                        <Text style={styles.buttonTextDestructive}>Disconnect</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.whatsappContent}>
                                <Text style={styles.whatsappDesc}>
                                    Link your WhatsApp to enable AI analysis for your academic groups.
                                </Text>

                                {!isWhatsAppConnected && !qrCode && !pairingCode && (
                                    <View style={{ marginBottom: 0 }}>
                                        <Text style={styles.methodTitle}>Connect via</Text>
                                        <View style={styles.methodsContainer}>
                                            {/* QR Code Button */}
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
                                                <View style={styles.methodButtonContent}>
                                                    {isGeneratingQR ? (
                                                        <ActivityIndicator size="small" color={colors.primary} />
                                                    ) : (
                                                        <Ionicons name="qr-code-outline" size={28} color={linkMethod === 'qr' ? colors.primary : colors.textSecondary} />
                                                    )}
                                                    <Text style={[styles.methodButtonText, linkMethod === 'qr' && styles.methodButtonTextActive]}>
                                                        {isGeneratingQR ? 'Generating...' : 'Scan QR Code'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>

                                            {/* Pairing Code Button */}
                                            <TouchableOpacity
                                                style={[styles.methodButton, styles.methodButtonDisabled]}
                                                disabled={true}
                                            >
                                                <View style={styles.methodButtonContent}>
                                                    <Ionicons name="keypad-outline" size={28} color={colors.textTertiary} />
                                                    <Text style={[styles.methodButtonText, { color: colors.textTertiary }]}>Pairing Code</Text>
                                                    <View style={styles.comingSoonBadgeAbsolute}>
                                                        <Text style={styles.comingSoonTextSmall}>SOON</Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Loading State */}
                                {isGeneratingQR && !qrCode && (
                                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                        <ActivityIndicator size="large" color={colors.primary} />
                                        <Text style={styles.generatingText}>Generating Session...</Text>
                                        <Text style={styles.waitText}>Please wait a moment</Text>
                                    </View>
                                )}

                                {/* QR Code Display */}
                                {qrCode && linkMethod === 'qr' && !isExpired && (
                                    <View style={styles.qrContainer}>
                                        <Text style={{ marginBottom: 16, fontWeight: '600', color: colors.textPrimary }}>Scan with WhatsApp Linked Devices:</Text>
                                        <Image source={{ uri: qrCode }} style={{ width: 220, height: 220 }} resizeMode="contain" />
                                        <Text style={styles.expiryWarning}>Code expires in {countdown}s</Text>
                                    </View>
                                )}

                                {/* Expired/Retry */}
                                {(isExpired || (qrCode || isExpired)) && !isGeneratingQR && !qrCode && (
                                    <TouchableOpacity style={[styles.buttonPrimary]} onPress={handleGenerateQR}>
                                        <Text style={styles.buttonTextPrimary}>Generate New Code</Text>
                                    </TouchableOpacity>
                                )}
                                {/* Generate New Code Button when QR is visible (refresh) */}
                                {qrCode && (
                                    <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 10 }]} onPress={handleGenerateQR}>
                                        <Text style={styles.buttonTextSecondary}>Regenerate Code</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Skip to Dashboard Button */}
                                <TouchableOpacity
                                    style={{ alignSelf: 'center', marginTop: 20, padding: 8 }}
                                    onPress={() => router.push('/dashboard')}
                                >
                                    <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>
                                        View Dashboard (Read Only)
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Calendar Shortcut Card */}
                    <TouchableOpacity
                        style={styles.calendarCard}
                        onPress={() => router.push('/calendar')}
                    >
                        <View style={styles.calendarLeft}>
                            <View style={styles.calendarIconBox}>
                                <Ionicons name="calendar" size={24} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.calendarTitle}>Calendar & Events</Text>
                                <Text style={styles.calendarSubtitle}>View your academic schedule</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Email Section */}
                    <View style={[styles.card, styles.emailSection]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="mail-outline" size={24} color="#34495e" />
                            <Text style={styles.cardTitle}>Email Integration</Text>
                            <View style={styles.comingSoonBadgeInline}>
                                <Text style={styles.comingSoonTextInline}>COMING SOON</Text>
                            </View>
                        </View>

                        <Text style={styles.emailDesc}>
                            Connect your Student Email to catch important announcements directly from your inbox.
                        </Text>
                    </View>

                </ScrollView>
            </View>

            {/* Modals outside ScrollView */}
            <Modal visible={showPairingModal} transparent={true} animationType="slide" onRequestClose={() => setShowPairingModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <PairingCodeDisplay onClose={() => setShowPairingModal(false)} phoneNumber={user?.phone_number} />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
