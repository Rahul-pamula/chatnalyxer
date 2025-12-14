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
import { Ionicons } from "@expo/vector-icons";
import { colors, shadows } from "../src/theme/colors";

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

      // Optional: Show toast or subtle feedback instead of Alert for better flow
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No Groups Found</Text>
        <Text style={styles.emptySubtitle}>
          Make sure WhatsApp integration is running and groups are synced
        </Text>
        <Pressable style={styles.primaryBtn} onPress={loadGroups}>
          <Text style={styles.primaryBtnText}>Refresh List</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Manage Groups</Text>
          <Text style={styles.subtitle}>
            Select groups to track important messages
          </Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={loadGroups}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          <Text style={styles.statsHighlight}>{selectedCount}</Text> selected of {groups.length}
        </Text>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.is_selected && styles.selectedCard]}
            onPress={() => toggleGroupSelection(item)}
            activeOpacity={0.8}
            disabled={updating[item.id]}
          >
            <View style={styles.cardInner}>
              <View style={[styles.avatar, item.is_selected && styles.selectedAvatar]}>
                <Text style={[styles.avatarText, item.is_selected && styles.selectedAvatarText]}>
                  {item.name?.[0]?.toUpperCase() || "G"}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  {item.whatsapp_id ? (
                    <View style={styles.badgeSuccess}>
                      <Text style={styles.badgeText}>Synced</Text>
                    </View>
                  ) : (
                    <View style={styles.badgeNeutral}>
                      <Text style={styles.badgeText}>Local</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.actionArea}>
                {updating[item.id] ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={[styles.checkbox, item.is_selected && styles.checkboxActive]}>
                    {item.is_selected && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
          onPress={() => router.push("/dashboard")}
        >
          <Text style={styles.primaryBtnText}>Continue to Dashboard</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.textInverse} style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, fontWeight: "500", marginTop: 4 },

  iconBtn: {
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    ...shadows.sm,
  },

  statsBar: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statsText: { fontSize: 13, color: colors.textTertiary, fontWeight: '600' },
  statsHighlight: { color: colors.primary },

  refreshBtn: { backgroundColor: colors.surfaceHighlight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  refreshBtnText: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },

  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 8, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 24 },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  selectedCard: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surface, // Keep surface color but add border/glow
    ...shadows.md,
  },
  cardInner: { flexDirection: "row", alignItems: "center" },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  selectedAvatar: {
    backgroundColor: colors.primary,
  },
  avatarText: { color: colors.primary, fontWeight: "700", fontSize: 18 },
  selectedAvatarText: { color: colors.textInverse },

  cardInfo: { flex: 1 },
  cardTitle: { color: colors.textPrimary, fontWeight: "700", fontSize: 15, marginBottom: 4 },

  badgeRow: { flexDirection: 'row' },
  badgeSuccess: { backgroundColor: colors.success + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeNeutral: { backgroundColor: colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },

  actionArea: { width: 30, alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: 'center',
    ...shadows.md,
  },
  btnPressed: { opacity: 0.9 },
  primaryBtnText: { color: colors.textInverse, fontWeight: "700", fontSize: 16 },
  footerText: { textAlign: 'center', color: colors.textTertiary, marginBottom: 16, fontSize: 12 },
});
