import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Alert, Pressable, RefreshControl, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getTrashMessages, restoreMessage, permanentDeleteMessage, emptyTrash } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';

type TrashMessage = {
    id: number;
    content: string;
    group_id: number;
    sender_id: number;
    created_at: string;
    deleted_at: string;
    groupName?: string;
    priority_level?: string;
    deadline_extracted?: string;
};

export default function Trash() {
    const router = useRouter();
    const { token } = useAuth(); // Get token
    const [messages, setMessages] = useState<TrashMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            if (token) {
                fetchTrashMessages();
            }
        }, [token])
    );

    const fetchTrashMessages = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await getTrashMessages();
            setMessages(data);
        } catch (err) {
            console.error('Error fetching trash:', err);
            Alert.alert('Error', 'Failed to load trash bin');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTrashMessages(true);
        setRefreshing(false);
    };

    const handleRestore = async (messageId: number) => {
        try {
            await restoreMessage(messageId);
            Alert.alert('Success', 'Message restored successfully');
            await fetchTrashMessages(true);
        } catch (err) {
            console.error('Error restoring message:', err);
            Alert.alert('Error', 'Failed to restore message');
        }
    };

    const handlePermanentDelete = async (messageId: number) => {
        // WEB SUPPORT: Use window.confirm for web
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('This message will be deleted forever. Are you sure?');
            if (!confirmed) return;

            try {
                await permanentDeleteMessage(messageId);
                await fetchTrashMessages(true);
            } catch (err) {
                console.error('Error deleting message:', err);
                window.alert('Error: Failed to delete message');
            }
            return;
        }

        // NATIVE SUPPORT: Use React Native Alert
        Alert.alert(
            'Delete Permanently',
            'This message will be deleted forever. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await permanentDeleteMessage(messageId);
                            await fetchTrashMessages(true);
                        } catch (err) {
                            console.error('Error deleting message:', err);
                            Alert.alert('Error', 'Failed to delete message');
                        }
                    },
                },
            ]
        );
    };

    const handleEmptyTrash = () => {
        // WEB SUPPORT: Use window.confirm for web
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('All messages in trash will be permanently deleted. Are you sure?');
            if (!confirmed) return;

            (async () => {
                try {
                    await emptyTrash();
                    await fetchTrashMessages(true);
                    window.alert('Success: Trash emptied successfully');
                } catch (err) {
                    console.error('Error emptying trash:', err);
                    window.alert('Error: Failed to empty trash');
                }
            })();
            return;
        }

        // NATIVE SUPPORT: Use React Native Alert
        Alert.alert(
            'Empty Trash',
            'All messages in trash will be permanently deleted. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Empty Trash',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await emptyTrash();
                            await fetchTrashMessages(true);
                            Alert.alert('Success', 'Trash emptied successfully');
                        } catch (err) {
                            console.error('Error emptying trash:', err);
                            Alert.alert('Error', 'Failed to empty trash');
                        }
                    },
                },
            ]
        );
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item }: { item: TrashMessage }) => (
        <View style={styles.messageCard}>
            <View style={[styles.cardIndicator, { backgroundColor: colors.textTertiary }]} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={styles.groupBadge}>
                        <Ionicons name="people" size={12} color={colors.textTertiary} />
                        <Text style={styles.groupName} numberOfLines={1}>Group {item.group_id}</Text>
                    </View>
                    <Text style={styles.timestamp}>Deleted: {formatTime(item.deleted_at)}</Text>
                </View>

                <Text style={styles.messageText} numberOfLines={3}>{item.content}</Text>

                <View style={styles.cardActions}>
                    <Pressable
                        style={({ pressed }) => [styles.actionBtn, styles.restoreBtn, pressed && styles.pressed]}
                        onPress={() => handleRestore(item.id)}
                    >
                        <Ionicons name="arrow-undo-outline" size={16} color={colors.success} />
                        <Text style={[styles.actionText, { color: colors.success }]}>Restore</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.pressed]}
                        onPress={() => handlePermanentDelete(item.id)}
                    >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete Forever</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading trash...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </Pressable>
                    <View>
                        <Text style={styles.title}>Trash Bin</Text>
                        <Text style={styles.subtitle}>{messages.length} deleted messages</Text>
                    </View>
                </View>
                {messages.length > 0 && (
                    <Pressable style={styles.emptyTrashBtn} onPress={handleEmptyTrash}>
                        <Ionicons name="trash" size={18} color={colors.error} />
                        <Text style={styles.emptyTrashText}>Empty</Text>
                    </Pressable>
                )}
            </View>

            {/* Content */}
            {messages.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="trash-bin-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Trash is Empty</Text>
                    <Text style={styles.emptyDesc}>Deleted messages will appear here</Text>
                </View>
            ) : (
                <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surface,
        ...shadows.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    emptyTrashBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#FEE',
    },
    emptyTrashText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.error,
    },
    list: {
        padding: 16,
        gap: 12,
    },
    messageCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        ...shadows.md,
    },
    cardIndicator: {
        width: 4,
    },
    cardContent: {
        flex: 1,
        padding: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    groupBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surfaceHighlight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        maxWidth: '60%',
    },
    groupName: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    timestamp: {
        fontSize: 11,
        color: colors.textTertiary,
    },
    messageText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    restoreBtn: {
        borderColor: colors.success,
        backgroundColor: '#F0FDF4',
    },
    deleteBtn: {
        borderColor: colors.error,
        backgroundColor: '#FEF2F2',
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    pressed: {
        opacity: 0.7,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
