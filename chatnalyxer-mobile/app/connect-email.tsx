import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { linkEmail } from '../src/services/api';

export default function ConnectEmailScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and app password');
            return;
        }

        setLoading(true);
        try {
            await linkEmail(email, password, 'gmail');
            Alert.alert('Success', 'Email connected successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to connect email. Check your App Password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Connect Email</Text>
            <Text style={styles.desc}>
                To connect Gmail, you need to use an **App Password**, not your regular password.
            </Text>
            <Text style={styles.steps}>
                1. Go to Google Account Security{'\n'}
                2. Enable 2-Step Verification{'\n'}
                3. Search "App Passwords"{'\n'}
                4. Create new app password for "Chatnalyxer"{'\n'}
                5. Paste the 16-character code here
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Email Address (e.g. student@gmail.com)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                style={styles.input}
                placeholder="App Password (16 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {loading ? (
                <ActivityIndicator size="large" color="#0284c7" />
            ) : (
                <Button title="Connect" onPress={handleConnect} color="#0284c7" />
            )}

            <View style={{ marginTop: 20 }}>
                <Button title="Cancel" onPress={() => router.back()} color="#666" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        justifyContent: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
    },
    desc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20
    },
    steps: {
        fontSize: 12,
        color: '#444',
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        lineHeight: 20
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16
    }
});
