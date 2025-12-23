import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../src/theme/colors';
import { BASE_URL } from '../src/config';

type UserType = 'STUDENT' | 'FACULTY' | 'CASUAL';

export default function ProfileScreen() {
    const router = useRouter();
    const { token, user, signOut, refreshUser } = useAuth();

    const [selectedType, setSelectedType] = useState<UserType>('CASUAL');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [fetchingProfile, setFetchingProfile] = useState(true);

    // Form States
    const [collegeName, setCollegeName] = useState('');
    const [course, setCourse] = useState('');
    const [designation, setDesignation] = useState('');
    const [department, setDepartment] = useState('');
    const [bio, setBio] = useState('');

    // Initialize from cached user context first
    useEffect(() => {
        if (user) {
            if (user.user_type) {
                setSelectedType(user.user_type as UserType);
            }
            if (user.profile_data) {
                setCollegeName(user.profile_data.collegeName || '');
                setCourse(user.profile_data.course || '');
                setDesignation(user.profile_data.designation || '');
                setDepartment(user.profile_data.department || '');
                setBio(user.profile_data.bio || '');
            }
            setFetchingProfile(false);
        }
    }, [user]);

    // Background refresh (optional, but good for sync)
    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) return;
            try {
                const response = await fetch(`${BASE_URL}/users/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.user_type) setSelectedType(data.user_type as UserType);
                    if (data.profile_data) {
                        setCollegeName(data.profile_data.collegeName || '');
                        setCourse(data.profile_data.course || '');
                        setDesignation(data.profile_data.designation || '');
                        setDepartment(data.profile_data.department || '');
                        setBio(data.profile_data.bio || '');
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        if (token) {
            fetchProfile();
        }
    }, [token]);

    const handleSave = async () => {
        setLoading(true);
        try {
            let profileData: any = { bio };
            if (selectedType === 'STUDENT') {
                profileData = { ...profileData, collegeName, course, department };
            } else if (selectedType === 'FACULTY') {
                profileData = { ...profileData, collegeName, designation, department };
            }

            const response = await fetch(`${BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_type: selectedType,
                    profile_data: profileData
                })
            });

            if (!response.ok) throw new Error("Failed to update");

            // Refresh global user context
            if (refreshUser) {
                await refreshUser();
            }

            Alert.alert("Success", "Profile updated successfully");
            setIsEditing(false);
        } catch (error) {
            Alert.alert("Error", "Failed to save profile");
        } finally {
            setLoading(false);
        }
    };

    const renderField = (label: string, value: string, setValue: (s: string) => void, placeholder: string) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            {isEditing ? (
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder}
                />
            ) : (
                <Text style={styles.valueText}>{value || 'Not set'}</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            {fetchingProfile ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading profile...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.username ? user.username[0].toUpperCase() : 'U'}
                            </Text>
                        </View>
                        <Text style={styles.username}>@{user?.username || 'User'}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{selectedType}</Text>
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Personal Details</Text>
                        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                            <Text style={styles.editBtn}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        {isEditing && (
                            <View style={styles.typeSelector}>
                                <Text style={styles.label}>I am a:</Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                    {['STUDENT', 'FACULTY', 'CASUAL'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.typeChip,
                                                selectedType === type && styles.typeChipActive
                                            ]}
                                            onPress={() => setSelectedType(type as UserType)}
                                        >
                                            <Text style={[
                                                styles.typeText,
                                                selectedType === type && { color: '#FFF' }
                                            ]}>{type}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {(selectedType === 'STUDENT' || selectedType === 'FACULTY') &&
                            renderField('College / Institution', collegeName, setCollegeName, 'e.g. IIT Bombay')}

                        {selectedType === 'STUDENT' &&
                            renderField('Course', course, setCourse, 'e.g. B.Tech CS')}

                        {selectedType === 'FACULTY' &&
                            renderField('Designation', designation, setDesignation, 'e.g. Professor')}

                        {(selectedType === 'STUDENT' || selectedType === 'FACULTY') &&
                            renderField('Department', department, setDepartment, 'e.g. Mechanical')}

                        {selectedType === 'CASUAL' &&
                            renderField('Bio', bio, setBio, 'Short bio...')}
                    </View>

                    <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={20} color={colors.error} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                </ScrollView>
            )}

            {isEditing && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#FFF',
        borderBottomWidth: 1, borderColor: colors.border
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    content: { padding: 20 },

    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatar: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16
    },
    avatarText: { fontSize: 40, fontWeight: '800', color: colors.primary },
    username: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    roleBadge: {
        paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.success + '20',
        borderRadius: 12, borderWidth: 1, borderColor: colors.success
    },
    roleText: { fontSize: 12, fontWeight: '700', color: colors.success },

    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    editBtn: { fontSize: 16, color: colors.primary, fontWeight: '600' },

    card: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 20, ...shadows.sm,
        marginBottom: 24, paddingVertical: 24
    },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 8 },
    valueText: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
    input: {
        backgroundColor: colors.surfaceHighlight, borderRadius: 8, padding: 12,
        fontSize: 16, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border
    },

    typeSelector: { marginBottom: 24 },
    typeChip: {
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border
    },
    typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.error + '40',
        backgroundColor: '#FEF2F2'
    },
    logoutText: { color: colors.error, fontWeight: '700', fontSize: 16 },

    footer: {
        padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: colors.border
    },
    saveBtn: {
        backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16,
        alignItems: 'center', ...shadows.md
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
