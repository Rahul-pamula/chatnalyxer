import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getGroups } from "../src/services/api"; // ✅ call backend
import { useAuth } from "../src/context/AuthContext";

type Group = { id: string; name: string };

export default function Groups() {
  const router = useRouter();
  const { user, token } = useAuth(); // ensures user is logged in
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      try {
        const data = await getGroups(); // fetch from backend
        setGroups(data);
      } catch (err) {
        console.error("❌ Failed to fetch groups:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Groups</Text>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, selected[item.id] && styles.selected]}
            onPress={() => toggle(item.id)}
            activeOpacity={0.9}
          >
            <View style={styles.cardInner}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || "G"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>Tap to select</Text>
              </View>
              <View style={[styles.check, selected[item.id] && styles.checkActive]} />
            </View>
          </TouchableOpacity>
        )}
      />

      <Pressable style={styles.primaryBtn} onPress={() => router.push("/dashboard")}>
        <Text style={styles.primaryBtnText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F7F8FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, color: "#0F172A" },
  listContent: { paddingBottom: 16 },
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  avatarText: { color: "#1D4ED8", fontWeight: "700" },
  cardTitle: { color: "#0F172A", fontWeight: "600" },
  cardSubtitle: { color: "#64748B", fontSize: 12, marginTop: 2 },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#94A3B8",
  },
  checkActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  selected: { borderColor: "#93C5FD" },
  primaryBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
});
