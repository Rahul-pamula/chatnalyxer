import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';
import BottomNav from './components/BottomNav';
import GroupStories from './components/GroupStories';
import MessageCard from './components/MessageCard';
import { ChatFab } from './components/ChatFab';
import { ChatWindow } from './components/ChatWindow';



export default function Dashboard() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleDeleteMessage = async (messageId: number) => {
    console.log('🗑️ Delete button clicked for message:', messageId);

    // Use window.confirm for web, Alert for mobile
    const confirmed = typeof window !== 'undefined' && window.confirm
      ? window.confirm('Move this message to trash?')
      : await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Delete Message',
          'Move this message to trash?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
          ]
        );
      });

    if (!confirmed) {
      console.log('❌ Delete cancelled by user');
      return;
    }

    console.log('⚠️ DELETE CONFIRMED - Starting delete process...');
    try {
      console.log('🔄 Sending DELETE request to:', `${BASE_URL}/messages/${messageId}`);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');

      const response = await fetch(`${BASE_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        console.log('✅ Message deleted successfully');
        setMessages(messages.filter((m: any) => m.id !== messageId));
      } else {
        const errorText = await response.text();
        console.error('❌ Delete failed:', response.status, errorText);
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(`Failed to delete: ${errorText}`);
        } else {
          Alert.alert('Error', `Failed to delete: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Failed to delete message');
      } else {
        Alert.alert('Error', 'Failed to delete message');
      }
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch messages
      const messagesRes = await fetch(`${BASE_URL}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessages(data);
      }

      // Fetch selected groups only
      const groupsRes = await fetch(`${BASE_URL}/groups/selected`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleGroupPress = (groupId: string) => {
    router.push(`/group/${groupId}` as any);
  };

  const handleMessagePress = (message: any) => {
    router.push(`/message/${message.id}` as any);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header with Title and Icons */}
      <View style={styles.dashboardHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.dashboardTitle}>Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/trash' as any)}>
            <Ionicons name="trash-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Groups */}
      <GroupStories
        groups={groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          unreadCount: g.unread_count
        }))}
        onGroupPress={handleGroupPress}
        onAddPress={() => router.push('/groups' as any)}
      />

      {/* Messages Feed */}
      <ScrollView
        style={styles.feed}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Link your WhatsApp to start receiving messages
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => router.push('/setup' as any)}
            >
              <Text style={styles.setupButtonText}>Setup WhatsApp</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.messagesList}>
            {messages.map((message: any) => (
              <MessageCard
                key={message.id}
                message={message}
                onPress={() => handleMessagePress(message)}
                onDelete={handleDeleteMessage}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav onAIChatPress={() => setIsChatOpen(true)} />

      {/* AI Chat Window */}
      <ChatWindow
        visible={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  dashboardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  feed: {
    flex: 1,
  },
  messagesList: {
    paddingTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  setupButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
