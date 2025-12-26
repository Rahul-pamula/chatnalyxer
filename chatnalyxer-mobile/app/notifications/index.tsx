import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../src/theme/colors';
import BottomNav from '../components/BottomNav';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { BASE_URL } from '../../src/config';
import { useRouter } from 'expo-router';

interface Notification {
    id: number;
    title: string;
    message: string;
    scheduled_time: string; // Corrected from scheduled_for
    event_deadline?: string; // New field from backend
    is_sent: boolean;
    is_read: boolean;
    priority: 'HIGH' | 'MEDIUM' | 'CRITICAL';
    created_at: string;
}

export default function Notifications() {
    const { token } = useAuth();
    const router = useRouter(); // Added router
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch(`${BASE_URL}/notifications/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const finalNotifications = data.notifications || [];
                setNotifications(finalNotifications);
            } else {
                console.error("❌ Notification Fetch Failed:", response.status);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (notificationId: number) => {
        try {
            await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return '#FF3B30';
            case 'HIGH': return '#FF9500';
            case 'MEDIUM': return '#007AFF';
            default: return colors.textSecondary;
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return 'alert-circle';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'information-circle';
            default: return 'notifications';
        }
    };

    const formatScheduledTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (diff < 0) return 'Sent';
        if (minutes < 60) return `In ${minutes} min`;
        if (hours < 24) return `In ${hours} hour${hours > 1 ? 's' : ''}`;
        if (days < 7) return `In ${days} day${days > 1 ? 's' : ''}`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const renderNotification = (notification: Notification) => (
        <TouchableOpacity
            key={notification.id}
            style={[
                styles.notificationCard,
                !notification.is_read && styles.unreadCard
            ]}
            onPress={() => {
                // Navigate to schedule details
                router.push({
                    pathname: `/notifications/${notification.id}`,
                    params: {
                        content: notification.message, // Map message to content for details screen
                        // Use event_deadline if available (for correct Timeline), else scheduled_time
                        deadline: notification.event_deadline || notification.scheduled_time,
                        group_name: "System Reminder" // Default since not all notifications have groups
                    }
                } as any);

                // Also mark as read
                if (!notification.is_read) {
                    markAsRead(notification.id);
                }
            }}
        >
            <View style={styles.notificationHeader}>
                <View style={styles.priorityBadge}>
                    <Ionicons
                        name={getPriorityIcon(notification.priority) as any}
                        size={16}
                        color={getPriorityColor(notification.priority)}
                    />
                    <Text style={[styles.priorityText, { color: getPriorityColor(notification.priority) }]}>
                        {notification.priority}
                    </Text>
                </View>
                <Text style={styles.timeText}>
                    {formatScheduledTime(notification.scheduled_time)}
                </Text>
            </View>

            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message}</Text>

            <View style={styles.notificationFooter}>
                <View style={styles.statusBadge}>
                    <Ionicons
                        name={notification.is_sent ? 'checkmark-circle' : 'time-outline'}
                        size={14}
                        color={notification.is_sent ? '#34C759' : '#FF9500'}
                    />
                    <Text style={styles.statusText}>
                        {notification.is_sent ? 'Sent' : 'Scheduled'}
                    </Text>
                </View>

                {/* Add Chevron to indicate clickable */}
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Notifications</Text>
                    <Text style={styles.subtitle}>
                        {notifications.length} scheduled reminder{notifications.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {(!notifications || notifications.length === 0) ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="notifications-outline" size={64} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                            <Text style={styles.emptySubtext}>
                                Create events to get smart reminders
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.notificationsList}>
                            {notifications.map(renderNotification)}
                        </View>
                    )}
                </ScrollView>
            )}
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationsList: {
        padding: 16,
    },
    notificationCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    unreadCard: {
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.background,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '600',
    },
    timeText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    notificationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
