import { useState, useEffect } from 'react';
import { Button, FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { BASE_URL } from '../config';

export default function GroupSelectionScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${BASE_URL}/groups/`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGroups(data);

      // Pre-select groups that are already marked as selected in the backend
      const preSelected = {};
      data.forEach(group => {
        if (group.is_selected) {
          preSelected[group.id] = true;
        }
      });
      setSelected(preSelected);

    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const handleContinue = async () => {
    // Update selected groups in the backend
    try {
      const updatePromises = groups.map(async (group) => {
        const isSelected = selected[group.id] || false;
        if (group.is_selected !== isSelected) {
          const response = await fetch(`${BASE_URL}/groups/${group.id}/selection`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_selected: isSelected }),
          });

          if (!response.ok) {
            throw new Error(`Failed to update group ${group.id}`);
          }
        }
      });

      await Promise.all(updatePromises);
      navigation.replace('Dashboard');
    } catch (err) {
      console.error('Error updating group selections:', err);
      setError('Failed to save group selections');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title="Retry" onPress={fetchGroups} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No groups found</Text>
        <Button title="Refresh" onPress={fetchGroups} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Groups ({groups.length} available)</Text>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, selected[item.id] && styles.selected]}
            onPress={() => toggle(item.id)}
          >
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupId}>ID: {item.whatsapp_id}</Text>
          </TouchableOpacity>
        )}
      />
      <Button title="Continue" onPress={handleContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  card: { padding: 16, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 8 },
  selected: { backgroundColor: '#eef' },
  groupName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  groupId: { fontSize: 12, color: '#666' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorText: { fontSize: 16, color: '#d32f2f', textAlign: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 16 },
});
