import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QuickEventModalProps {
    visible: boolean;
    onClose: () => void;
    onEventCreated?: (event: any) => void;
}

export default function QuickEventModal({ visible, onClose, onEventCreated }: QuickEventModalProps) {
    const [text, setText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCreate = async () => {
        if (!text.trim()) {
            Alert.alert('Error', 'Please enter an event description');
            return;
        }

        try {
            setIsProcessing(true);

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login first');
                return;
            }

            const response = await fetch(`${BASE_URL}/test/create-event-from-text`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text.trim() }),
            });

            const result = await response.json();

            if (result.success) {
                Alert.alert(
                    '✅ Event Created!',
                    `${result.event.title}\n${result.event.date} at ${result.event.time}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setText('');
                                onClose();
                                if (onEventCreated) {
                                    onEventCreated(result.event);
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Could Not Create Event', result.error || 'Please try a clearer description');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            Alert.alert('Error', 'Failed to create event. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Quick Event</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Describe your event:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., exam tomorrow at 10 AM"
                        value={text}
                        onChangeText={setText}
                        multiline
                        numberOfLines={3}
                        autoFocus
                    />

                    <Text style={styles.examples}>
                        Examples:{'\n'}
                        • "exam tomorrow at 10 AM"{'\n'}
                        • "meeting on Monday at 2 PM"{'\n'}
                        • "assignment due next Friday"
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, isProcessing && styles.buttonDisabled]}
                        onPress={handleCreate}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="add-circle" size={20} color="#fff" />
                                <Text style={styles.buttonText}>Create Event</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 300,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    examples: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
