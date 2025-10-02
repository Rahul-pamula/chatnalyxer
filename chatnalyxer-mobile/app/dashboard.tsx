import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Button, RefreshControl } from 'react-native';
import { BASE_URL } from '../src/config';
import { useRouter } from 'expo-router';

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
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  useEffect(() => {
    fetchSelectedGroups();
  }, []);

  useEffect(() => {
    if (selectedGroups.length > 0) {
      fetchMessages();
    }
  }, [selectedGroups]);

  // Auto-refresh messages every 10 seconds when groups are selected (silent refresh)
  useEffect(() => {
    if (selectedGroups.length === 0 || !autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchMessages(true); // Silent refresh - no loading states
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [selectedGroups, autoRefreshEnabled]);

  const fetchSelectedGroups = async () => {
    try {
      setError(null);
      const response = await fetch(`${BASE_URL}/groups/selected`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
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

      // Fetch only priority messages for each selected group
      const messagePromises = selectedGroups.map(async (group) => {
        const response = await fetch(`${BASE_URL}/messages/priority/public?group_id=${group.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch priority messages for group ${group.id}`);
        }
        const groupMessages = await response.json();
        return groupMessages.map((msg: Message) => ({
          ...msg,
          groupName: group.name,
          groupId: group.id
        }));
      });

      const allMessages = await Promise.all(messagePromises);
      const flatMessages = allMessages.flat();

      // Sort messages by deadline priority (earliest deadline first)
      // Messages with deadlines come first, then by deadline time, then by created_at
      flatMessages.sort((a, b) => {
        const hasDeadlineA = a.deadline_extracted ? 1 : 0;
        const hasDeadlineB = b.deadline_extracted ? 1 : 0;

        // Prioritize messages with deadlines
        if (hasDeadlineA !== hasDeadlineB) {
          return hasDeadlineB - hasDeadlineA;
        }

        // Both have deadlines - sort by earliest deadline first
        if (a.deadline_extracted && b.deadline_extracted) {
          return new Date(a.deadline_extracted).getTime() - new Date(b.deadline_extracted).getTime();
        }

        // Neither has deadline - sort by newest created_at first
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Simplified - no priority colors or scoring needed since we sort by time
  const getAccentColor = () => {
    return '#0066cc'; // Single accent color for all priority messages
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageCard, { borderLeftColor: getAccentColor(), borderLeftWidth: 4 }]}>
      <View style={styles.messageHeader}>
        <View style={styles.messageHeaderLeft}>
          <Text style={styles.groupName}>{item.groupName}</Text>
        </View>
        <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
      </View>
      <Text style={styles.messageContent}>{item.content}</Text>
      {item.deadline_extracted && (
        <View style={styles.deadlineContainer}>
          <Text style={styles.deadlineText}>
            Deadline: {new Date(item.deadline_extracted).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title="Retry" onPress={fetchSelectedGroups} />
      </View>
    );
  }

  if (selectedGroups.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No groups selected for analysis</Text>
        <Text style={styles.subText}>Please select groups to see their messages</Text>
        <Button title="Select Groups" onPress={handleGoToGroupSelection} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Important Messages Dashboard</Text>
        <Text style={styles.subtitle}>
          Important messages from {selectedGroups.length} selected group{selectedGroups.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.mlIndicator}>
          Powered by ML Analysis - Only important messages shown (sorted by deadline priority)
        </Text>
        <View style={styles.buttonRow}>
          <Button title="Change Groups" onPress={handleGoToGroupSelection} />
          <Button title="Analytics" onPress={() => router.push('/analytics')} />
          <Button title="Refresh Now" onPress={() => fetchMessages()} />
          <Button
            title={autoRefreshEnabled ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
            onPress={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          />
        </View>
        {autoRefreshEnabled && (
          <Text style={styles.autoRefreshText}>
            Auto-refreshing every 10 seconds
          </Text>
        )}
      </View>

      <View style={styles.groupsList}>
        <Text style={styles.sectionTitle}>Selected Groups:</Text>
        {selectedGroups.map((group) => (
          <Text key={group.id} style={styles.groupItem}>
            • {group.name}
          </Text>
        ))}
      </View>

      {messages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No important messages found</Text>
          <Text style={styles.subText}>Important messages from your selected groups will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => `${item.id}-${item.groupId}`}
          renderItem={renderMessage}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          style={styles.messagesList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 8 },
  mlIndicator: { fontSize: 12, color: '#007acc', fontStyle: 'italic', marginBottom: 8 },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  autoRefreshText: { fontSize: 12, color: '#007acc', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  groupsList: { marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 },
  groupItem: { fontSize: 14, color: '#333', marginBottom: 2 },
  messagesList: { flex: 1 },
  messageCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageHeaderLeft: {
    flex: 1,
  },
  groupName: { fontSize: 14, fontWeight: '500', color: '#0066cc', marginBottom: 4 },
  timestamp: { fontSize: 12, color: '#999' },
  messageContent: { fontSize: 14, color: '#333', marginBottom: 8 },
  deadlineContainer: {
    backgroundColor: '#fff3cd',
    padding: 6,
    borderRadius: 4,
    marginBottom: 4,
  },
  deadlineText: { fontSize: 12, color: '#856404', fontWeight: '500' },
  // Removed keywords display for cleaner interface
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 8 },
  subText: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 16 },
});
