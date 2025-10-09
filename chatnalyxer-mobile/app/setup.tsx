import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL, QR_URL } from '../src/config';

export default function SetupScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const [isCheckingConnection, setIsCheckingConnection] = useState(false);
    const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
    const [previousConnectionStatus, setPreviousConnectionStatus] = useState(false);
    const [whatsappStatusMessage, setWhatsappStatusMessage] = useState('');

    useEffect(() => {
        checkWhatsAppConnection();
    }, []);

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
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setWhatsappStatusMessage(data.message || '');
                    setIsWhatsAppConnected(data.ready || false);
                }
            } catch (error) {
                console.log('Failed to fetch WhatsApp status:', error);
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [token]);

    const checkWhatsAppConnection = async () => {
        setIsCheckingConnection(true);
        try {
            const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.message || data.ready) {
                    setWhatsappStatusMessage(data.message || '');
                    setIsWhatsAppConnected(data.ready || false);
                } else {
                    setWhatsappStatusMessage('WhatsApp not linked');
                    setIsWhatsAppConnected(false);
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
            // Start WhatsApp integration
            const response = await fetch(`${BASE_URL}/whatsapp/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // Open the QR page in browser
                const url = QR_URL;
                if (Platform.OS === 'web') {
                    window.open(url, '_blank');
                } else {
                    Linking.openURL(url).catch(() => {
                        Alert.alert('Error', 'Failed to open browser for QR code');
                    });
                }
            } else {
                Alert.alert('Error', 'Failed to start WhatsApp integration');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to start WhatsApp integration');
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
                        </View>
                    </View>
                ) : (
                    <View style={styles.setupContainer}>
                        <Text style={styles.instructionTitle}>How to connect:</Text>
                        <Text style={styles.instructionText}>
                            1. Click "Generate QR Code" below{'\n'}
                            2. A Chrome window will open with WhatsApp Web{'\n'}
                            3. Open WhatsApp on your phone{'\n'}
                            4. Go to Settings → Linked Devices{'\n'}
                            5. Tap "Link a Device"{'\n'}
                            6. Scan the QR code in the Chrome window{'\n'}
                            7. Return to this app and continue
                        </Text>

                        <View style={styles.buttonContainer}>
                            <Button
                                title="Generate QR Code"
                                onPress={handleGenerateQR}
                                color="#0066cc"
                            />
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.statusMessage}>{whatsappStatusMessage}</Text>
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
        </View>
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
    },
    instructionText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 20,
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
});
