import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

function InitialLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user && !user.is_profile_complete) {
      // Check if already on setup screen to avoid loop
      const inSetup = segments[0] === 'profile-setup';
      const targetIsSetup = segments[0] === 'setup'; // Allow transition to setup

      if (!inSetup && !targetIsSetup) {
        router.replace('/profile-setup');
      }
    } else if (user && user.is_profile_complete) {
      // If profile IS complete, but we are on profile-setup, send them to dashboard
      const inSetup = segments[0] === 'profile-setup';
      if (inSetup) {
        router.replace('/setup');
      }
    }
  }, [user, loading, segments]);

  return (
    <View style={styles.container}>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="groups" options={{ title: "Select Groups" }} />
        <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Stack.Screen name="admin/login" options={{ title: "Admin Login" }} />
        <Stack.Screen name="admin/dashboard" options={{ title: "Admin Dashboard", headerLeft: () => null }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // 👈 change this to whatever you like
  },
});
