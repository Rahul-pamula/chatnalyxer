import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';

export default function NotificationScheduleScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse params (they come as strings)
    const { id, content, deadline, group_name } = params;

    const deadlineDate = new Date(deadline as string);
    const now = new Date();

    // Check if this is an Alarm
    const contentStr = Array.isArray(content) ? content[0] : (content || '');
    const isAlarm = contentStr.toLowerCase().includes('alarm') ||
        contentStr.toLowerCase().includes('wake up');

    // Calculate reminder times
    // If Alarm, don't show "1 Day Before" etc. Show "At time of event"
    const reminderConfig = isAlarm
        ? [{ label: 'At time of event', ms: 0 }]
        : [
            { label: '1 Day Before', ms: 24 * 60 * 60 * 1000 },
            { label: '1 Hour Before', ms: 60 * 60 * 1000 },
            { label: '15 Minutes Before', ms: 15 * 60 * 1000 },
        ];

    const reminders = reminderConfig.map(r => {
        const time = new Date(deadlineDate.getTime() - r.ms);
        const isPast = now > time;
        return {
            ...r,
            time,
            status: isPast ? 'Sent' : 'Scheduled',
            icon: isAlarm ? 'alarm' : (isPast ? 'checkmark-circle' : 'time-outline'),
            color: isPast ? colors.success : (isAlarm ? colors.error : colors.primary)
        };
    });

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Schedule</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Message Summary */}
                <View style={styles.card}>
                    <Text style={styles.label}>MESSAGE</Text>
                    <Text style={styles.messageText}>{content}</Text>
                    <View style={styles.deadlineRow}>
                        <Ionicons name="calendar" size={16} color={colors.error} />
                        <Text style={styles.deadlineText}>
                            Deadline: {deadlineDate.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Timeline */}
                <Text style={styles.sectionTitle}>Scheduled Alerts</Text>

                <View style={styles.timeline}>
                    {reminders.map((reminder, index) => (
                        <View key={index} style={styles.timelineItem}>
                            {/* Line */}
                            {index !== reminders.length - 1 && <View style={styles.line} />}

                            {/* Icon */}
                            <View style={[styles.iconContainer, { backgroundColor: reminder.color + '15' }]}>
                                <Ionicons name={reminder.icon as any} size={20} color={reminder.color} />
                            </View>

                            {/* Details */}
                            <View style={styles.details}>
                                <Text style={styles.reminderLabel}>{reminder.label}</Text>
                                <Text style={styles.reminderTime}>{reminder.time.toLocaleString()}</Text>
                                <View style={[styles.statusBadge, {
                                    backgroundColor: reminder.status === 'Sent' ? colors.success + '15' : colors.primary + '15'
                                }]}>
                                    <Text style={[styles.statusText, {
                                        color: reminder.status === 'Sent' ? colors.success : colors.primary
                                    }]}>
                                        {reminder.status}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
                    <Text style={styles.infoText}>
                        Notifications are automatically scheduled based on the deadline. Ensure you have permissions enabled.
                    </Text>
                </View>

            </ScrollView>
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
        padding: 16,
        paddingTop: 60,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        ...shadows.sm,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    messageText: {
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 12,
        lineHeight: 22,
    },
    deadlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        padding: 8,
        borderRadius: 6,
        alignSelf: 'flex-start',
        gap: 6,
    },
    deadlineText: {
        fontSize: 13,
        color: colors.error,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    timeline: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        ...shadows.sm,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 24,
        position: 'relative',
    },
    line: {
        position: 'absolute',
        left: 20,
        top: 40,
        bottom: -20, // Connect to next item
        width: 2,
        backgroundColor: colors.border,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        zIndex: 1, // Above line
        backgroundColor: colors.surface, // To cover line
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    reminderLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    reminderTime: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9', // Light gray 
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 12,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    }
});
