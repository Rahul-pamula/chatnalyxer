import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';

interface Message {
    id: number;
    group_name: string;
    sender_name: string;
    content: string;
    ai_summary?: string;
    priority_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    created_at: string;
    media_type?: string;
}

interface MessageCardProps {
    message: Message;
    onPress: () => void;
    onDelete?: (messageId: number) => void;
}

export default function MessageCard({ message, onPress, onDelete }: MessageCardProps) {
    const getPriorityColor = () => {
        switch (message.priority_level) {
            case 'CRITICAL': return '#DC2626'; // Dark red for critical
            case 'HIGH': return colors.error;
            case 'MEDIUM': return colors.warning;
            case 'LOW': return colors.success;
            default: return colors.textSecondary;
        }
    };

    const getPriorityIcon = () => {
        switch (message.priority_level) {
            case 'CRITICAL': return 'alert';
            case 'HIGH': return 'alert-circle';
            case 'MEDIUM': return 'warning';
            case 'LOW': return 'checkmark-circle';
            default: return 'information-circle';
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.groupInfo}>
                    <View style={styles.groupAvatar}>
                        <Text style={styles.groupAvatarText}>
                            {message.group_name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.groupDetails}>
                        <Text style={styles.groupName}>{message.group_name}</Text>
                        <Text style={styles.sender}>{message.sender_name}</Text>
                    </View>
                </View>
                {/* Priority badge removed for cleaner UI */}
            </View>

            {/* Content */}
            <Text style={styles.content} numberOfLines={2}>
                {message.content}
            </Text>

            {/* AI Summary */}
            {message.ai_summary && (
                <View style={styles.aiSummary}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={styles.aiText} numberOfLines={2}>
                        {message.ai_summary}
                    </Text>
                </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.time}>{getTimeAgo(message.created_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {message.media_type && (
                        <View style={styles.mediaTag}>
                            <Ionicons
                                name={message.media_type === 'pdf' ? 'document' : 'image'}
                                size={14}
                                color={colors.primary}
                            />
                            <Text style={styles.mediaText}>{message.media_type.toUpperCase()}</Text>
                        </View>
                    )}
                    {onDelete && (
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                onDelete(message.id);
                            }}
                            style={styles.deleteButton}
                        >
                            <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    groupInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    groupAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '40',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    groupAvatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
    groupDetails: {
        flex: 1,
    },
    groupName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    sender: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '700',
    },
    content: {
        fontSize: 14,
        color: colors.textPrimary,
        lineHeight: 20,
        marginBottom: 12,
    },
    aiSummary: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.primary + '10',
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    aiText: {
        flex: 1,
        fontSize: 13,
        color: colors.primary,
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    time: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    mediaTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    mediaText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.primary,
    },
    deleteButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: colors.error + '15',
    },
});
