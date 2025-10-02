import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { AuthProvider } from "../src/context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <Stack initialRouteName="login">
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="groups" options={{ title: "Select Groups" }} />
          <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
        </Stack>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // 👈 change this to whatever you like
  },
});
