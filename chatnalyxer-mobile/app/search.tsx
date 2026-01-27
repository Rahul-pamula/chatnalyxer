import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { colors } from '../src/theme/colors';
import BottomNav from './_components/BottomNav';

export default function Search() {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

            <View style={styles.header}>
                <Text style={styles.title}>Search</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.comingSoon}>🔍 Search Coming Soon</Text>
                <Text style={styles.description}>
                    Search through your messages, groups, and analytics
                </Text>
            </View>

            <BottomNav />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    comingSoon: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
});
