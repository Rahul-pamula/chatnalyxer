import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { chatWithAI } from '../../src/services/api';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface ChatWindowProps {
    visible: boolean;
    onClose: () => void;
    initialContext?: string; // New prop for context
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export function ChatWindow({ visible, onClose, initialContext }: ChatWindowProps) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            text: "Hi! I'm your AI study assistant. I can help you find deadlines, summarize updates, or answer questions from your class PDFs. What do you need?",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const hasAuthorizedContext = useRef(false);

    // Auto-send context when window opens
    useEffect(() => {
        if (visible && initialContext && !hasAuthorizedContext.current) {
            hasAuthorizedContext.current = true; // Prevent duplicate sends
            const contextMsg = `I want to know more about this message: "${initialContext}"`;
            handleSend(contextMsg);
        }
        if (!visible) {
            hasAuthorizedContext.current = false; // Reset on close
        }
    }, [visible, initialContext]);

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textOverride) setInput('');
        setLoading(true);

        try {
            const response = await chatWithAI(userMsg.text);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.response,
                sender: 'ai',
                timestamp: new Date()
            };

            // Force immediate state update
            setMessages(prev => {
                const newMessages = [...prev, aiMsg];
                // Scroll to bottom after state update
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
                return newMessages;
            });
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting to the brain. Please try again.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible && flatListRef.current) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages, visible]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardView}
                >
                    <View style={styles.container}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTitleContainer}>
                                <Ionicons name="sparkles" size={20} color="#FFD700" />
                                <Text style={styles.headerTitle}>AI Assistant</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Messages */}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.messagesList}
                            renderItem={({ item }) => (
                                <Animated.View
                                    entering={FadeIn.duration(300)}
                                    style={[
                                        styles.messageBubble,
                                        item.sender === 'user' ? styles.userBubble : styles.aiBubble
                                    ]}
                                >
                                    <Text style={[
                                        styles.messageText,
                                        item.sender === 'user' ? styles.userText : styles.aiText
                                    ]}>
                                        {item.text}
                                    </Text>
                                    {item.sender === 'ai' && (
                                        <View style={styles.aiIcon}>
                                            <Ionicons name="logo-electron" size={12} color="rgba(255,255,255,0.5)" />
                                        </View>
                                    )}
                                </Animated.View>
                            )}
                        />

                        {/* Input Area */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Ask about deadlines, PDFs..."
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={input}
                                onChangeText={setInput}
                                onSubmitEditing={() => handleSend()}
                                returnKeyType="send"
                            />
                            <TouchableOpacity
                                style={[styles.sendButton, (!input.trim() && !loading) && styles.sendButtonDisabled]}
                                onPress={() => handleSend()}
                                disabled={!input.trim() || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Ionicons name="arrow-up" size={20} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}


const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        height: '85%', // Bottom sheet style
        backgroundColor: '#1A1A2E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    closeButton: {
        padding: 4,
    },
    messagesList: {
        padding: 20,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#6C63FF',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#2A2A40',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#FFF',
    },
    aiText: {
        color: '#E0E0E0',
    },
    aiIcon: {
        position: 'absolute',
        bottom: -18,
        left: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        backgroundColor: '#1A1A2E',
    },
    input: {
        flex: 1,
        height: 48,
        backgroundColor: '#2A2A40',
        borderRadius: 24,
        paddingHorizontal: 20,
        color: '#FFF',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginRight: 12,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#6C63FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#3A3A50',
        opacity: 0.5,
    },
});
