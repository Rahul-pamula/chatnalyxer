import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const DUMMY_GROUPS = [
  { id: "1", name: "CSE-3A Notices" },
  { id: "2", name: "Exam Cell Updates" },
  { id: "3", name: "Dept Events" },
];

export default function Groups() {
  const router = useRouter();
  const [selected, setSelected] = useState<{ [key: string]: boolean }>({});

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Groups</Text>
      <FlatList
        data={DUMMY_GROUPS}
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
      {/* ✅ push: allows back navigation to groups */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12, color: "#000" },
  card: { padding: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, marginBottom: 8 },
  selected: { backgroundColor: "#eef" },
});
