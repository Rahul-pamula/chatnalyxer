import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

      {/* 🔎 Filters */}
      <TextInput
        style={styles.input}
        placeholder="Filter by sender"
        value={senderFilter}
        onChangeText={setSenderFilter}
      />
      <TextInput
        style={styles.input}
        placeholder="From date (YYYY-MM-DD)"
        value={fromDate}
        onChangeText={setFromDate}
      />
      <TextInput
        style={styles.input}
        placeholder="To date (YYYY-MM-DD)"
        value={toDate}
        onChangeText={setToDate}
      />

      {/* 📩 Messages list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.msg}>
            <Text style={styles.sender}>{item.sender}</Text>
            <Text>{item.text}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12, color: "#000" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  msg: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 8,
  },
  sender: { fontWeight: "600", marginBottom: 4 },
  date: { fontSize: 12, color: "#666", marginTop: 4 },
});
