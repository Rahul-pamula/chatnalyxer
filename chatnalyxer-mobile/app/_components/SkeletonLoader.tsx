import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../../src/theme/colors';

interface SkeletonLoaderProps {
    count?: number;
}

export default function SkeletonLoader({ count = 3 }: SkeletonLoaderProps) {
    const shimmerAnim = new Animated.Value(0);

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-300, 300],
    });

    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.avatar} />
                        <View style={styles.headerText}>
                            <View style={styles.titleBar} />
                            <View style={styles.subtitleBar} />
                        </View>
                    </View>
                    <View style={styles.contentBar} />
                    <View style={[styles.contentBar, { width: '80%' }]} />
                    <View style={styles.footer}>
                        <View style={styles.footerItem} />
                        <View style={styles.footerItem} />
                    </View>
                    <Animated.View
                        style={[
                            styles.shimmer,
                            {
                                transform: [{ translateX }],
                            },
                        ]}
                    />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceHighlight,
        marginRight: 12,
    },
    headerText: {
        flex: 1,
        justifyContent: 'center',
    },
    titleBar: {
        height: 14,
        width: '60%',
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 4,
        marginBottom: 6,
    },
    subtitleBar: {
        height: 12,
        width: '40%',
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 4,
    },
    contentBar: {
        height: 12,
        width: '100%',
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 4,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    footerItem: {
        height: 20,
        width: 80,
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 8,
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        width: 100,
    },
});
