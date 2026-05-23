import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, shadows } from '../../src/theme/colors';

interface StatCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number | string;
    color: string;
    delay?: number;
}

export default function StatCard({ icon, label, value, color, delay = 0 }: StatCardProps) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()}>
            <View style={[styles.card, { backgroundColor: color }, shadows.md]}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={24} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.value}>{value}</Text>
                <Text style={styles.label}>{label}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 20,
        padding: 20,
        minHeight: 130,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    value: {
        fontSize: 36,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.9)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
