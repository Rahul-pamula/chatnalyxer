import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
} from 'react-native-reanimated';

export default function TypingIndicator() {
    const dot1 = useSharedValue(1);
    const dot2 = useSharedValue(1);
    const dot3 = useSharedValue(1);

    useEffect(() => {
        dot1.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 400 }),
                withTiming(1, { duration: 400 })
            ),
            -1
        );
        dot2.value = withRepeat(
            withSequence(
                withDelay(150, withTiming(0.4, { duration: 400 })),
                withTiming(1, { duration: 400 })
            ),
            -1
        );
        dot3.value = withRepeat(
            withSequence(
                withDelay(300, withTiming(0.4, { duration: 400 })),
                withTiming(1, { duration: 400 })
            ),
            -1
        );
    }, []);

    const dot1Style = useAnimatedStyle(() => ({
        opacity: dot1.value,
    }));

    const dot2Style = useAnimatedStyle(() => ({
        opacity: dot2.value,
    }));

    const dot3Style = useAnimatedStyle(() => ({
        opacity: dot3.value,
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.dot, dot1Style]} />
            <Animated.View style={[styles.dot, dot2Style]} />
            <Animated.View style={[styles.dot, dot3Style]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#334155',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 12,
        marginLeft: 16,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#94a3b8',
        marginHorizontal: 3,
    },
});
