import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getGroups, updateGroupSelection } from "../src/services/api";
import { useAuth } from "../src/context/AuthContext";

type Group = {
  id: number;
  name: string;
  whatsapp_id: string | null;
  is_selected: boolean;
  created_at: string;
};

export default function Groups() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (!token) return;
    loadGroups();
  }, [token]);

  // Auto-retry loading groups when coming from authentication
  useEffect(() => {
    if (token && groups.length === 0 && !loading) {
      setTimeout(() => {
        loadGroups();
      }, 500); // Small delay to ensure API is ready
    }
  }, [token, groups.length, loading]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await getGroups();
      setGroups(data);
    } catch (err) {
      console.error("❌ Failed to fetch groups:", err);
      Alert.alert("Error", "Failed to load groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupSelection = async (group: Group) => {
    if (updating[group.id]) return;

    setUpdating(prev => ({ ...prev, [group.id]: true }));

    try {
      await updateGroupSelection(group.id, !group.is_selected);

      setGroups(prevGroups =>
        prevGroups.map(g =>
          g.id === group.id ? { ...g, is_selected: !g.is_selected } : g
        )
      );

      const action = !group.is_selected ? 'enabled' : 'disabled';
      Alert.alert("Success", `Group "${group.name}" analysis ${action}`);
    } catch (err) {
      console.error("❌ Failed to update group selection:", err);
      Alert.alert("Error", "Failed to update group selection. Please try again.");
    } finally {
      setUpdating(prev => ({ ...prev, [group.id]: false }));
    }
  };

  const selectedCount = groups.filter(g => g.is_selected).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No Groups Found</Text>
        <Text style={styles.emptySubtitle}>
          Make sure WhatsApp integration is running and groups are synced
        </Text>
        <Pressable style={styles.primaryBtn} onPress={loadGroups}>
          <Text style={styles.primaryBtnText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Groups</Text>
      <Text style={styles.subtitle}>
        {selectedCount} of {groups.length} groups selected for analysis
      </Text>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.is_selected && styles.selectedCard]}
            onPress={() => toggleGroupSelection(item)}
            activeOpacity={0.9}
            disabled={updating[item.id]}
          >
            <View style={styles.cardInner}>
              <View style={[styles.avatar, item.is_selected && styles.selectedAvatar]}>
                <Text style={[styles.avatarText, item.is_selected && styles.selectedAvatarText]}>
                  {item.name?.[0]?.toUpperCase() || "G"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.whatsapp_id ? 'WhatsApp synced' : 'Local group'}
                </Text>
              </View>
              {updating[item.id] ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <View style={[styles.check, item.is_selected && styles.checkActive]} />
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Only messages from selected groups will be analyzed
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push("/dashboard")}>
          <Text style={styles.primaryBtnText}>View Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F7F8FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4, color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 20 },
  listContent: { paddingBottom: 16 },
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  selectedCard: {
    borderColor: "#93C5FD",
    backgroundColor: "#F0F9FF",
  },
  cardInner: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedAvatar: {
    backgroundColor: "#2563EB",
  },
  avatarText: { color: "#1D4ED8", fontWeight: "700", fontSize: 16 },
  selectedAvatarText: { color: "#fff" },
  cardTitle: { color: "#0F172A", fontWeight: "600", fontSize: 16 },
  cardSubtitle: { color: "#64748B", fontSize: 12, marginTop: 2 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
  },
  checkActive: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  footerText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});