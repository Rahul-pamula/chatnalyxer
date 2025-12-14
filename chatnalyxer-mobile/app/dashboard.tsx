import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Button, RefreshControl, Alert, Pressable, Platform } from 'react-native';
import { BASE_URL } from '../src/config';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { deleteMessage, deleteAllMessages, getSelectedGroups, stopWhatsApp, getPriorityMessages } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../src/theme/colors';

type Group = {
  id: number;
  name: string;
  whatsapp_id: string;
  is_selected: boolean;
  created_at: string;
};

type Message = {
  id: number;
  content: string;
  group_id: number;
  sender_id: number;
  created_at: string;
  groupName?: string;
  groupId?: number;
  priority_level?: string;
  urgency_score?: number;
  deadline_extracted?: string;
  extracted_keywords?: string;
  is_priority?: number;
};

export default function Dashboard() {
  const router = useRouter();
  const { token, signOut } = useAuth();
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSelectedGroups();
  }, []);

  useEffect(() => {
    if (selectedGroups.length > 0) {
      fetchMessages();
    }
  }, [selectedGroups]);

  useEffect(() => {
    if (selectedGroups.length === 0 || !autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchMessages(true); // Silent refresh
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedGroups, autoRefreshEnabled]);

  const fetchSelectedGroups = async () => {
    try {
      setError(null);
      const data = await getSelectedGroups();
      setSelectedGroups(data);

      if (data.length === 0) {
        setMessages([]);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching selected groups:', err);
      setError('Failed to fetch selected groups');
      setLoading(false);
    }
  };

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // Fetch only priority messages for each selected group using authenticated API
      const messagePromises = selectedGroups.map(async (group) => {
        const groupMessages = await getPriorityMessages(group.id);
        return groupMessages.map((msg: Message) => ({
          ...msg,
          groupName: group.name,
          groupId: group.id
        }));
      });

      const allMessages = await Promise.all(messagePromises);
      const flatMessages = allMessages.flat();

      // Sort messages
      flatMessages.sort((a, b) => {
        const hasDeadlineA = a.deadline_extracted ? 1 : 0;
        const hasDeadlineB = b.deadline_extracted ? 1 : 0;

        if (hasDeadlineA !== hasDeadlineB) {
          return hasDeadlineB - hasDeadlineA;
        }

        if (a.deadline_extracted && b.deadline_extracted) {
          return new Date(a.deadline_extracted).getTime() - new Date(b.deadline_extracted).getTime();
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setMessages(flatMessages);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to fetch messages');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSelectedGroups();
    setRefreshing(false);
  };

  const handleGoToGroupSelection = () => {
    router.push('/groups');
  };

  const handleDeleteMessage = async (messageId: number) => {
    // WEB SUPPORT: Alert.alert doesn't work on web
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Move this message to trash? You can restore it later.');
      if (!confirmed) {
        console.log("Delete cancelled");
        return;
      }
      // Proceed to delete
      await performDeleteMessage(messageId);
      return;
    }

    // NATIVE SUPPORT: Use React Native Alert
    Alert.alert(
      'Move to Trash',
      'This message will be moved to trash. You can restore it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDeleteMessage(messageId)
        },
      ]
    );
  };

  const performDeleteMessage = async (messageId: number) => {
    try {
      console.log('=== DELETE MESSAGE START ===');
      console.log('Message ID:', messageId);
      console.log('Calling deleteMessage API...');

      const result = await deleteMessage(messageId);

      console.log('Delete API response:', result);
      console.log('Refreshing messages...');

      await fetchMessages();

      console.log('Message deleted successfully');
      console.log('=== DELETE MESSAGE END ===');
    } catch (err: any) {
      console.error('=== DELETE MESSAGE ERROR ===');
      console.error('Error object:', err);
      console.error('Error response:', err.response);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);

      if (err.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again', [
          { text: 'OK', onPress: () => router.push('/login') }
        ]);
      } else {
        const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete message';
        console.error('Showing error to user:', errorMsg);
        if (Platform.OS === 'web') {
          window.alert(`Error: ${errorMsg}`);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    }
  };

  const handleDeleteAllMessages = async () => {
    // WEB SUPPORT: Use window.confirm for web
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('This will clear all messages. Are you sure?');
      if (!confirmed) return;

      try {
        await deleteAllMessages();
        await fetchMessages();
      } catch (err: any) {
        window.alert('Error: Failed to delete all messages');
      }
      return;
    }

    // NATIVE SUPPORT: Use React Native Alert
    Alert.alert(
      'Delete All',
      'This will clear all messages. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllMessages();
              await fetchMessages();
            } catch (err: any) {
              // Error handling...
            }
          },
        },
      ]
    );
  };

  const handleWhatsAppLogout = async () => {
    // WEB SUPPORT: Alert.alert is often buggy on web. Use native confirm.
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to disconnect WhatsApp? This will stop message analysis.');
      if (!confirmed) {
        console.log("WhatsApp logout cancelled (Web)");
        return;
      }
      // Proceed to disconnect
      await performWhatsAppLogout();
      return;
    }

    // NATIVE SUPPORT: Use React Native Alert
    Alert.alert(
      'Disconnect WhatsApp',
      'Are you sure you want to disconnect? This will stop message analysis.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: performWhatsAppLogout
        }
      ]
    );
  };

  const performWhatsAppLogout = async () => {
    console.log("Disconnecting WhatsApp...");
    try {
      const response = await fetch(`${BASE_URL}/whatsapp/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token?.trim()}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        console.log("WhatsApp disconnected successfully");
        Alert.alert('Success', 'WhatsApp disconnected. Redirecting to setup...', [
          { text: 'OK', onPress: () => router.replace('/setup') }
        ]);
        // Also redirect after a short delay if user doesn't click OK
        setTimeout(() => router.replace('/setup'), 2000);
      } else {
        console.log("WhatsApp disconnect failed:", response.status);
        Alert.alert('Error', 'Failed to disconnect WhatsApp');
      }
    } catch (error) {
      console.error("WhatsApp disconnect error:", error);
      Alert.alert('Error', 'Network error during disconnect');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageCard}>
      <View style={styles.cardIndicator} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.groupBadge}>
            <Ionicons name="people" size={12} color={colors.primary} />
            <Text style={styles.groupName} numberOfLines={1}>{item.groupName}</Text>
          </View>
          <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
        </View>

        <Text style={styles.messageText}>{item.content}</Text>

        {item.deadline_extracted && (
          <View style={styles.deadlineBadge}>
            <Ionicons name="alarm" size={14} color={colors.warning} />
            <Text style={styles.deadlineText}>
              Due: {new Date(item.deadline_extracted).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
            onPress={() => handleDeleteMessage(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyzing messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            {selectedGroups.length} Active Groups
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/trash')}>
            <Ionicons name="trash-bin-outline" size={22} color={colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleWhatsAppLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          </Pressable>
        </View>
      </View>

      {/* Quick Actions Bar */}
      <View style={styles.actionBar}>
        <Pressable style={styles.chip} onPress={handleGoToGroupSelection}>
          <Ionicons name="settings-outline" size={16} color={colors.primary} />
          <Text style={styles.chipText}>Groups</Text>
        </Pressable>

        <Pressable style={[styles.chip, styles.chipDanger]} onPress={handleDeleteAllMessages}>
          <Ionicons name="trash" size={16} color={colors.error} />
          <Text style={[styles.chipText, { color: colors.error }]}>Clear All</Text>
        </Pressable>

        <Pressable style={styles.chip} onPress={() => fetchMessages()}>
          <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          <Text style={styles.chipText}>Refresh</Text>
        </Pressable>
      </View>

      {/* Active Groups Display */}
      {selectedGroups.length > 0 && (
        <View style={styles.groupsSection}>
          <Text style={styles.groupsSectionTitle}>Active Groups:</Text>
          <View style={styles.groupsList}>
            {selectedGroups.map((group) => (
              <View key={group.id} style={styles.groupChip}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={styles.groupChipText} numberOfLines={1}>{group.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Content */}
      {selectedGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Groups Selected</Text>
          <Text style={styles.emptyDesc}>Select WhatsApp groups to start analyzing messages.</Text>
          <Button title="Select Groups" onPress={handleGoToGroupSelection} color={colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyDesc}>No important messages found in your selected groups.</Text>
          <Button title="Refresh" onPress={() => fetchMessages()} color={colors.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => `${item.id}-${item.groupId}`}
          renderItem={renderMessage}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    ...shadows.sm,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  chipInactive: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: colors.textTertiary,
  },
  chipDanger: {
    borderColor: colors.error + '40',
    backgroundColor: '#FEF2F2',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  messageCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardIndicator: {
    width: 6,
    backgroundColor: colors.primary,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  groupName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 12,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  deadlineText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionBtn: {
    padding: 8,
  },
  pressed: {
    opacity: 0.7,
  },

  groupsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  groupsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    maxWidth: '48%',
    ...shadows.sm,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    flex: 1,
  },

  loadingText: { marginTop: 12, color: colors.textSecondary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
});
