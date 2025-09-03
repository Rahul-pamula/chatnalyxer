import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
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
  const { token } = useAuth(); // ensures user is logged in
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
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
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, selected[item.id] && styles.selected]}
            onPress={() => toggle(item.id)}
          >
            <Text style={{ color: "#000" }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <Button title="Continue" onPress={() => router.push("/dashboard")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12, color: "#000" },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 8,
  },
  selected: { backgroundColor: "#eef" },
});
