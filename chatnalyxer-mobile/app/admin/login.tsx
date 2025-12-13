import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BASE_URL } from '../../src/config';

export default function AdminLoginScreen() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            if (Platform.OS === 'web') {
                window.alert('Please enter username and password');
            } else {
                Alert.alert('Error', 'Please enter username and password');
            }
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // In a real app, store token. For MVP, just navigate.
                router.replace('/admin/dashboard');
            } else {
                Alert.alert('Login Failed', data.detail || 'Invalid credentials');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Admin Login</Text>

                <Text style={styles.label}>Username</Text>
                <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholder="Enter admin username"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Enter admin password"
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 24,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#0066cc',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#a0c4ff',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
