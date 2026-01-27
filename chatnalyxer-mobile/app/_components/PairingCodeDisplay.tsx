import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';
import { BASE_URL } from '../../src/config';
import LoadingAnimation from './LoadingAnimation';

interface PairingCodeDisplayProps {
    onClose: () => void;
    phoneNumber?: string; // Add phone number prop
}

export default function PairingCodeDisplay({ onClose, phoneNumber }: PairingCodeDisplayProps) {
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [isExpired, setIsExpired] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasGenerated, setHasGenerated] = useState(false); // Track if code was generated

    // Fetch current pairing code
    const fetchPairingCode = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get token from AsyncStorage
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            const token = await AsyncStorage.getItem('token');

            if (!token) {
                setError('Not authenticated');
                return;
            }

            // Use backend API
            const response = await fetch(`${BASE_URL}/whatsapp/pairing-code`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get pairing code');
            }

            const data = await response.json();

            if (data.expired || !data.code) {
                setIsExpired(true);
                setPairingCode(null);
                setTimeRemaining(0);
            } else {
                setPairingCode(data.code);
                setTimeRemaining(data.timeRemaining);
                setIsExpired(false);
                setHasGenerated(true);
            }
        } catch (err) {
            setError('Failed to fetch pairing code');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Generate new pairing code
    const generateNewCode = async () => {
        await fetchPairingCode();
    };

    // Countdown timer
    useEffect(() => {
        if (timeRemaining <= 0) return;

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    setIsExpired(true);
                    setPairingCode(null);
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeRemaining]);

    // DON'T auto-fetch on mount - wait for user to click button

    // Format code as "1234 5678"
    const formattedCode = pairingCode ? pairingCode.match(/.{1,4}/g)?.join(' ') : null;

    // Progress percentage
    const progress = timeRemaining / 60;

    // Format phone number for display
    const displayPhone = phoneNumber ? phoneNumber.replace(/(\d{2})(\d{10})/, '+$1 $2') : '';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>WhatsApp Pairing Code</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Show phone number */}
                {phoneNumber && (
                    <View style={styles.phoneContainer}>
                        <Text style={styles.phoneLabel}>Generating code for:</Text>
                        <Text style={styles.phoneNumber}>{displayPhone}</Text>
                    </View>
                )}

                <View style={styles.instructions}>
                    <Text style={styles.instructionStep}>1. Open WhatsApp on your phone</Text>
                    <Text style={styles.instructionStep}>2. Tap Menu → Linked Devices</Text>
                    <Text style={styles.instructionStep}>3. Tap "Link a Device"</Text>
                    <Text style={styles.instructionStep}>4. Enter this code:</Text>
                </View>

                {loading && !pairingCode ? (
                    <LoadingAnimation message="Generating your pairing code" />
                ) : !hasGenerated || isExpired || !pairingCode ? (
                    <View style={styles.expiredContainer}>
                        <Ionicons name="qr-code-outline" size={48} color={colors.primary} />
                        <Text style={styles.expiredText}>
                            {!hasGenerated ? 'Ready to Link' : 'Code Expired'}
                        </Text>
                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={generateNewCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="refresh" size={20} color="#fff" />
                                    <Text style={styles.generateButtonText}>Generate New Code</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.codeContainer}>
                            <Text style={styles.code}>{formattedCode}</Text>
                        </View>

                        <View style={styles.timerContainer}>
                            <Ionicons name="timer-outline" size={20} color={colors.textSecondary} />
                            <Text style={styles.timerText}>
                                Expires in: {timeRemaining}s
                            </Text>
                        </View>

                        <View style={styles.progressBarContainer}>
                            <View
                                style={[
                                    styles.progressBar,
                                    { width: `${progress * 100}%` }
                                ]}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={generateNewCode}
                            disabled={loading}
                        >
                            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                            <Text style={styles.refreshButtonText}>Generate New Code</Text>
                        </TouchableOpacity>
                    </>
                )}

                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
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
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    instructions: {
        marginBottom: 32,
    },
    instructionStep: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 8,
        lineHeight: 22,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
    },
    codeContainer: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginBottom: 24,
        ...shadows.md,
    },
    code: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 4,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    timerText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginLeft: 8,
        fontWeight: '500',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: colors.border,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 24,
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    expiredContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    expiredText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 16,
        marginBottom: 24,
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        ...shadows.sm,
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    refreshButtonText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    errorContainer: {
        backgroundColor: '#fee',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    errorText: {
        color: '#c33',
        fontSize: 14,
        textAlign: 'center',
    },
    phoneContainer: {
        backgroundColor: colors.primary + '10',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    phoneLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    phoneNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
    },
});
