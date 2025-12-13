import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Button, RefreshControl } from 'react-native';
import { BASE_URL } from '../config';
import { Linking } from 'react-native';

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

      // Sort by deadline with strict priority
      flatMessages.sort((a, b) => {
        // Messages with deadlines come first
        if (a.deadline_extracted && !b.deadline_extracted) return -1;
        if (!a.deadline_extracted && b.deadline_extracted) return 1;

        // Both have deadlines
        if (a.deadline_extracted && b.deadline_extracted) {
          const dateA = new Date(a.deadline_extracted);
          const dateB = new Date(b.deadline_extracted);
          const now = new Date();

          // Calculate days difference from now
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const startOfDateA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
          const startOfDateB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());

          const daysDiffA = Math.floor((startOfDateA - startOfToday) / (1000 * 60 * 60 * 24));
          const daysDiffB = Math.floor((startOfDateB - startOfToday) / (1000 * 60 * 60 * 24));

          // If different days, sort by days difference (0=today, 1=tomorrow, etc.)
          if (daysDiffA !== daysDiffB) {
            return daysDiffA - daysDiffB;
          }

          // Same day - check if times are specified
          const hasTimeA = dateA.getHours() !== 0 || dateA.getMinutes() !== 0;
          const hasTimeB = dateB.getHours() !== 0 || dateB.getMinutes() !== 0;

          // Messages with time come before messages without time
          if (hasTimeA && !hasTimeB) return -1;
          if (!hasTimeA && hasTimeB) return 1;

          // Both have time - sort by actual datetime
          if (hasTimeA && hasTimeB) {
            return dateA.getTime() - dateB.getTime();
          }

          // Both don't have time - sort by created_at
          return new Date(b.created_at) - new Date(a.created_at);
        }

        // Neither has deadline - sort by created_at
        return new Date(b.created_at) - new Date(a.created_at);
      });

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

  const getDeadlineText = (deadline) => {
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate - now;

    // Don't show if expired
    if (diffMs < 0) return null;

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Check if time is specified
    const hasTime = deadlineDate.getHours() !== 0 || deadlineDate.getMinutes() !== 0;
    const timeStr = hasTime ? ` at ${deadlineDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : '';

    // Same day with specific time - show HOUR countdown
    if (diffDays === 0 && hasTime) {
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `⏰ ${diffMins} minute${diffMins !== 1 ? 's' : ''} to expire`;
      }
      return `⏰ ${diffHours} hour${diffHours !== 1 ? 's' : ''} to expire`;
    }

    // Today without time
    if (diffDays === 0) {
      return `📅 Today`;
    }

    // Tomorrow
    if (diffDays === 1) {
      return `📅 Tomorrow${timeStr}`;
    }

    // Future dates - show date with "X days away"
    const dateStr = deadlineDate.toLocaleDateString('en-GB'); // DD-MM-YYYY format
    const daysAwayStr = `(${diffDays} day${diffDays !== 1 ? 's' : ''} away)`;

    if (hasTime) {
      return `📅 ${dateStr}${timeStr} ${daysAwayStr}`;
    } else {
      return `📅 ${dateStr} ${daysAwayStr}`;
    }
  };

  const renderMessage = ({ item }) => {
    const deadlineText = getDeadlineText(item.deadline_extracted);
    return (
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <Text style={styles.groupName}>{item.groupName}</Text>
          <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.messageContent}>{item.content}</Text>
        {deadlineText && (
          <Text style={styles.timestamp}>📅 {deadlineText}</Text>
        )}
      </View>
    );
  };

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
        <View style={styles.buttonContainer}>
          <Button title="Change Groups" onPress={handleGoToGroupSelection} />
          <Button title="Link WhatsApp Device" onPress={() => Linking.openURL('http://localhost:3000')} />
        </View>
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
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
