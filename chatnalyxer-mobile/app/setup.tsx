import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';

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

    useEffect(() => {
        if (!token) {
            router.replace('/login');
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            checkWhatsAppConnection();
        }
    }, [token]);

    useEffect(() => {
        if (isWhatsAppConnected && !previousConnectionStatus) {
            Alert.alert(
                'Connection Established!',
                'Your WhatsApp account has been successfully connected. You can now select groups to analyze.',
                [{ text: 'OK' }]
            );
        }
        setPreviousConnectionStatus(isWhatsAppConnected);
    }, [isWhatsAppConnected]);

    useEffect(() => {
        if (!isPolling) return; // Don't poll when stopped

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                    headers: {
                        'Authorization': `Bearer ${token?.trim()}`,
                        'ngrok-skip-browser-warning': 'true',
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setWhatsappStatusMessage(data.message || '');
                    setIsWhatsAppConnected(data.ready || false);
                    setQrCode(data.qr_code || null);

                    // Only update pairing code if it's present, don't overwrite with null during active setup
                    if (data.pairing_code) {
                        setPairingCode(data.pairing_code);
                    }

                    // Check for expiration
                    if (data.expired === true) {
                        setIsExpired(true);
                        setQrCode(null);
                        setPairingCode(null);
                        setIsPolling(false); // Stop polling when expired
                        console.log('QR/Pairing code expired - stopped polling');
                    }

                    setLastError(null); // Clear error on success
                } else {
                    setLastError(`Status: ${response.status}`);
                }
            } catch (error: any) {
                console.log('Failed to fetch WhatsApp status:', error);
                setLastError(error.message || 'Fetch failed');
            }
        }, 5000); // Poll every 5 seconds (Avoid Ngrok Rate Limit)

        return () => clearInterval(interval);
    }, [token, isPolling]);

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
                if (data.message || data.ready) {
                    setWhatsappStatusMessage(data.message || '');
                    setIsWhatsAppConnected(data.ready || false);
                    setQrCode(data.qr_code || null);
                    setPairingCode(data.pairing_code || null);
                } else {
                    setWhatsappStatusMessage('WhatsApp not linked');
                    setIsWhatsAppConnected(false);
                    setQrCode(null);
                    setPairingCode(null);
                }
            } else {
                setIsWhatsAppConnected(false);
                setWhatsappStatusMessage('WhatsApp not linked');
            }
        } catch (error) {
            console.log('WhatsApp connection check failed:', error);
            setIsWhatsAppConnected(false);
            setWhatsappStatusMessage('WhatsApp not linked');
        } finally {
            setIsCheckingConnection(false);
        }
    };

    const handleGenerateQR = async () => {
        try {
            // Reset states for new attempt
            setIsExpired(false);
            setQrCode(null);
            setPairingCode(null);
            setIsPolling(true); // Resume polling
            setWhatsappStatusMessage('Initializing...');

            const response = await fetch(`${BASE_URL}/whatsapp/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    // Don't send phone number - let it generate QR code
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to start WhatsApp');
            }

            Alert.alert('Generating QR/Pairing Code', 'Please wait for QR code or pairing code to appear...');
        } catch (error) {
            console.error('Error starting WhatsApp:', error);
            Alert.alert('Error', 'Failed to generate QR code');
        }
    };

    const handleContinueToGroups = () => {
        // After WhatsApp connection, navigate to groups page where user can see their groups
        router.push('/groups');
    };

    const handleSkipSetup = () => {
        router.push('/dashboard');
    };

    if (isCheckingConnection) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Checking WhatsApp connection...</Text>
            </View>
        );
    }

    const handleLogout = async () => {
        Alert.alert(
            'Disconnect WhatsApp',
            'Are you sure you want to disconnect? This will stop message analysis.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setWhatsappStatusMessage('Disconnecting...');
                            const response = await fetch(`${BASE_URL}/whatsapp/stop`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token?.trim()}`,
                                    'Content-Type': 'application/json'
                                }
                            });

                            if (response.ok) {
                                setIsWhatsAppConnected(false);
                                setWhatsappStatusMessage('Disconnected');
                                setPreviousConnectionStatus(false);
                            } else {
                                Alert.alert('Error', 'Failed to disconnect properly');
                            }
                        } catch (error) {
                            console.error("Logout failed:", error);
                            Alert.alert('Error', 'Network error during logout');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>WhatsApp Setup</Text>
                <Text style={styles.subtitle}>
                    Connect your WhatsApp account to start analyzing messages
                </Text>
            </View>

            <View style={styles.content}>
                {isWhatsAppConnected ? (
                    <View style={styles.successContainer}>
                        <Text style={styles.successTitle}>✅ WhatsApp Connected!</Text>
                        <Text style={styles.successText}>
                            {whatsappStatusMessage || 'Your WhatsApp account is successfully linked. You can now select groups to analyze.'}
                        </Text>
                        <View style={styles.buttonContainer}>
                            <Button
                                title="Select Groups"
                                onPress={handleContinueToGroups}
                                color="#4CAF50"
                            />
                            <View style={styles.buttonSpacing} />
                            <Button
                                title="Logout from WhatsApp"
                                onPress={handleLogout}
                                color="#FF3B30"
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.setupContainer}>
                        <Text style={styles.instructionTitle}>Connect your WhatsApp</Text>
                        <Text style={styles.instructionText}>
                            Click the button below to generate a QR code, then scan it with WhatsApp.
                        </Text>

                        {/* Button to Generate QR */}
                        <View style={styles.buttonContainer}>
                            <Button
                                title={isExpired ? "QR Expired - Generate New QR" : qrCode || pairingCode ? "Generate New QR Code" : "Get QR Code"}
                                onPress={handleGenerateQR}
                                color={isExpired ? "#FF6B6B" : "#0066cc"}
                            />
                        </View>

                        {/* Show Expiration Message */}
                        {isExpired && (
                            <View style={styles.expiredContainer}>
                                <Text style={styles.expiredText}>⏰ QR/Pairing Code Expired</Text>
                                <Text style={styles.expiredSubtext}>Click "Generate New QR" to try again</Text>
                            </View>
                        )}

                        {/* Show Pairing Code (Priority over QR) */}
                        {pairingCode && !isExpired && (
                            <View style={styles.codeWrapper}>
                                <Text style={styles.instructionTitle}>Enter this code in WhatsApp:</Text>
                                <Text style={styles.pairingCodeText}>{pairingCode}</Text>
                                <Text style={styles.instructionText}>
                                    Open WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number
                                </Text>
                                <Text style={styles.expiryWarning}>⏰ Code expires in 60 seconds</Text>
                            </View>
                        )}

                        {/* Fallback for QR (Less likely now) */}
                        {qrCode && !pairingCode && !isExpired && (
                            <View style={styles.qrContainer}>
                                <Text style={styles.instructionTitle}>Scan this QR Code:</Text>
                                <View style={styles.qrWrapper}>
                                    <QRCode value={qrCode} size={250} />
                                </View>
                                <Text style={styles.expiryWarning}>⏰ QR expires in 60 seconds</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.statusMessage}>{whatsappStatusMessage}</Text>

                {/* Debug Info Section */}
                <View style={{ padding: 10, backgroundColor: '#eee', borderRadius: 8, marginTop: 10, width: '100%' }}>
                    <Text style={{ fontSize: 10, color: '#555', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                        Debug Info:
                    </Text>
                    <Text style={{ fontSize: 10, color: '#333' }}>URL: {BASE_URL}</Text>
                    <Text style={{ fontSize: 10, color: '#333' }}>Last Poll: {new Date().toLocaleTimeString()}</Text>
                    {lastError && (
                        <Text style={{ fontSize: 10, color: 'red', fontWeight: 'bold' }}>Error: {lastError}</Text>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        title="Check Connection"
                        onPress={checkWhatsAppConnection}
                        color="#2196F3"
                    />
                    <Button
                        title="Skip Setup (Go to Dashboard)"
                        onPress={handleSkipSetup}
                        color="#666"
                    />
                </View>
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    successContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8fff8',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 10,
    },
    successText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    setupContainer: {
        padding: 20,
        backgroundColor: '#f8f9ff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#0066cc',
    },
    instructionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    instructionText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 20,
        textAlign: 'center',
    },
    qrContainer: {
        alignItems: 'center',
        marginTop: 20,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    qrImageContainer: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    qrImage: {
        width: 250,
        height: 250,
    },
    qrWrapper: {
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonContainer: {
        gap: 10,
    },
    buttonSpacing: {
        height: 10,
    },
    footer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    statusMessage: {
        fontSize: 14,
        color: '#333',
        marginBottom: 10,
    },
    codeWrapper: {
        padding: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        marginVertical: 20,
        width: '100%',
        alignItems: 'center',
    },
    pairingCodeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        letterSpacing: 4,
    },
    expiredContainer: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#fff0f0',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FF6B6B',
        alignItems: 'center',
    },
    expiredText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#d32f2f',
        marginBottom: 5,
    },
    expiredSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    expiryWarning: {
        marginTop: 10,
        fontSize: 12,
        color: '#FF6B6B',
        fontWeight: '600',
        textAlign: 'center',
    },
});
