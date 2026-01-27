import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { aiService, Message } from '../src/services/aiService';
import { VoiceService } from '../src/services/VoiceService';
import { BASE_URL } from '../src/config';
import { useAuth } from '../src/context/AuthContext';
import TypingIndicator from './_components/TypingIndicator';

export default function AIChatScreen() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const flatListRef = useRef<FlatList>(null);
    const { token } = useAuth();

    useEffect(() => {
        // Initial welcome message
        setMessages([
            {
                id: 'welcome',
                role: 'ai',
                content: 'Hello! I am your AI assistant. I have access to your WhatsApp messages and tasks. How can I help you today?',
                timestamp: new Date(),
            },
        ]);
    }, []);

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        try {
            const response = await aiService.chat(userMsg.content);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.response, // Backend returns { response: "text" }
                timestamp: new Date(),
                event_data: response.event_data // Save event details
            };

            setMessages((prev) => [...prev, aiMsg]);

            // Read response aloud if voice is enabled
            if (voiceEnabled) {
                await VoiceService.speak(response.response);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "I'm having trouble retrieving that information. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        const AnimatedComponent = isUser ? FadeInRight : FadeInLeft;

        return (
            <Animated.View
                entering={AnimatedComponent.springify()}
                style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.aiBubble,
                ]}
            >
                <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
                    {item.content}
                </Text>

                {/* Render Notification Button for AI Messages if event data exists */}
                {!isUser && item.event_data && (
                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => {
                            router.push({
                                pathname: `/notifications/${item.event_data?.id}`,
                                params: {
                                    content: item.event_data?.content,
                                    deadline: item.event_data?.deadline,
                                    group_name: item.event_data?.group_name
                                }
                            } as any);
                        }}
                    >
                        <Ionicons name="notifications-outline" size={16} color="#10b981" />
                    </TouchableOpacity>
                )}

                <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </Animated.View>
        );
    };

    const handleVoiceInput = async () => {
        try {
            if (isRecording) {
                // Stop recording
                setIsRecording(false);
                const audioUri = await VoiceService.stopListening();

                if (audioUri && token) {
                    setLoading(true);
                    // Transcribe audio to text
                    const transcribedText = await VoiceService.transcribeAudio(audioUri, BASE_URL, token);

                    if (transcribedText) {
                        setInputText(transcribedText);
                        // Auto-send after transcription
                        const userMsg: Message = {
                            id: Date.now().toString(),
                            role: 'user',
                            content: transcribedText,
                            timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, userMsg]);

                        const response = await aiService.chat(transcribedText);
                        const aiMsg: Message = {
                            id: (Date.now() + 1).toString(),
                            role: 'ai',
                            content: response.response,
                            timestamp: new Date(),
                            event_data: response.event_data // Save event details
                        };
                        setMessages((prev) => [...prev, aiMsg]);

                        if (voiceEnabled) {
                            await VoiceService.speak(response.response);
                        }
                    }
                    setLoading(false);
                }
            } else {
                // Start recording
                const hasPermission = await VoiceService.checkMicrophonePermission();
                if (!hasPermission) {
                    const granted = await VoiceService.requestMicrophonePermission();
                    if (!granted) {
                        Alert.alert('Permission Required', 'Microphone permission is required for voice input');
                        return;
                    }
                }

                await VoiceService.startListening();
                setIsRecording(true);
            }
        } catch (error) {
            console.error('Voice input error:', error);
            setIsRecording(false);
            setLoading(false);
        }
    };

    const toggleVoiceOutput = () => {
        setVoiceEnabled(!voiceEnabled);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>AI Assistant</Text>
                        <View style={styles.onlineBadge}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>Online</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={toggleVoiceOutput} style={styles.voiceToggle}>
                        <Ionicons
                            name={voiceEnabled ? 'volume-high' : 'volume-mute'}
                            size={24}
                            color={voiceEnabled ? '#10b981' : '#94a3b8'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/ai-tasks')} style={styles.tasksButton}>
                        <Ionicons name="list" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Chat Area */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.chatContainer}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListFooterComponent={loading ? <TypingIndicator /> : null}
                />

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={[styles.micButton, isRecording && styles.micButtonActive]}
                        onPress={handleVoiceInput}
                        disabled={loading}
                    >
                        <Ionicons
                            name={isRecording ? 'stop-circle' : 'mic'}
                            size={24}
                            color={isRecording ? '#ef4444' : '#fff'}
                        />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Ask me anything..."
                        placeholderTextColor="#999"
                        multiline
                        maxLength={500}
                        editable={!isRecording}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim() || loading || isRecording}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a', // Dark theme background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        backgroundColor: '#1e293b',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981', // Green
        marginRight: 4,
    },
    onlineText: {
        color: '#94a3b8',
        fontSize: 12,
    },
    tasksButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        marginLeft: 8,
    },
    voiceToggle: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    chatContainer: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 1,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#3b82f6', // Blue
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#334155', // Slate 700
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    aiText: {
        color: '#e2e8f0',
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    userTimestamp: {
        color: 'rgba(255,255,255,0.7)',
    },
    aiTimestamp: {
        color: '#94a3b8',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#1e293b',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        gap: 8,
    },
    micButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButtonActive: {
        backgroundColor: '#ef4444',
    },
    input: {
        flex: 1,
        backgroundColor: '#334155',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 16,
        maxHeight: 100,
        marginRight: 12,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#475569',
    },
    // New Style for Notification Button (Matches MessageCard.tsx)
    notificationButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(52, 211, 153, 0.15)', // Light green tint
        marginTop: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.3)',
    }
});
