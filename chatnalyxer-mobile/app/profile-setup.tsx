import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../src/theme/colors';
import { BASE_URL } from '../src/config';

type UserType = 'STUDENT' | 'FACULTY' | 'CASUAL';

export default function OnboardingScreen() {
    const router = useRouter();
    const { token, user, signOut, refreshUser } = useAuth(); // We might need to refresh user context after this
    const [selectedType, setSelectedType] = useState<UserType>('STUDENT');
    const [loading, setLoading] = useState(false);

    // Form States
    const [collegeName, setCollegeName] = useState('');
    const [course, setCourse] = useState(''); // Student
    const [designation, setDesignation] = useState(''); // Faculty
    const [department, setDepartment] = useState(''); // Faculty/Student
    const [bio, setBio] = useState(''); // Casual

    const handleSubmit = async () => {
        console.log('=== ONBOARDING SUBMIT START ===');
        setLoading(true);
        try {
            // Construct Profile Data based on Type
            let profileData: any = { bio };
            if (selectedType === 'STUDENT') {
                if (!collegeName || !course) {
                    Alert.alert("Missing Info", "Please fill in College and Course.");
                    setLoading(false);
                    return;
                }
                profileData = { ...profileData, collegeName, course, department };
            } else if (selectedType === 'FACULTY') {
                if (!collegeName || !designation) {
                    Alert.alert("Missing Info", "Please fill in College and Designation.");
                    setLoading(false);
                    return;
                }
                profileData = { ...profileData, collegeName, designation, department };
            }

            console.log('Profile Data:', profileData);
            console.log('User Type:', selectedType);
            console.log('Token:', token ? 'Present' : 'Missing');
            console.log('API URL:', `${BASE_URL}/users/profile`);

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

            console.log('Response Status:', response.status);
            const responseText = await response.text();
            console.log('Response Body:', responseText);

            if (!response.ok) {
                throw new Error(`Failed to update profile: ${response.status} - ${responseText}`);
            }

            // Parse the updated user data
            const updatedUser = JSON.parse(responseText);
            console.log('Updated user data:', updatedUser);

            // Success - Check refreshUser existence and call it
            if (refreshUser) {
                await refreshUser();
            } else {
                console.warn("refreshUser not available in context");
            }

            // Success - Navigate directly to setup
            console.log('=== ONBOARDING SUCCESS ===');
            Alert.alert("Success", "Profile updated successfully!");

            // Manual redirect is now safe because we updated _layout.tsx to allow it
            router.replace('/setup');

        } catch (error: any) {
            console.error('=== ONBOARDING ERROR ===');
            console.error('Error details:', error);
            Alert.alert("Error", error.message || "Could not save profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderOption = (type: UserType, icon: string, label: string, desc: string) => (
        <TouchableOpacity
            style={[styles.optionCard, selectedType === type && styles.optionSelected]}
            onPress={() => setSelectedType(type)}
            activeOpacity={0.9}
        >
            <View style={[styles.iconContainer, selectedType === type && styles.iconSelected]}>
                <Ionicons name={icon as any} size={24} color={selectedType === type ? '#FFF' : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, selectedType === type && styles.textSelected]}>{label}</Text>
                <Text style={[styles.optionDesc, selectedType === type && styles.textSelectedLight]}>{desc}</Text>
            </View>
            {selectedType === type && <Ionicons name="checkmark-circle" size={24} color={colors.primary} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Profile Setup</Text>
                <Text style={styles.subtitle}>We'll customize your AI experience based on your role.</Text>
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={async () => {
                        await signOut();
                        router.replace('/login');
                    }}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Type Selection */}
                <View style={styles.section}>
                    {renderOption('STUDENT', 'school', 'Student', 'I need help with assignments & deadlines.')}
                    {renderOption('FACULTY', 'briefcase', 'Faculty / Teacher', 'I manage classes and student updates.')}
                    {renderOption('CASUAL', 'person', 'Casual User', 'I just want to organize my personal chats.')}
                </View>

                {/* Dynamic Form */}
                <View style={styles.formSection}>
                    <Text style={styles.formTitle}>Details</Text>

                    {(selectedType === 'STUDENT' || selectedType === 'FACULTY') && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>College / Institution Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Parul University"
                                value={collegeName}
                                onChangeText={setCollegeName}
                            />
                        </View>
                    )}

                    {selectedType === 'STUDENT' && (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Course / Degree</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. B.Tech Computer Engineering"
                                    value={course}
                                    onChangeText={setCourse}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Year / Semester (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 3rd Year"
                                    value={department}
                                    onChangeText={setDepartment}
                                />
                            </View>
                        </>
                    )}

                    {selectedType === 'FACULTY' && (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Designation</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Professor, HOD"
                                    value={designation}
                                    onChangeText={setDesignation}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Department</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Mechanical Engineering"
                                    value={department}
                                    onChangeText={setDepartment}
                                />
                            </View>
                        </>
                    )}

                    {selectedType === 'CASUAL' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Short Bio (Optional)</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                placeholder="What do you use WhatsApp for mostly?"
                                multiline
                                value={bio}
                                onChangeText={setBio}
                            />
                        </View>
                    )}

                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Complete Setup</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 24, paddingTop: 60, backgroundColor: '#FFF' },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: colors.textSecondary },
    content: { padding: 20, paddingBottom: 100 },

    section: { gap: 12, marginBottom: 32 },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        ...shadows.sm,
    },
    optionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10', // 10% opacity primary
    },
    iconContainer: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16,
    },
    iconSelected: { backgroundColor: colors.primary },
    optionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    optionDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    textSelected: { color: colors.primary },
    textSelectedLight: { color: colors.primary },

    formSection: {},
    formTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },

    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFF',
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        ...shadows.md,
    },
    buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        marginTop: 12,
    },
    logoutText: { color: colors.error, fontSize: 14, fontWeight: '600' },
});
