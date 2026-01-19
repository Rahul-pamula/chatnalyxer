import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, StatusBar, Alert, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { colors, shadows } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';

interface Message {
  id: number;
  content: string;
  group_name?: string;
  ai_summary?: string;
  priority_level?: string;
  [key: string]: any;
}

interface Group {
  id: number;
  name: string;
  [key: string]: any;
}
import BottomNav from './components/BottomNav';
import GroupStories from './components/GroupStories';
import MessageCard from './components/MessageCard';
import { ChatWindow } from './components/ChatWindow';
import StatCard from './components/StatCard';
import SkeletonLoader from './components/SkeletonLoader';
import { scheduleLocalNotification, scheduleDeadlineReminders } from '../src/services/notifications';
import { SoundManager } from './components/SoundManager';
import AsyncStorage from '@react-native-async-storage/async-storage';



import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
  // ... (keep state and logic same) ...
  const router = useRouter();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const notifiedMessagesRef = React.useRef<Set<number>>(new Set());

  // ... (keep useEffects and handlers same) ...
  useEffect(() => {
    AsyncStorage.getItem('notifiedMessages').then(json => {
      if (json) {
        const ids = JSON.parse(json);
        ids.forEach((id: number) => notifiedMessagesRef.current.add(id));
      }
    });
  }, []);

  const handleDeleteMessage = async (messageId: number) => {
    console.log('🗑️ Delete button clicked for message:', messageId);

    // Use native confirmation for web, Alert for mobile
    let confirmed = false;
    if (Platform.OS === 'web') {
      confirmed = confirm('Move this message to trash?');
    } else {
      confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Delete Message',
          'Move this message to trash?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
          ]
        );
      });
    }

    if (!confirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMessages(messages.filter((m: any) => m.id !== messageId));
        console.log('✅ Message deleted successfully');
      } else {
        const errorText = await response.text();
        if (Platform.OS === 'web') {
          alert(`Failed to delete: ${errorText}`);
        } else {
          Alert.alert('Error', `Failed to delete: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete message');
      } else {
        Alert.alert('Error', 'Failed to delete message');
      }
    }
  };

  const fetchData = async () => {
    // ... (keep fetchData logic exactly as is) ...
    try {
      setLoading(true);

      // Fetch messages
      const messagesRes = await fetch(`${BASE_URL}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (messagesRes.ok) {
        const data = await messagesRes.json() as Message[];
        setMessages(data);
      }

      // Fetch selected groups only
      const groupsRes = await fetch(`${BASE_URL}/groups/selected`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (groupsRes.ok) {
        const data = await groupsRes.json() as Group[];
        setGroups(data);
      }

      // CHECK FOR NEW URGENT MESSAGES TO NOTIFY LOCALLY
      if (messagesRes.ok) {
        const freshMessages = await messagesRes.clone().json() as Message[];
        const urgentMessages = freshMessages.filter((m: any) =>
          (m.priority_level === 'CRITICAL' || m.priority_level === 'HIGH') &&
          !notifiedMessagesRef.current.has(m.id)
        );

        for (const msg of urgentMessages) {
          console.log('🔔 Triggering local notification for:', msg.id);
          await SoundManager.playUrgentSound();
          await scheduleLocalNotification(
            `URGENT: ${msg.group_name || 'New Message'}`,
            msg.ai_summary || msg.content,
            1
          );
          if (msg.deadline_extracted) {
            const deadlineDate = new Date(msg.deadline_extracted.substring(0, 19));
            await scheduleDeadlineReminders(deadlineDate, msg.ai_summary || msg.content);
          }
          notifiedMessagesRef.current.add(msg.id);
        }

        if (urgentMessages.length > 0) {
          AsyncStorage.setItem('notifiedMessages', JSON.stringify(Array.from(notifiedMessagesRef.current)));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(() => {
        fetchData();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

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

  // Calculate stats
  const totalMessages = messages.length;
  const criticalMessages = messages.filter((m: any) => m.priority_level === 'CRITICAL' || m.priority_level === 'HIGH').length;
  const withDeadlines = messages.filter((m: any) => m.deadline_extracted).length;
  const activeGroups = groups.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.gradientHeader}>
        <View style={styles.dashboardHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.dashboardTitle}>Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onRefresh} style={styles.headerIconBtn}>
              <Ionicons name="refresh-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/trash' as any)} style={styles.headerIconBtn}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards - Hidden for cleaner look */}
        {/* <View style={styles.statsContainer}>
          <StatCard
            icon="chatbubbles"
            label="Messages"
            value={totalMessages}
            color="#3b82f6"
            delay={0}
          />
          <StatCard
            icon="alert-circle"
            label="Urgent"
            value={criticalMessages}
            color="#f43f5e"
            delay={100}
          />
          <StatCard
            icon="calendar"
            label="Deadlines"
            value={withDeadlines}
            color="#f59e0b"
            delay={200}
          />
          <StatCard
            icon="people"
            label="Groups"
            value={activeGroups}
            color="#10b981"
            delay={300}
          />
        </View> */}
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
          <SkeletonLoader count={4} />
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
            {messages.map((message: any, index: number) => (
              <Animated.View
                key={message.id}
                entering={FadeInDown.delay(index * 50).springify()}
                layout={Layout.springify()}
              >
                <MessageCard
                  message={message}
                  onPress={() => handleMessagePress(message)}
                  onDelete={handleDeleteMessage}
                />
              </Animated.View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientHeader: {
    backgroundColor: colors.primary,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  dashboardTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginTop: 16,
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
