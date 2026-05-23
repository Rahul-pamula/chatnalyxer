import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../src/theme/colors';
import { BASE_URL } from '../src/config';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserType = 'STUDENT' | 'FACULTY' | 'CASUAL';

export default function EditProfileScreen() {
    const router = useRouter();
    const { token, user, signOut, refreshUser } = useAuth();

    // States
    const [loading, setLoading] = useState(false);

    // Common Fields
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState('');

    // Role Specific Fields
    const [collegeName, setCollegeName] = useState(user?.profile_data?.collegeName || '');
    const [course, setCourse] = useState(user?.profile_data?.course || '');
    const [designation, setDesignation] = useState(user?.profile_data?.designation || '');
    const [department, setDepartment] = useState(user?.profile_data?.department || '');
    const [bio, setBio] = useState(user?.profile_data?.bio || '');

    // Initialize state
    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            // user.email is not on the Type context sometimes depending on version, 
            // but we can try to fetch it or default to empty
            // Assuming we might have to fetch fresh profile to get email if not in context
        }
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        try {
            let profileData: any = { bio };

            // Validate & Construct based on role
            if (user?.user_type === 'STUDENT') {
                if (!collegeName.trim()) throw new Error("College name is required");
                profileData = { ...profileData, collegeName, course, department };
            } else if (user?.user_type === 'FACULTY') {
                if (!collegeName.trim()) throw new Error("College name is required");
                profileData = { ...profileData, collegeName, designation, department };
            }

            // 1. Update Profile Data
            const response = await fetch(`${BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_type: user?.user_type,
                    profile_data: profileData
                })
            });

            if (!response.ok) throw new Error("Failed to update profile details");

            // 2. Update Username/Email (If endpoints exist for basic info, assume basic user update or same endpoint)
            // NOTE: The current backend PUT /users/profile updates user_type and profile_data.
            // If we need to update username, we might need a separate call or update the backend.
            // For now, let's assume valid profile update only. 

            if (refreshUser) await refreshUser();

            Alert.alert("Success", "Profile updated successfully");
            router.back();

        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to save profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color={colors.primary} /> : (
                        <Text style={styles.saveText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Common Section */}
                    <Text style={styles.sectionTitle}>Basic Info</Text>
                    <View style={styles.formCard}>
                        {/* Phone (Read Only) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={[styles.inputWrapper, styles.readOnlyInput]}>
                                <Ionicons name="call-outline" size={18} color={colors.textTertiary} style={{ marginRight: 10 }} />
                                <Text style={styles.readOnlyText}>{user?.phone_number || '+91 0000000000'}</Text>
                                <Ionicons name="lock-closed" size={14} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                            </View>
                            <Text style={styles.hintText}>Phone number cannot be changed.</Text>
                        </View>

                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Your Name"
                                />
                            </View>
                        </View>

                        {/* Email (Optional) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="email@example.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Role Specific Section */}
                    <Text style={styles.sectionTitle}>
                        {user?.user_type === 'FACULTY' ? 'Professional Details' : user?.user_type === 'CASUAL' ? 'About You' : 'Academic Details'}
                    </Text>

                    <View style={styles.formCard}>
                        {/* STUDENT FORM */}
                        {user?.user_type === 'STUDENT' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>College / Institution</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            value={collegeName}
                                            onChangeText={setCollegeName}
                                            placeholder="e.g. Parul University"
                                        />
                                    </View>
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Course / Degree</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            value={course}
                                            onChangeText={setCourse}
                                            placeholder="e.g. B.Tech CSE"
                                        />
                                    </View>
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Year / Semester</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            value={department} // Using department field for Year/Sem storage as per schema flexibility
                                            onChangeText={setDepartment}
                                            placeholder="e.g. 3rd Year"
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {/* FACULTY FORM */}
                        {user?.user_type === 'FACULTY' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>College / Institution</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            value={collegeName}
                                            onChangeText={setCollegeName}
                                            placeholder="e.g. Parul University"
                                        />
                                    </View>
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Designation</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            value={designation}
                                            onChangeText={setDesignation}
                                            placeholder="e.g. Professor"
                                        />
                                    </View>
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Department</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            value={department}
                                            onChangeText={setDepartment}
                                            placeholder="e.g. Mechanical"
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {/* CASUAL FORM */}
                        {user?.user_type === 'CASUAL' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Short Bio</Text>
                                <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start' }]}>
                                    <TextInput
                                        style={[styles.input, { height: '100%', paddingTop: 10 }]}
                                        value={bio}
                                        onChangeText={setBio}
                                        placeholder="What do you use WhatsApp for?"
                                        multiline
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
    saveText: { fontSize: 16, fontWeight: '600', color: colors.primary, paddingHorizontal: 8 },

    content: { padding: 16 },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase' },
    formCard: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16,
        ...shadows.sm, marginBottom: 24
    },

    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },

    inputWrapper: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 10, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 12, height: 50
    },
    input: { flex: 1, fontSize: 15, color: colors.textPrimary },

    readOnlyInput: { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.8 },
    readOnlyText: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    hintText: { fontSize: 12, color: colors.textTertiary, marginTop: 4, marginLeft: 2 },
});
