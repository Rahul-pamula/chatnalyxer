import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getTrashMessages, restoreMessage, permanentDeleteMessage } from '../src/services/api';

type Message = {
    id: number;
    content: string;
    group_id: number;
    sender_id: number;
    created_at: string;
    deleted_at: string;
    groupName?: string;
};

export default function Trash() {
    const router = useRouter();
    const { token } = useAuth();
    const [trashMessages, setTrashMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Authentication required. Please log in.');
            setLoading(false);
            return;
        }
        fetchTrashMessages();
    }, [token]);

    const fetchTrashMessages = async () => {
        try {
            setError(null);
            setLoading(true);
            const data = await getTrashMessages();
            setTrashMessages(data);
        } catch (err) {
            console.error('Error fetching trash messages:', err);
            setError('Failed to fetch trash messages');
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreMessage = async (messageId: number) => {
        Alert.alert(
            'Restore Message',
            'Are you sure you want to restore this message?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    onPress: async () => {
                        try {
                            await restoreMessage(messageId);
                            await fetchTrashMessages();
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to restore message');
                        }
                    },
                },
            ]
        );
    };

    const handlePermanentDelete = async (messageId: number) => {
        Alert.alert(
            'Permanent Delete',
            'This action cannot be undone. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await permanentDeleteMessage(messageId);
                            await fetchTrashMessages();
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to permanently delete message');
                        }
                    },
                },
            ]
        );
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={styles.messageCard}>
            <View style={styles.messageHeader}>
                <Text style={styles.groupName}>Group ID: {item.group_id}</Text>
                <Text style={styles.timestamp}>Deleted: {formatTime(item.deleted_at)}</Text>
            </View>
            <Text style={styles.messageContent}>{item.content}</Text>
            <View style={styles.buttonRow}>
                <Button title="Restore" onPress={() => handleRestoreMessage(item.id)} color="#4caf50" />
                <Button title="Delete Permanently" onPress={() => handlePermanentDelete(item.id)} color="#d32f2f" />
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Loading trash...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>{error}</Text>
                {error.includes('Authentication') && (
                    <Button title="Go to Login" onPress={() => router.push('/login')} />
                )}
                <Button title="Back to Dashboard" onPress={() => router.push('/dashboard')} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Trash Bin</Text>
                <Text style={styles.subtitle}>Deleted messages ({trashMessages.length})</Text>
                <Button title="Back to Dashboard" onPress={() => router.push('/dashboard')} />
                <Button title="Refresh" onPress={fetchTrashMessages} />
            </View>
            {trashMessages.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={styles.emptyText}>No messages in trash</Text>
                    <Button title="Back to Dashboard" onPress={() => router.push('/dashboard')} />
                </View>
            ) : (
                <FlatList
                    data={trashMessages}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMessage}
                    style={styles.messagesList}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
    header: { marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 8 },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
    messagesList: { flex: 1 },
    messageCard: {
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    groupName: { fontSize: 14, fontWeight: '500', color: '#0066cc' },
    timestamp: { fontSize: 12, color: '#999' },
    messageContent: { fontSize: 14, color: '#333', marginBottom: 8 },
    loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
    errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 16 },
    emptyText: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 16 },
});
