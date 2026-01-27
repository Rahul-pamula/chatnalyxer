import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceService } from '../../src/services/VoiceService';
import { BASE_URL } from '../../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoiceEventButtonProps {
    onEventCreated?: (event: any) => void;
}

export default function VoiceEventButton({ onEventCreated }: VoiceEventButtonProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pulseAnim] = useState(new Animated.Value(1));

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const stopPulseAnimation = () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
    };

    const handleVoicePress = async () => {
        if (isRecording) {
            // Stop recording and process
            await stopRecordingAndProcess();
        } else {
            // Start recording
            await startRecording();
        }
    };

    const startRecording = async () => {
        try {
            // Check permission
            const hasPermission = await VoiceService.checkMicrophonePermission();
            if (!hasPermission) {
                const granted = await VoiceService.requestMicrophonePermission();
                if (!granted) {
                    Alert.alert('Permission Required', 'Microphone permission is required to use voice commands.');
                    return;
                }
            }

            // Start recording
            await VoiceService.startListening();
            setIsRecording(true);
            startPulseAnimation();

            // Auto-stop after 10 seconds
            setTimeout(() => {
                if (isRecording) {
                    stopRecordingAndProcess();
                }
            }, 10000);

        } catch (error) {
            console.error('Error starting recording:', error);
            Alert.alert('Error', 'Failed to start recording. Please try again.');
        }
    };

    const stopRecordingAndProcess = async () => {
        try {
            setIsRecording(false);
            stopPulseAnimation();
            setIsProcessing(true);

            // Stop recording and get audio URI
            const audioUri = await VoiceService.stopListening();

            if (!audioUri) {
                Alert.alert('Error', 'No audio recorded. Please try again.');
                setIsProcessing(false);
                return;
            }

            // Get auth token
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login first.');
                setIsProcessing(false);
                return;
            }

            // Send to backend
            const formData = new FormData();

            // Use WAV format (Azure Speech compatible)
            const fileName = audioUri.split('/').pop()?.replace('.m4a', '.wav') || 'recording.wav';
            formData.append('audio', {
                uri: audioUri,
                type: 'audio/wav',
                name: fileName,
            } as any);

            console.log('📤 Sending to:', `${BASE_URL}/speech/create-event`);
            console.log('📤 Audio URI:', audioUri);

            const response = await fetch(`${BASE_URL}/speech/create-event`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Don't set Content-Type, let FormData set it
                },
                body: formData,
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server error:', errorText);
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Result:', result);

            if (result.success) {
                // Success!
                Alert.alert(
                    '✅ Event Created!',
                    `${result.event.title}\n${result.event.date} at ${result.event.time}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                if (onEventCreated) {
                                    onEventCreated(result.event);
                                }
                            }
                        }
                    ]
                );

                // Speak confirmation
                await VoiceService.speak(`Event created: ${result.event.title}`);
            } else {
                Alert.alert(
                    'Could Not Create Event',
                    result.error || 'Please try again with a clearer command.',
                    [
                        {
                            text: 'Try Again',
                            onPress: () => handleVoicePress()
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        }
                    ]
                );
            }

        } catch (error) {
            console.error('Error processing voice command:', error);
            Alert.alert('Error', 'Failed to process voice command. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handleVoicePress}
            disabled={isProcessing}
            activeOpacity={0.7}
        >
            <Animated.View
                style={[
                    styles.button,
                    isRecording && styles.recordingButton,
                    { transform: [{ scale: pulseAnim }] }
                ]}
            >
                {isProcessing ? (
                    <ActivityIndicator size="large" color="#fff" />
                ) : (
                    <>
                        <Ionicons
                            name={isRecording ? 'stop-circle' : 'mic'}
                            size={32}
                            color="#fff"
                        />
                        <Text style={styles.buttonText}>
                            {isRecording ? 'Tap to Stop' : 'Voice Command'}
                        </Text>
                    </>
                )}
            </Animated.View>

            {isRecording && (
                <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>Listening...</Text>
                </View>
            )}

            {isProcessing && (
                <Text style={styles.processingText}>Processing...</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 60,
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    recordingButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF3B30',
        marginRight: 8,
    },
    recordingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF3B30',
    },
    processingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginTop: 16,
    },
});
