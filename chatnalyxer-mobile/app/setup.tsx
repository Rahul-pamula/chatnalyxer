import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL, QR_URL } from '../src/config';

export default function SetupScreen() {
    const router = useRouter();
    const { token, user } = useAuth();

    const [isCheckingConnection, setIsCheckingConnection] = useState(false);
    const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
    const [previousConnectionStatus, setPreviousConnectionStatus] = useState(false);
    const [whatsappStatusMessage, setWhatsappStatusMessage] = useState('');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);

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
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log('WhatsApp Status Poll:', JSON.stringify(data));
                    setWhatsappStatusMessage(data.message || '');
                    setIsWhatsAppConnected(data.ready || false);
                    setQrCode(data.qr_code || null);
                    setPairingCode(data.pairing_code || null); // Add this line
                }
            } catch (error) {
                console.log('Failed to fetch WhatsApp status:', error);
            }
        }, 1000); // Poll every 1 second (was 3s)

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
            // Start WhatsApp integration
            const response = await fetch(`${BASE_URL}/whatsapp/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                Alert.alert(
                    'Generating Pairing Code',
                    'Please wait 5-10 seconds while we generate your pairing code...'
                );

                // Wait 5 seconds before starting to poll
                // This gives the WhatsApp integration time to generate the code
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Now start polling for the pairing code
                let attempts = 0;
                const maxAttempts = 15; // Poll for up to 15 seconds
                const checkInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const statusResponse = await fetch(`${BASE_URL}/whatsapp/status`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                            },
                        });
                        if (statusResponse.ok) {
                            const data = await statusResponse.json();
                            console.log('Status check:', data);
                            if (data.pairing_code) {
                                setPairingCode(data.pairing_code);
                                setWhatsappStatusMessage(data.message || 'Pairing code received');
                                clearInterval(checkInterval);
                                Alert.alert(
                                    'Pairing Code Ready!',
                                    `Your code is: ${data.pairing_code}\n\nEnter this in WhatsApp → Settings → Linked Devices → Link with phone number`
                                );
                            } else if (data.qr_code) {
                                setQrCode(data.qr_code);
                                clearInterval(checkInterval);
                            }
                        }
                    } catch (err) {
                        console.log('Status check error:', err);
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        Alert.alert(
                            'Timeout',
                            'Pairing code generation is taking longer than expected. Please check the backend logs or try again.'
                        );
                    }
                }, 1000); // Check every second
            } else {
                Alert.alert('Error', 'Failed to start WhatsApp integration');
            }
        } catch (error) {
            console.log('handleGenerateQR error:', error);
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
                        {pairingCode ? (
                            <View style={styles.qrContainer}>
                                <Text style={styles.instructionTitle}>Enter this Code in WhatsApp:</Text>
                                <View style={styles.codeWrapper}>
                                    <Text style={styles.pairingCodeText}>
                                        {pairingCode.split('').join(' ')}
                                    </Text>
                                </View>
                                <Text style={styles.instructionText}>
                                    1. Open WhatsApp on your phone{'\n'}
                                    2. Go to Linked Devices → Link a Device{'\n'}
                                    3. Select "Link with phone number instead"{'\n'}
                                    4. Enter the code above
                                </Text>
                            </View>
                        ) : qrCode ? (
                            <View style={styles.qrContainer}>
                                <Text style={styles.instructionTitle}>Scan this QR Code:</Text>
                                <View style={styles.qrWrapper}>
                                    <QRCode
                                        value={qrCode}
                                        size={250}
                                    />
                                </View>
                                <Text style={styles.instructionText}>
                                    Open WhatsApp → Linked Devices → Link a Device
                                </Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.instructionTitle}>Connect your WhatsApp</Text>
                                <Text style={styles.instructionText}>
                                    We will link the phone number you logged in with using a Pairing Code.
                                </Text>
                                <View style={styles.buttonContainer}>
                                    <Button
                                        title="Get Pairing Code"
                                        onPress={handleGenerateQR}
                                        color="#0066cc"
                                    />
                                </View>
                            </>
                        )}
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
        padding: 10,
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
});
