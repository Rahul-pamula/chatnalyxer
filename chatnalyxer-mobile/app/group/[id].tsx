
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';
import { BASE_URL } from '../../src/config';
import MessageCard from '../components/MessageCard';

export default function GroupDetails() {
    const { id } = useLocalSearchParams(); // Group ID
    const router = useRouter();
    const { token } = useAuth();

    const [messages, setMessages] = useState<any[]>([]);
    const [groupName, setGroupName] = useState<string>('Group Details');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (id) {
            fetchGroupData();
        }
    }, [id]);

    const fetchGroupData = async () => {
        try {
            setLoading(true);

            // 1. Fetch group details (to get name)
            // Since we don't have a direct /groups/{id} endpoint exposed easily in strict REST, 
            // we can fetch all selected groups and find this one, or just trust the messages.
            // Better: use the list endpoint and find.
            const groupsRes = await fetch(`${BASE_URL}/groups/selected`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (groupsRes.ok) {
                const groups = await groupsRes.json();
                const group = groups.find((g: any) => g.id.toString() === id);
                if (group) setGroupName(group.name);
            }

            // 2. Fetch Important Messages for this group
            // Endpoint /messages?group_id={id} returns only HIGH/MEDIUM priority messages (as verified in backend)
            const msgsRes = await fetch(`${BASE_URL}/messages?group_id=${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (msgsRes.ok) {
                const data = await msgsRes.json();
                setMessages(data);

                // Fallback: If group name wasn't found in selected list (maybe inactive?), try from first message
                if (data.length > 0 && data[0].group_name) {
                    setGroupName(data[0].group_name);
                }
            }
        } catch (error) {
            console.error("Error fetching group details:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchGroupData();
    };

    const handleMessagePress = (message: any) => {
        // Navigate to full message view if needed
        // router.push(`/message/${message.id}` as any);
        // For now just console log or expand
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{groupName.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.headerTitle}>{groupName}</Text>
                    <Text style={styles.headerSubtitle}>Important Updates</Text>
                </View>
            </View>

            <View style={{ width: 40 }} />{/* Spacer for alignment */}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <Stack.Screen options={{ headerShown: false }} />

            {renderHeader()}

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <MessageCard message={item} onPress={() => handleMessagePress(item)} />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
                            <Text style={styles.emptyText}>All caught up!</Text>
                            <Text style={styles.emptySubtext}>No important messages found in this group.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent: 'space-between',
        ...shadows.sm,
    },
    backButton: {
        padding: 8,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        flexWrap: 'wrap', // Allow text to wrap
        textAlign: 'center', // Center align multiline text
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: 'center'
    }
});
