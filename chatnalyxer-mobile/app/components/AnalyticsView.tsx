import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { colors, shadows } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Message {
    id: number;
    content: string;
    urgency_score?: number;
    created_at: string;
    extracted_keywords?: string; // JSON string
    priority_level?: string; // 'CRITICAL' | 'HIGH' | ...
    deadline_extracted?: string | null;
}

interface AnalyticsViewProps {
    messages: Message[];
}

export function AnalyticsView({ messages }: AnalyticsViewProps) {
    // 1. Calculate Stress Score (Average Urgency 0-100)
    const urgencyScores = messages
        .map(m => m.urgency_score || 0)
        .filter(s => s > 0); // Only count analyzed messages

    const avgUrgency = urgencyScores.length > 0
        ? (urgencyScores.reduce((a, b) => a + b, 0) / urgencyScores.length) * 100 // Scale to 0-100
        : 0;

    // Normalize to 0-1 for ProgressChart
    const stressData = {
        labels: ["Stress"],
        data: [Math.min(avgUrgency / 100, 1)]
    };

    // 2. High Priority Count
    const highPriorityCount = messages.filter(m => m.priority_level === 'HIGH' || m.priority_level === 'CRITICAL').length;
    const pendingDeadlines = messages.filter(m => m.deadline_extracted && new Date(m.deadline_extracted) > new Date()).length;

    // 3. Activity Graph (Messages per day, last 5 days?)
    // Simplified: Just show dummy data or calculated data if enough points
    // For now, let's simulate a "Activity" trend based on timestamps if available, else standard curve

    // Group messages by date
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const activityData = last7Days.map(dateStr => {
        return messages.filter(m => m.created_at.startsWith(dateStr)).length;
    });

    // Chart Config
    const chartConfig = {
        backgroundColor: colors.background,
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`, // Primary color
        labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: colors.primary
        }
    };

    const stressColor = avgUrgency > 70 ? colors.error : avgUrgency > 40 ? colors.warning : colors.success;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* STRESS METER */}
            <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.cardTitle}>Group Stress Meter</Text>
                </View>

                <View style={styles.meterContainer}>
                    <ProgressChart
                        data={stressData}
                        width={width - 80}
                        height={160}
                        strokeWidth={16}
                        radius={60}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => {
                                // Dynamic color based on score
                                if (avgUrgency > 70) return `rgba(239, 68, 68, ${opacity})`; // Red
                                if (avgUrgency > 40) return `rgba(245, 158, 11, ${opacity})`; // Orange
                                return `rgba(16, 185, 129, ${opacity})`; // Green
                            }
                        }}
                        hideLegend={true}
                    />
                    <View style={styles.scoreOverlay}>
                        <Text style={[styles.scoreText, { color: stressColor }]}>{Math.round(avgUrgency)}%</Text>
                        <Text style={styles.scoreLabel}>Pressure</Text>
                    </View>
                </View>

                <Text style={styles.insightText}>
                    {avgUrgency > 70 ? "🔥 High Pressure! Lots of deadlines detected." :
                        avgUrgency > 40 ? "⚡ Moderate Activity. Keep an eye on updates." :
                            "🍃 Relaxed. No major urgent items."}
                </Text>
            </Animated.View>

            {/* KEY METRICS ROW */}
            <View style={styles.metricsRow}>
                <Animated.View entering={FadeInDown.delay(200)} style={[styles.metricCard, { marginRight: 12 }]}>
                    <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="star" size={20} color={colors.warning} />
                    </View>
                    <Text style={styles.metricValue}>{highPriorityCount}</Text>
                    <Text style={styles.metricLabel}>Important Items</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300)} style={styles.metricCard}>
                    <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                        <Ionicons name="alarm" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.metricValue}>{pendingDeadlines}</Text>
                    <Text style={styles.metricLabel}>Upcoming Deadlines</Text>
                </Animated.View>
            </View>

            {/* ACTIVITY GRAPH */}
            <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="analytics-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.cardTitle}>Activity Trend (7 Days)</Text>
                </View>

                <LineChart
                    data={{
                        labels: last7Days.map(d => d.slice(8)), // Show only day DD
                        datasets: [{ data: activityData }]
                    }}
                    width={width - 56} // Card padding
                    height={180}
                    chartConfig={{
                        ...chartConfig,
                        decimalPlaces: 0,
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 16
                    }}
                />
            </Animated.View>

            {/* TOPIC CLOUD (Simplified List) */}
            <Animated.View entering={FadeInDown.delay(500)} style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="chatbubbles-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.cardTitle}>Hot Topics</Text>
                </View>
                <View style={styles.topicsContainer}>
                    {/* Placeholder topics - in real app, parse extracted_keywords */}
                    {["Assignments", "Lab Record", "Exam", "Notes", "Project"].map((topic, i) => (
                        <View key={i} style={styles.topicChip}>
                            <Text style={styles.topicText}>#{topic}</Text>
                        </View>
                    ))}
                    <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 8 }}>
                        (Based on message frequency)
                    </Text>
                </View>
            </Animated.View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        ...shadows.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    meterContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    scoreOverlay: {
        position: 'absolute',
        alignItems: 'center',
    },
    scoreText: {
        fontSize: 32,
        fontWeight: '800',
    },
    scoreLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    insightText: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 8,
        fontWeight: '500',
    },
    metricsRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        ...shadows.sm,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    metricLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    topicsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    topicChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    topicText: {
        fontSize: 13,
        color: colors.textPrimary,
        fontWeight: '600',
    },
});
