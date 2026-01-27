import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, StatusBar, Alert, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { colors, shadows } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';

// Fix for web globals
declare const window: any;

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
import BottomNav from './_components/BottomNav';
import GroupStories from './_components/GroupStories';
import MessageCard from './_components/MessageCard';
import { ChatWindow } from './_components/ChatWindow';
import StatCard from './_components/StatCard';
import SkeletonLoader from './_components/SkeletonLoader';
import { scheduleLocalNotification, scheduleDeadlineReminders } from '../src/services/notifications';
import { SoundManager } from './_components/SoundManager';
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const notifiedMessagesRef = React.useRef<Set<number>>(new Set());

  // NEW: WhatsApp Status State
  const [whatsappStatus, setWhatsappStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CHECKING'>('CHECKING');
  const [isFocused, setIsFocused] = useState(true); // Simple focus tracking for now

  // ... (keep useEffects same) ...

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    const allIds = new Set(messages.map(m => m.id));
    setSelectedIds(allIds);
  };

  const invertSelection = () => {
    const newSelected = new Set<number>();
    messages.forEach(m => {
      if (!selectedIds.has(m.id)) {
        newSelected.add(m.id);
      }
    });
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    Alert.alert(
      'Delete Messages',
      `Are you sure you want to delete ${idsToDelete.length} messages?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic update
              setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
              setSelectedIds(new Set());

              // Send delete requests in parallel
              await Promise.all(idsToDelete.map(id =>
                fetch(`${BASE_URL}/messages/${id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                })
              ));
              console.log('✅ Bulk delete complete');
            } catch (error) {
              console.error('❌ Error in bulk delete:', error);
              Alert.alert('Error', 'Failed to delete some messages');
              onRefresh(); // Re-fetch to sync state
            }
          }
        }
      ]
    );
  };

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
      confirmed = (window as any).confirm('Move this message to trash?');
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
          (window as any).alert(`Failed to delete: ${errorText}`);
        } else {
          Alert.alert('Error', `Failed to delete: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      if (Platform.OS === 'web') {
        (window as any).alert('Failed to delete message');
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

  // NEW: Check WhatsApp Status on Mount & Focus logic
  const checkWhatsAppStatus = async () => {
    if (!token) return;
    try {
      // setWhatsappStatus('CHECKING'); // Don't flicker status
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
      console.log('Failed to check WA status', e);
      setWhatsappStatus('DISCONNECTED');
    }
  };

  // Run initial check
  useEffect(() => {
    checkWhatsAppStatus();

    // Re-check every time screen gains focus (using navigation listener if available, 
    // or just polling alongside data fetch for now since we have a polling interval)
  }, [token]);

  // Hook into existing polling interval to keep status fresh
  useEffect(() => {
    if (token) {
      const interval = setInterval(checkWhatsAppStatus, 5000); // Check every 5s
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
    // router.push(`/message/${message.id}` as any);
    console.log('Message pressed:', message.id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.gradientHeader}>
        {selectedIds.size > 0 ? (
          // SELECTION MODE HEADER
          <View style={styles.dashboardHeader}>
            <View style={styles.selectionLeft}>
              <TouchableOpacity onPress={clearSelection}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.selectionCount}>{selectedIds.size} Selected</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={selectAll} style={styles.headerIconBtn}>
                <Ionicons name="checkmark-done" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={invertSelection} style={styles.headerIconBtn}>
                <Ionicons name="swap-horizontal" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete} style={styles.headerIconBtn}>
                <Ionicons name="trash" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // NORMAL HEADER
          <View style={styles.dashboardHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.dashboardTitle}>Dashboard</Text>
              {whatsappStatus === 'CONNECTED' && (
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.dashboardSubtitle}>WhatsApp Live • Auto-detecting tasks</Text>
                </View>
              )}
            </View>
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
        )}
      </View>

      {/* NEW: Connect WhatsApp Card - Only if DISCONNECTED */}
      {whatsappStatus === 'DISCONNECTED' && (
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          layout={Layout.springify()}
          style={styles.connectCard}
        >
          <View style={styles.connectCardContent}>
            <View style={styles.connectIconContainer}>
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            </View>
            <View style={styles.connectTextContainer}>
              <Text style={styles.connectTitle}>WhatsApp not connected</Text>
              <Text style={styles.connectSubtitle}>
                Auto-detect exams & deadlines from group messages
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => router.push('/setup')}
          >
            <Text style={styles.connectButtonText}>Connect WhatsApp</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}



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
            {whatsappStatus === 'CONNECTED' ? (
              <>
                <Text style={{ fontSize: 40, marginBottom: 16 }}>✨</Text>
                <Text style={styles.emptyText}>You're all caught up</Text>
                <Text style={styles.emptySubtext}>
                  We'll notify you when something important appears.
                </Text>
              </>
            ) : (
              <>
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
              </>
            )}
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
                  onPress={() => {
                    if (selectedIds.size > 0) {
                      toggleSelection(message.id);
                    } else {
                      handleMessagePress(message);
                    }
                  }}
                  onLongPress={() => toggleSelection(message.id)}
                  onDelete={handleDeleteMessage}
                  selectionMode={selectedIds.size > 0}
                  isSelected={selectedIds.has(message.id)}
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
    </SafeAreaView >
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
  selectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    padding: 4,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  dashboardSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80', // bright green
    marginRight: 6,
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
  connectCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.2)', // Subtle green border
  },
  connectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  connectIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366', // WhatsApp Green
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectTextContainer: {
    flex: 1,
  },
  connectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  connectSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  connectButton: {
    backgroundColor: '#25D366', // WhatsApp Green
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
