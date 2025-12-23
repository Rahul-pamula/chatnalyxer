import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    withRepeat,
    withTiming,
    useSharedValue,
    withSequence,
    FadeInUp
} from 'react-native-reanimated';

interface ChatFabProps {
    onPress: () => void;
}

export function ChatFab({ onPress }: ChatFabProps) {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.5);

    useEffect(() => {
        // Continuous gentle pulse animation
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1500 }),
                withTiming(1, { duration: 1500 })
            ),
            -1, // Infinite
            true // Reverse
        );

        // Glow effect pulse
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 1500 }),
                withTiming(0.4, { duration: 1500 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: scale.value * 1.1 }], // Glow is slightly larger
    }));

    return (
        <Animated.View exiting={FadeInUp} entering={FadeInUp.delay(500).springify()} style={styles.container}>
            {/* Outer Glow Ring */}
            <Animated.View style={[styles.glowRing, glowStyle]} />

            <Animated.View style={[styles.animContainer, animatedStyle]}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={onPress}
                    activeOpacity={0.8}
                >
                    <View style={styles.content}>
                        <Ionicons name="sparkles" size={28} color="#FFFFFF" style={{ marginRight: -2 }} />
                        {/* Sparkles icon implies AI/Magic more than chatbubbles */}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 30,
        left: 30,  // Changed from right to left
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        width: 80, // Ensure touch target is large
        height: 80,
    },
    animContainer: {
        // Just for animation transform
    },
    button: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#4F46E5', // Indigo-600
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        // Move shadows here so they follow border radius
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
    },
    content: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowRing: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#818CF8', // Indigo-400
        opacity: 0.4,
    }
});
