import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, shadows } from '../../src/theme/colors';

interface Message {
    id: number;
    group_name: string;
    sender_name: string;
    content: string;
    ai_summary?: string;
    priority_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    created_at: string;
    deadline_extracted?: string | null;
    media_type?: string;
}

interface MessageCardProps {
    message: Message;
    onPress: () => void;
    onDelete?: (messageId: number) => void;
}

export default function MessageCard({ message, onPress, onDelete }: MessageCardProps) {
    const router = useRouter();

    const getPriorityIcon = () => {
        switch (message.priority_level) {
            case 'CRITICAL': return 'alert';
            case 'HIGH': return 'alert-circle';
            case 'MEDIUM': return 'warning';
            case 'LOW': return 'checkmark-circle';
            default: return 'information-circle';
        }
    };

    const formatRealTimestamp = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        if (date.toDateString() === today.toDateString()) {
            return `Today at ${timeStr}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${timeStr}`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
    };

    const getDeadlineStatus = (deadline: string) => {
        if (!deadline) return null;

        // SUPER ROBUST FIX:
        // 1. Take only the "YYYY-MM-DDTHH:MM:SS" part (first 19 chars)
        // 2. This removes 'Z', '+05:30', etc.
        // 3. new Date() on this "clean" string forces Local Time interpretation everywhere
        const cleanIso = deadline.substring(0, 19);
        const deadlineDate = new Date(cleanIso);
        const now = new Date();

        // Calculate difference
        const diff = deadlineDate.getTime() - now.getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const days = Math.floor(hours / 24);

        if (diff < 0) return { label: 'Overdue', color: '#FF453A', icon: 'alert-circle' };

        // Show minutes if less than 60 mins
        if (hours < 1) {
            return { label: `Due in ${minutes + 1}m`, color: '#FF453A', icon: 'alarm' };
        }

        if (hours < 24) return { label: `Due in ${hours}h`, color: '#FF9500', icon: 'time' };
        return { label: `Due in ${days}d`, color: '#5E5CE6', icon: 'calendar' };
    };
    const deadlineStatus = message.deadline_extracted ? getDeadlineStatus(message.deadline_extracted) : null;

    // Animation for press
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    // Get color for priority border
    const getPriorityColor = (): string => {
        switch (message.priority_level) {
            case 'CRITICAL': return colors.error;
            case 'HIGH': return colors.warning;
            case 'MEDIUM': return colors.warning;
            case 'LOW': return colors.success;
            default: return colors.primary;
        }
    };

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                style={styles.cardWrapper}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <View style={[styles.card, { borderLeftColor: getPriorityColor(), borderLeftWidth: 5 }]}>
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
                        {/* Real Timestamp */}
                        <View style={styles.timestampContainer}>
                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.timestamp}>{formatRealTimestamp(message.created_at)}</Text>
                        </View>

                        {/* Deadline - Clickable to navigate to calendar */}
                        {message.deadline_extracted && deadlineStatus && (
                            <TouchableOpacity
                                style={[styles.deadlineContainer, { backgroundColor: deadlineStatus.color + '15' }]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    const cleanIso = message.deadline_extracted!.substring(0, 19);
                                    const deadlineDate = new Date(cleanIso).toISOString().split('T')[0];
                                    router.push(`/calendar?date=${deadlineDate}`);
                                }}
                            >
                                <Ionicons name={deadlineStatus.icon as any} size={14} color={deadlineStatus.color} />
                                <Text style={[styles.deadline, { color: deadlineStatus.color }]}>
                                    {deadlineStatus.label}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Notification Schedule Button - Replaces inline text */}
                        {message.deadline_extracted && (
                            <TouchableOpacity
                                style={styles.notificationButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    const cleanIso = message.deadline_extracted!.substring(0, 19);
                                    router.push({
                                        pathname: `/notifications/${message.id}`,
                                        params: {
                                            content: message.content,
                                            deadline: cleanIso,
                                            group_name: message.group_name
                                        }
                                    } as any);
                                }}
                            >
                                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        )}

                        {/* Delete button */}
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
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    cardWrapper: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 8,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
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
        fontSize: 17,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 3,
        letterSpacing: -0.3,
    },
    sender: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    content: {
        fontSize: 15,
        color: colors.textPrimary,
        lineHeight: 22,
        marginBottom: 14,
        marginLeft: 4,
    },
    aiSummary: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.primary + '15',
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        padding: 12,
        borderRadius: 10,
        marginBottom: 14,
        gap: 10,
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
        flexWrap: 'wrap',
        gap: 8,
    },
    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timestamp: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    deadlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.error + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    deadline: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.error,
    },
    deleteButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: colors.error + '15',
    },
    notificationButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: colors.primary + '15',
        marginLeft: 4,
    },
});
