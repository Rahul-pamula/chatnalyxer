import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../src/theme/colors';
import { BASE_URL } from '../src/config';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const { token, user, signOut, refreshUser } = useAuth();
    const [whatsappStatus, setWhatsappStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CHECKING'>('CHECKING');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Refresh user data on focus (in case they edited profile)
    useFocusEffect(
        useCallback(() => {
            if (refreshUser) refreshUser();
            checkWhatsAppStatus();
        }, [])
    );

    const checkWhatsAppStatus = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${BASE_URL}/whatsapp/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data: any = await response.json();
                setWhatsappStatus(data.ready ? 'CONNECTED' : 'DISCONNECTED');
            } else {
                setWhatsappStatus('DISCONNECTED');
            }
        } catch (e) {
            setWhatsappStatus('DISCONNECTED');
        }
    };

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            // @ts-ignore
            if (window.confirm("Are you sure you want to log out?")) {
                signOut();
            }
        } else {
            Alert.alert(
                "Log Out",
                "Are you sure you want to log out?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Log Out", style: "destructive", onPress: signOut }
                ]
            );
        }
    };

    // Dynamic Role Content
    const getRoleStatusLine = () => {
        switch (user?.user_type) {
            case 'FACULTY': return "Managing academic communications intelligently";
            case 'CASUAL': return "Stay organized without the noise";
            default: return "Tracking your academic deadlines automatically";
        }
    };

    const getDisconnectedMessage = () => {
        switch (user?.user_type) {
            case 'FACULTY': return "Connect WhatsApp to track class announcements effortlessly";
            case 'CASUAL': return "Connect WhatsApp to manage important messages automatically";
            default: return "Connect WhatsApp to auto-detect exams and assignments";
        }
    };

    const StatusIndicator = ({ status, label }: { status: 'CONNECTED' | 'DISCONNECTED' | 'CHECKING', label: string }) => {
        const color = status === 'CONNECTED' ? colors.success : status === 'DISCONNECTED' ? colors.error : colors.warning;
        const icon = status === 'CONNECTED' ? 'checkmark-circle' : status === 'DISCONNECTED' ? 'alert-circle' : 'time';

        return (
            <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                    <Ionicons name={label === 'WhatsApp' ? 'logo-whatsapp' : 'mail'} size={20} color={colors.textSecondary} />
                    <Text style={styles.statusLabel}>{label}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon} size={14} color={color} />
                    <Text style={[styles.statusText, { color }]}>
                        {status === 'CHECKING' ? 'Checking...' : status === 'CONNECTED' ? 'Connected' : 'Disconnected'}
                    </Text>
                </View>
            </View>
        );
    };

    const PreferenceItem = ({ icon, label, hasSwitch = false }: { icon: any, label: string, hasSwitch?: boolean }) => (
        <TouchableOpacity style={styles.prefItem} disabled={hasSwitch} onPress={() => !hasSwitch && Alert.alert("Coming Soon", "This feature is in development.")}>
            <View style={styles.prefLeft}>
                <View style={styles.prefIconBox}>
                    <Ionicons name={icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.prefLabel}>{label}</Text>
            </View>
            {hasSwitch ? (
                <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#e2e8f0', true: colors.primary }}
                    thumbColor={'#fff'}
                />
            ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.username ? user.username[0].toUpperCase() : 'U'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.editBadge}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Ionicons name="pencil" size={14} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.nameText}>{user?.username || 'User'}</Text>
                    <Text style={styles.handleText}>@{user?.username?.toLowerCase().replace(/\s/g, '') || 'user'}</Text>

                    <View style={styles.roleBadge}>
                        <Ionicons name={user?.user_type === 'FACULTY' ? 'briefcase' : user?.user_type === 'CASUAL' ? 'person' : 'school'} size={12} color={colors.primary} />
                        <Text style={styles.roleText}>{user?.user_type || 'Student'}</Text>
                    </View>

                    <Text style={styles.statusTagline}>✨ {getRoleStatusLine()}</Text>
                </View>

                {/* System Status Card */}
                <Text style={styles.sectionTitle}>System Status</Text>
                <View style={styles.card}>
                    <StatusIndicator status={whatsappStatus} label="WhatsApp" />
                    {whatsappStatus === 'DISCONNECTED' && (
                        <View style={{ marginBottom: 12 }}>
                            <Text style={styles.disconnectMsg}>{getDisconnectedMessage()}</Text>
                            <TouchableOpacity style={styles.connectBtn} onPress={() => router.push('/setup')}>
                                <Text style={styles.connectBtnText}>Connect Now</Text>
                                <Ionicons name="arrow-forward" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* Check if user has an email linked */}
                    <StatusIndicator status={user?.email ? 'CONNECTED' : 'DISCONNECTED'} label="Email" />

                    <View style={styles.divider} />

                    <View style={styles.statusRow}>
                        <View style={styles.statusLeft}>
                            <Ionicons name="notifications" size={20} color={colors.textSecondary} />
                            <Text style={styles.statusLabel}>Notifications</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: colors.success + '15' }]}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                            <Text style={[styles.statusText, { color: colors.success }]}>Enabled</Text>
                        </View>
                    </View>
                </View>

                {/* Role-Based Information Section */}
                <Text style={styles.sectionTitle}>
                    {user?.user_type === 'CASUAL' ? 'About You' : user?.user_type === 'FACULTY' ? 'Professional Information' : 'Academic Information'}
                </Text>
                <View style={styles.card}>

                    {/* STUDENT VIEW */}
                    {(!user?.user_type || user?.user_type === 'STUDENT') && (
                        <>
                            <View style={styles.academicRow}>
                                <View style={styles.academicIcon}>
                                    <Ionicons name="business" size={22} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.academicLabel}>Institution</Text>
                                    <Text style={styles.academicValue}>{user?.profile_data?.collegeName || 'Not Set'}</Text>
                                </View>
                            </View>
                            <View style={[styles.divider, { marginVertical: 12 }]} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View style={styles.academicRow}>
                                    <View style={[styles.academicIcon, { backgroundColor: colors.accent + '20' }]}>
                                        <Ionicons name="book" size={20} color={colors.accent} />
                                    </View>
                                    <View>
                                        <Text style={styles.academicLabel}>Course</Text>
                                        <Text style={styles.academicValue}>{user?.profile_data?.course || 'Not Set'}</Text>
                                    </View>
                                </View>
                                <View style={styles.academicRow}>
                                    <View style={[styles.academicIcon, { backgroundColor: colors.secondary + '20' }]}>
                                        <Ionicons name="calendar" size={20} color={colors.secondary} />
                                    </View>
                                    <View>
                                        <Text style={styles.academicLabel}>Year</Text>
                                        <Text style={styles.academicValue}>{user?.profile_data?.department || 'Not Set'}</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}

                    {/* FACULTY VIEW */}
                    {user?.user_type === 'FACULTY' && (
                        <>
                            <View style={styles.academicRow}>
                                <View style={styles.academicIcon}>
                                    <Ionicons name="business" size={22} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.academicLabel}>Institution</Text>
                                    <Text style={styles.academicValue}>{user?.profile_data?.collegeName || 'Not Set'}</Text>
                                </View>
                            </View>
                            <View style={[styles.divider, { marginVertical: 12 }]} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View style={styles.academicRow}>
                                    <View style={[styles.academicIcon, { backgroundColor: colors.accent + '20' }]}>
                                        <Ionicons name="id-card" size={20} color={colors.accent} />
                                    </View>
                                    <View>
                                        <Text style={styles.academicLabel}>Designation</Text>
                                        <Text style={styles.academicValue}>{user?.profile_data?.designation || 'Not Set'}</Text>
                                    </View>
                                </View>
                                <View style={styles.academicRow}>
                                    <View style={[styles.academicIcon, { backgroundColor: colors.secondary + '20' }]}>
                                        <Ionicons name="flask" size={20} color={colors.secondary} />
                                    </View>
                                    <View>
                                        <Text style={styles.academicLabel}>Department</Text>
                                        <Text style={styles.academicValue}>{user?.profile_data?.department || 'Not Set'}</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}

                    {/* CASUAL VIEW */}
                    {user?.user_type === 'CASUAL' && (
                        <View style={styles.academicRow}>
                            <View style={[styles.academicIcon, { backgroundColor: colors.success + '20' }]}>
                                <Ionicons name="chatbubble-ellipses" size={22} color={colors.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.academicLabel}>Bio / Usage</Text>
                                <Text style={styles.academicValue} numberOfLines={3}>
                                    {user?.profile_data?.bio || "No bio set. Tap edit to explain how you use WhatsApp."}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Preferences */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.card}>
                    <PreferenceItem icon="notifications-outline" label="Notification Settings" hasSwitch />
                    <View style={styles.divider} />
                    <PreferenceItem icon="calendar-outline" label="Calendar Sync" />
                    <View style={styles.divider} />
                    <PreferenceItem icon="moon-outline" label="Appearance" />
                    <View style={styles.divider} />
                    <PreferenceItem icon="globe-outline" label="Language" />
                </View>

                {/* Account Actions */}
                <View style={styles.actionLinks}>
                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkText}>Help & Support</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkText}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow}>
                        <Text style={styles.linkText}>About Chatnalyxer</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0 (Beta)</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
        borderBottomWidth: 1, borderColor: colors.border
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
    content: { padding: 16 },

    // Profile Header
    profileHeader: { alignItems: 'center', marginBottom: 24 },
    avatarContainer: { position: 'relative', marginBottom: 12 },
    avatar: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#FFF'
    },
    avatarText: { fontSize: 36, fontWeight: '700', color: colors.primary },
    editBadge: {
        position: 'absolute', right: 0, bottom: 0,
        backgroundColor: colors.primary, padding: 6, borderRadius: 12,
        borderWidth: 2, borderColor: '#FFF'
    },
    nameText: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
    handleText: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
    roleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: colors.primary + '10', borderRadius: 20, marginBottom: 12
    },
    roleText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    statusTagline: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 20 },

    // Sections
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, marginTop: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    card: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16,
        ...shadows.sm, marginBottom: 24
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 0 },

    // Status Row
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusLabel: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8
    },
    statusText: { fontSize: 12, fontWeight: '700' },

    // Connect Button & Msg
    disconnectMsg: { fontSize: 13, color: colors.error, marginBottom: 8, marginTop: -4 },
    connectBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.success, padding: 12, borderRadius: 10, marginBottom: 8
    },
    connectBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

    // Academic Info
    academicRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    academicIcon: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center', alignItems: 'center'
    },
    academicLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
    academicValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },

    // Preferences
    prefItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
    prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    prefIconBox: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: colors.surfaceHighlight,
        justifyContent: 'center', alignItems: 'center'
    },
    prefLabel: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },

    // Actions
    actionLinks: { alignItems: 'center', gap: 16, marginBottom: 32 },
    linkRow: { paddingVertical: 4 },
    linkText: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },

    logoutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginBottom: 16,
        borderWidth: 1, borderColor: colors.error + '20'
    },
    logoutText: { color: colors.error, fontSize: 16, fontWeight: '700' },

    versionText: { textAlign: 'center', fontSize: 12, color: colors.textTertiary }
});
