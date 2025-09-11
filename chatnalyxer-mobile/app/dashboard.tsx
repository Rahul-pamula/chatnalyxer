import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getDashboard } from "../src/services/api";
import { useAuth } from "../src/context/AuthContext";

type Message = {
  id: string;
  sender: string;
  text: string;
  date: string; // ISO format expected
};

export default function Dashboard() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [senderFilter, setSenderFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getDashboard(); 
        // ✅ Rahul’s API should return { messages: [...] }
        setMessages(data.messages || []);
      } catch (err) {
        console.error("❌ Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      if (
        senderFilter &&
        !m.sender.toLowerCase().includes(senderFilter.toLowerCase())
      ) {
        return false;
      }
      if (fromDate) {
        const msgDate = new Date(m.date);
        if (msgDate < new Date(fromDate)) return false;
      }
      if (toDate) {
        const msgDate = new Date(m.date);
        if (msgDate > new Date(toDate)) return false;
      }
      return true;
    });
  }, [messages, senderFilter, fromDate, toDate]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.filtersRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Filter by sender"
          value={senderFilter}
          onChangeText={setSenderFilter}
        />
      </View>

      <View style={styles.filtersRow}>
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="From (YYYY-MM-DD)"
          value={fromDate}
          onChangeText={setFromDate}
        />
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="To (YYYY-MM-DD)"
          value={toDate}
          onChangeText={setToDate}
        />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sender}>{item.sender}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <Text style={styles.message}>{item.text}</Text>
            <View style={styles.cardFooter}>
              <Pressable style={styles.tag}>
                <Text style={styles.tagText}>General</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F7F8FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, color: "#0F172A" },
  listContent: { paddingBottom: 16 },
  filtersRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    color: "#0F172A",
  },
  inputHalf: { flex: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  sender: { fontWeight: "700", color: "#0F172A" },
  date: { fontSize: 12, color: "#64748B" },
  message: { color: "#0F172A" },
  cardFooter: { flexDirection: "row", marginTop: 8 },
  tag: { backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { color: "#4F46E5", fontWeight: "600", fontSize: 12 },
});
