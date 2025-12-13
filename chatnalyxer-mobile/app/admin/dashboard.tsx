import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BASE_URL } from '../../src/config';
import { Ionicons } from '@expo/vector-icons';

interface UserStatus {
    user_id: number;
    username: string;
    phone_number: string;
    is_active_scanner: boolean;
    status_message: string;
    pid?: number;
}

interface DashboardStats {
    total_users: number;
    active_sessions: number;
}

export default function AdminDashboardScreen() {
    const router = useRouter();
    const [users, setUsers] = useState<UserStatus[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboard = async () => {
        try {
            const response = await fetch(`${BASE_URL}/admin/dashboard`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
                setStats(data.stats);
            } else {
                console.error("Failed to fetch dashboard");
            }
        } catch (error) {
            console.error("Network error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        // Auto refresh every 10 seconds
        const interval = setInterval(fetchDashboard, 10000);
        return () => clearInterval(interval);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboard();
    };

    const handleStopUser = async (userId: number, username: string) => {
        const confirmMsg = `Are you sure you want to STOP backend analysis for user ${username}? This will kill the process immediately.`;

        const performKill = async () => {
            try {
                const response = await fetch(`${BASE_URL}/admin/stop-user/${userId}`, {
                    method: 'POST'
                });

                if (response.ok) {
                    if (Platform.OS === 'web') window.alert(`Stopped session for ${username}`);
                    else Alert.alert('Success', `Stopped session for ${username}`);
                    fetchDashboard();
                } else {
                    Alert.alert('Error', 'Failed to stop user session');
                }
            } catch (error) {
                Alert.alert('Error', 'Network error');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) performKill();
        } else {
            Alert.alert(
                'Confirm Kill Switch',
                confirmMsg,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'STOP SESSION', style: 'destructive', onPress: performKill }
                ]
            );
        }
    };

    const renderUserItem = ({ item }: { item: UserStatus }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                    <Text style={styles.username}>{item.username}</Text>
                    <View style={[styles.statusBadge, item.is_active_scanner ? styles.statusActive : styles.statusInactive]}>
                        <Text style={styles.statusText}>{item.is_active_scanner ? 'RUNNING' : 'STOPPED'}</Text>
                    </View>
                </View>
                <Text style={styles.detailText}>Phone: {item.phone_number}</Text>
                <Text style={styles.detailText}>Status: {item.status_message}</Text>
                {item.pid && <Text style={styles.detailText}>PID: {item.pid}</Text>}
            </View>

            {item.is_active_scanner && (
                <TouchableOpacity
                    style={styles.killButton}
                    onPress={() => handleStopUser(item.user_id, item.username)}
                >
                    <Ionicons name="power" size={20} color="white" />
                    <Text style={styles.killButtonText}>Stop</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <TouchableOpacity onPress={() => router.replace('/admin/login')}>
                    <Text style={{ color: '#0066cc' }}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats?.active_sessions || 0}</Text>
                    <Text style={styles.statLabel}>Active Scanners</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>User Sessions</Text>

            <FlatList
                data={users}
                renderItem={renderUserItem}
                keyExtractor={item => item.user_id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: 'white',
        padding: 20,
        paddingTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 15,
        gap: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 10,
    },
    listContent: {
        padding: 15,
        paddingTop: 0,
    },
    userCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    userInfo: {
        flex: 1,
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        gap: 10,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusActive: {
        backgroundColor: '#e8f5e9',
    },
    statusInactive: {
        backgroundColor: '#f5f5f5',
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    detailText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    killButton: {
        backgroundColor: '#ffebee',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    killButtonText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#c62828',
        marginTop: 2,
    }
});
