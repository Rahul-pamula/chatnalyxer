import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();

    const tabs = [
        { name: 'Home', icon: 'home', activeIcon: 'home', route: '/dashboard' },
        { name: 'Search', icon: 'search-outline', activeIcon: 'search', route: '/search' },
        { name: 'Add', icon: 'add-circle-outline', activeIcon: 'add-circle', route: '/create' },
        { name: 'Analytics', icon: 'stats-chart-outline', activeIcon: 'stats-chart', route: '/analytics' },
        { name: 'Profile', icon: 'person-outline', activeIcon: 'person', route: '/profile' }
    ];

    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = pathname === tab.route;
                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => router.push(tab.route as any)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isActive ? tab.activeIcon : tab.icon as any}
                            size={26}
                            color={isActive ? colors.primary : colors.textSecondary}
                        />
                        {isActive && (
                            <View style={styles.activeIndicator} />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: 20,
        paddingTop: 12,
        paddingHorizontal: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -12,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.primary,
    },
});
