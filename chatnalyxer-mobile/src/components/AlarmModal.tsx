import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlarm } from '../context/AlarmContext';

export const AlarmModal = () => {
    const { isRinging, stopAlarm, snoozeAlarm, snoozeCount, alarmMessage } = useAlarm();

    if (!isRinging) return null;

    const canSnooze = snoozeCount < 3;

    return (
        <Modal visible={isRinging} transparent={true} animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Ionicons name="notifications-circle-outline" size={80} color="#ff3b30" />
                    <Text style={styles.title}>ALARM</Text>
                    <Text style={styles.message}>{alarmMessage}</Text>

                    <TouchableOpacity style={styles.stopButton} onPress={stopAlarm}>
                        <Text style={styles.stopButtonText}>⏹️ STOP ALARM</Text>
                    </TouchableOpacity>

                    {canSnooze ? (
                        <TouchableOpacity style={styles.snoozeButton} onPress={snoozeAlarm}>
                            <Text style={styles.snoozeButtonText}>😴 SNOOZE (5 min)</Text>
                            <Text style={styles.snoozeCountText}>({3 - snoozeCount} left)</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.noSnoozeText}>Snooze limit reached</Text>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ff3b30',
        marginTop: 10,
        marginBottom: 10,
    },
    message: {
        fontSize: 18,
        color: '#333',
        textAlign: 'center',
        marginBottom: 30,
    },
    stopButton: {
        backgroundColor: '#ff3b30',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    stopButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    snoozeButton: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    snoozeButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
    snoozeCountText: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    },
    noSnoozeText: {
        color: '#999',
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 10,
    },
});
