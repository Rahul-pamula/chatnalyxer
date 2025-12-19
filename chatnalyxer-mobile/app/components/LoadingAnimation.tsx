import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../src/theme/colors';

const TIPS = [
    "💡 Tip: You can prioritize messages by group importance!",
    "🎯 Did you know? Our AI analyzes your messages in real-time!",
    "⚡ Pro tip: Set up notifications for critical messages only!",
    "🚀 Fun fact: We process images and PDFs automatically!",
    "✨ Tip: Use the calendar to track important events!",
    "🎨 Did you know? You can customize your dashboard view!",
    "🔔 Pro tip: Enable smart notifications for better focus!",
    "📊 Fun fact: Our AI learns from your message patterns!",
];

interface LoadingAnimationProps {
    message?: string;
}

export default function LoadingAnimation({ message = "Generating your pairing code..." }: LoadingAnimationProps) {
    const [currentTip, setCurrentTip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);
    const [dotCount, setDotCount] = useState(0);

    // Animated values
    const pulseAnim = new Animated.Value(1);
    const rotateAnim = new Animated.Value(0);

    useEffect(() => {
        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotate animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();

        // Dot animation
        const dotInterval = setInterval(() => {
            setDotCount(prev => (prev + 1) % 4);
        }, 500);

        // Change tip every 2.5 seconds
        const tipInterval = setInterval(() => {
            setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
        }, 2500);

        return () => {
            clearInterval(dotInterval);
            clearInterval(tipInterval);
        };
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            {/* Animated spinner */}
            <Animated.View
                style={[
                    styles.spinner,
                    {
                        transform: [
                            { scale: pulseAnim },
                            { rotate: spin },
                        ],
                    },
                ]}
            >
                <View style={styles.spinnerInner} />
            </Animated.View>

            {/* Loading message */}
            <Text style={styles.message}>
                {message}{'.'.repeat(dotCount)}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: rotateAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                </View>
            </View>

            {/* Fun tip */}
            <View style={styles.tipContainer}>
                <Text style={styles.tipText}>{currentTip}</Text>
            </View>

            {/* Estimated time */}
            <Text style={styles.timeText}>⏱️ Just a few seconds...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.background,
    },
    spinner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: colors.primary,
        borderTopColor: 'transparent',
        marginBottom: 30,
    },
    spinnerInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary + '20',
        margin: 6,
    },
    message: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    progressContainer: {
        width: '80%',
        marginBottom: 30,
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    tipContainer: {
        backgroundColor: colors.primary + '10',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        width: '90%',
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    tipText: {
        fontSize: 14,
        color: colors.textPrimary,
        textAlign: 'center',
        lineHeight: 20,
    },
    timeText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
});
