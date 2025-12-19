import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface Message {
    id: number;
    content: string;
    academic_context?: {
        summary?: string;
    };
    groupName?: string;
    priority_level?: string;
}

interface PodcastPlayerProps {
    messages: Message[];
}

export function PodcastPlayer({ messages }: PodcastPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            Speech.stop();
        };
    }, []);

    const generateDailySummary = () => {
        const priorityMessages = messages.filter(m => m.priority_level === 'CRITICAL' || m.priority_level === 'HIGH');

        if (priorityMessages.length === 0) {
            return "You have no high priority updates for today. Enjoy your free time!";
        }

        let script = "Here is your daily summary. ";

        // Group by Group Name
        const groups: Record<string, string[]> = {};
        priorityMessages.forEach(msg => {
            const gName = msg.groupName || "Unknown Group";
            if (!groups[gName]) groups[gName] = [];

            // Use summary if available, else content
            const text = msg.academic_context?.summary || msg.content;
            groups[gName].push(text);
        });

        Object.keys(groups).forEach(group => {
            script += `In ${group}: `;
            groups[group].forEach(update => {
                script += `${update}. `;
            });
        });

        script += "That's all for now.";
        return script;
    };

    const handlePlayPause = async () => {
        if (isPlaying) {
            await Speech.stop();
            setIsPlaying(false);
            return;
        }

        const text = generateDailySummary();
        setIsPlaying(true);
        setExpanded(true); // Expand player when playing

        Speech.speak(text, {
            language: 'en-US',
            pitch: 1.0,
            rate: 0.9,
            onDone: () => setIsPlaying(false),
            onStopped: () => setIsPlaying(false),
            onError: () => setIsPlaying(false),
        });
    };

    if (!expanded) {
        return (
            <Pressable style={styles.fab} onPress={handlePlayPause}>
                <Ionicons name="headset" size={24} color="#FFF" />
            </Pressable>
        );
    }

    return (
        <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={styles.playerContainer}
        >
            <View style={styles.playerContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="musical-notes" size={24} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Daily Digest</Text>
                    <Text style={styles.subtitle}>{isPlaying ? "Playing..." : "Paused"}</Text>
                </View>

                <Pressable onPress={handlePlayPause} style={styles.controlBtn}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={colors.primary} />
                </Pressable>

                <Pressable onPress={() => { Speech.stop(); setIsPlaying(false); setExpanded(false); }} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 90, // Above Chat FAB (which is usually bottom: 20)
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#8B5CF6', // Violet
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lg,
        zIndex: 100,
    },
    playerContainer: {
        position: 'absolute',
        bottom: 90,
        left: 20,
        right: 20,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
        ...shadows.lg,
        zIndex: 101,
        borderWidth: 1,
        borderColor: colors.border,
    },
    playerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    controlBtn: {
        padding: 8,
        backgroundColor: colors.background,
        borderRadius: 20,
    },
    closeBtn: {
        padding: 8,
    }
});
