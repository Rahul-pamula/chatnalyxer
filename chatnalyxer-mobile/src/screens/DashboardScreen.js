import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Button, RefreshControl } from 'react-native';
import { BASE_URL } from '../config';

export default function DashboardScreen({ navigation }) {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSelectedGroups();
  }, []);

  useEffect(() => {
    if (selectedGroups.length > 0) {
      fetchMessages();
    }
  }, [selectedGroups]);

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

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch messages for each selected group
      const messagePromises = selectedGroups.map(async (group) => {
        const response = await fetch(`${BASE_URL}/messages/public?group_id=${group.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch messages for group ${group.id}`);
        }
        const groupMessages = await response.json();
        return groupMessages.map(msg => ({
          ...msg,
          groupName: group.name,
          groupId: group.id
        }));
      });

      const allMessages = await Promise.all(messagePromises);
      const flatMessages = allMessages.flat();

      // Sort messages by timestamp (newest first)
      flatMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setMessages(flatMessages);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSelectedGroups();
    setRefreshing(false);
  };

  const handleGoToGroupSelection = () => {
    navigation.navigate('GroupSelection');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderMessage = ({ item }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.groupName}>{item.groupName}</Text>
        <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
      </View>
      <Text style={styles.messageContent}>{item.content}</Text>
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
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Analyzing {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''}
        </Text>
        <Button title="Change Groups" onPress={handleGoToGroupSelection} />
      </View>

      <View style={styles.groupsList}>
        <Text style={styles.sectionTitle}>Selected Groups:</Text>
        {selectedGroups.map((group, index) => (
          <Text key={group.id} style={styles.groupItem}>
            • {group.name}
          </Text>
        ))}
      </View>

      {messages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No messages found</Text>
          <Text style={styles.subText}>Messages from selected groups will appear here</Text>
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
  groupName: { fontSize: 14, fontWeight: '500', color: '#0066cc' },
  timestamp: { fontSize: 12, color: '#999' },
  messageContent: { fontSize: 14, color: '#333' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 8 },
  subText: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 16 },
});
