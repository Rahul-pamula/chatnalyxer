import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../src/theme/colors';
import { BASE_URL } from '../src/config';
import QRCode from 'react-native-qrcode-svg';

interface ServiceHealth {
    backend: { status: string; port: number };
    session_manager: { status: string; port: number; active_sessions: number };
    admin_otp: { status: string; port: number };
    database: { status: string; total_users: number; total_messages: number };
}

interface UserSession {
    user_id: number;
    username: string;
    phone_number: string;
    port: number;
    status: string;
    uptime: string;
    pid?: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [health, setHealth] = useState<ServiceHealth | null>(null);
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [adminWhatsAppConnected, setAdminWhatsAppConnected] = useState(false);
    const [adminQR, setAdminQR] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch health status
            const healthRes = await fetch(`${BASE_URL}/admin/health`);
            if (healthRes.ok) {
                const healthData = await healthRes.json();
                setHealth(healthData);
            }

            // Fetch active sessions
            const sessionsRes = await fetch(`${BASE_URL}/admin/sessions/active`);
            if (sessionsRes.ok) {
                const sessionsData = await sessionsRes.json();
                setSessions(sessionsData.sessions || []);
            }

            // Fetch admin WhatsApp status
            const adminWARes = await fetch(`${BASE_URL}/admin/whatsapp/status`);
            if (adminWARes.ok) {
                const adminWAData = await adminWARes.json();
                setAdminWhatsAppConnected(adminWAData.connected || false);
                setAdminQR(adminWAData.qr_code || null);
            }
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Poll every 5 seconds
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleConnectAdminWhatsApp = async () => {
        try {
            const response = await fetch(`${BASE_URL}/admin/whatsapp/connect`, {
                method: 'POST'
            });
            if (response.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Failed to connect admin WhatsApp:', error);
        }
    };

    const handleDisconnectAdminWhatsApp = async () => {
        try {
            const response = await fetch(`${BASE_URL}/admin/whatsapp/disconnect`, {
                method: 'POST'
            });
            if (response.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Failed to disconnect admin WhatsApp:', error);
        }
    };

    const handleStopSession = async (userId: number) => {
        try {
            const response = await fetch(`${BASE_URL}/admin/users/${userId}/stop-session`, {
                method: 'POST'
            });
            if (response.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Failed to stop session:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>📊 Admin Dashboard</Text>
                    <Text style={styles.subtitle}>System Monitoring & Control</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Summary Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{health?.database.total_users || 0}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{sessions.length}</Text>
                    <Text style={styles.statLabel}>Active Sessions</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{health?.database.total_messages || 0}</Text>
                    <Text style={styles.statLabel}>Total Messages</Text>
                </View>
            </View>

            {/* Admin WhatsApp Connection */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📱 Admin WhatsApp</Text>
                {adminWhatsAppConnected ? (
                    <View>
                        <Text style={styles.connectedText}>✅ Connected</Text>
                        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnectAdminWhatsApp}>
                            <Text style={styles.buttonText}>Disconnect</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        {adminQR ? (
                            <View style={styles.qrContainer}>
                                <Text style={styles.qrText}>Scan with WhatsApp:</Text>
                                <QRCode value={adminQR} size={200} />
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.connectButton} onPress={handleConnectAdminWhatsApp}>
                                <Text style={styles.buttonText}>Connect WhatsApp</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Service Health */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>🖥️ Service Health</Text>
                <View style={styles.healthGrid}>
                    {/* Backend */}
                    <View style={styles.healthCard}>
                        <Text style={styles.healthTitle}>Backend API</Text>
                        <Text style={[styles.healthStatus, health?.backend.status === 'running' && styles.statusRunning]}>
                            {health?.backend.status === 'running' ? '✅' : '❌'} {health?.backend.status}
                        </Text>
                        <Text style={styles.healthPort}>Port: {health?.backend.port}</Text>
                    </View>

                    {/* Session Manager */}
                    <View style={styles.healthCard}>
                        <Text style={styles.healthTitle}>Session Manager</Text>
                        <Text style={[styles.healthStatus, health?.session_manager.status === 'running' && styles.statusRunning]}>
                            {health?.session_manager.status === 'running' ? '✅' : '❌'} {health?.session_manager.status}
                        </Text>
                        <Text style={styles.healthPort}>Port: {health?.session_manager.port}</Text>
                        <Text style={styles.healthSessions}>Sessions: {health?.session_manager.active_sessions}</Text>
                    </View>

                    {/* Admin OTP */}
                    <View style={styles.healthCard}>
                        <Text style={styles.healthTitle}>OTP Service</Text>
                        <Text style={[styles.healthStatus, health?.admin_otp.status === 'running' && styles.statusRunning]}>
                            {health?.admin_otp.status === 'running' ? '✅' : '❌'} {health?.admin_otp.status}
                        </Text>
                        <Text style={styles.healthPort}>Port: {health?.admin_otp.port}</Text>
                    </View>

                    {/* Database */}
                    <View style={styles.healthCard}>
                        <Text style={styles.healthTitle}>Database</Text>
                        <Text style={[styles.healthStatus, health?.database.status === 'connected' && styles.statusRunning]}>
                            {health?.database.status === 'connected' ? '✅' : '❌'} {health?.database.status}
                        </Text>
                        <Text style={styles.healthPort}>Users: {health?.database.total_users}</Text>
                        <Text style={styles.healthSessions}>Messages: {health?.database.total_messages}</Text>
                    </View>
                </View>
            </View>

            {/* Active User Sessions */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>👥 Active User Sessions ({sessions.length})</Text>
                {sessions.length === 0 ? (
                    <Text style={styles.noSessions}>No active sessions</Text>
                ) : (
                    sessions.map((session) => (
                        <View key={session.user_id} style={styles.sessionCard}>
                            <View style={styles.sessionHeader}>
                                <Text style={styles.sessionUser}>{session.username}</Text>
                                <Text style={[styles.sessionStatus, session.status === 'ready' && styles.statusReady]}>
                                    {session.status}
                                </Text>
                            </View>
                            <Text style={styles.sessionPhone}>📞 {session.phone_number}</Text>
                            <View style={styles.sessionFooter}>
                                <Text style={styles.sessionInfo}>Port: {session.port}</Text>
                                <Text style={styles.sessionInfo}>Uptime: {session.uptime}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.stopButton}
                                onPress={() => handleStopSession(session.user_id)}
                            >
                                <Text style={styles.stopButtonText}>Stop Session</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    logoutButton: {
        backgroundColor: colors.error,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutText: {
        color: '#fff',
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    connectedText: {
        fontSize: 16,
        color: colors.success,
        marginBottom: 12,
    },
    connectButton: {
        backgroundColor: colors.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    disconnectButton: {
        backgroundColor: colors.error,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
    qrContainer: {
        alignItems: 'center',
        padding: 16,
    },
    qrText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    healthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    healthCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    healthTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    healthStatus: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.error,
        marginBottom: 4,
    },
    statusRunning: {
        color: colors.success,
    },
    healthPort: {
        fontSize: 12,
        color: '#888',
    },
    healthSessions: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    noSessions: {
        textAlign: 'center',
        color: '#999',
        padding: 20,
    },
    sessionCard: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sessionUser: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    sessionStatus: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.warning,
        textTransform: 'uppercase',
    },
    statusReady: {
        color: colors.success,
    },
    sessionPhone: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    sessionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sessionInfo: {
        fontSize: 12,
        color: '#888',
    },
    stopButton: {
        backgroundColor: colors.error,
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 8,
    },
    stopButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});
