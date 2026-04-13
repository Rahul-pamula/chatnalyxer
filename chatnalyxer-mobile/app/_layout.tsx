import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { AlarmProvider, useAlarm } from "../src/context/AlarmContext";
import { AlarmModal } from "../src/components/AlarmModal";
// import * as Notifications from 'expo-notifications'; // ❌ Removed to avoid SDK 53 side-effects

// Fix for web globals
declare const window: any;

function InitialLayout() {
  const { user, loading, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { triggerAlarm } = useAlarm();

  useEffect(() => {
    // Bind to window for manual testing from other screens
    if (typeof window !== 'undefined') {
      (window as any).triggerAlarm = triggerAlarm;
    }

    if (loading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'signup';

    if (!user && !inAuthGroup) {
      // ✅ Redirect to login if not authenticated
      router.replace('/login');
    } else if (user && !user.is_profile_complete) {
      // Check if already on setup screen to avoid loop
      const inSetup = segments[0] === 'profile-setup';
      const targetIsSetup = segments[0] === 'setup'; // Allow transition to setup

      if (!inSetup && !targetIsSetup) {
        router.replace('/profile-setup');
      }
    } else if (user && user.is_profile_complete) {
      const consentAccepted = (user as any)?.consent_accepted === true;
      const inConsent = segments[0] === 'consent';

      if (!consentAccepted && !inConsent && !inAuthGroup) {
        router.replace('/consent');
        return;
      }

      // If profile IS complete, but we are on profile-setup, send them to dashboard
      const inSetup = segments[0] === 'profile-setup';
      if (inSetup) {
        router.replace('/dashboard');
      }
      // Also if on login, go to dashboard
      if (inAuthGroup) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, segments]);

  // Register for push notifications when user is logged in
  useEffect(() => {
    let bgSubscription: any = null;

    if (user && token) {
      // 1. Initial configuration
      import("../src/services/notifications").then(({ registerForPushNotificationsAsync, savePushToken, isExpoGo, setupNotificationHandler }) => {
        setupNotificationHandler();

        // Always call registration to get Permissions and Setup Channels,
        // token registration will handle Expo Go internally.
        registerForPushNotificationsAsync().then(pushToken => {
          if (pushToken && !isExpoGo()) {
            savePushToken(pushToken, token);
          }
        });
      });

      // 2. Setup action handlers
      import("../src/services/notificationActions").then(({ setupNotificationActionHandlers }) => {
        setupNotificationActionHandlers();
      });

      // 3. Start polling
      import("../src/services/notificationPollingService").then(({ startNotificationPolling }) => {
        startNotificationPolling(token);
        console.log('🔔 Notification polling started');
      });

      // 4. Foreground listener
      import('expo-notifications').then(Notifications => {
        import("../src/services/notifications").then(({ isExpoGo }) => {
          // We NEED the listener even in Expo Go for foreground alarms!
          bgSubscription = Notifications.addNotificationReceivedListener(notification => {
            const title = String(notification.request.content.title || '').toLowerCase();
            const body = String(notification.request.content.body || '').toLowerCase();
            
            const is15Min = (title.includes('15') && (title.includes('min') || title.includes('m '))) ||
                            (body.includes('15') && (body.includes('min') || body.includes('m ')));

            if (is15Min) {
              console.log('🚨 FOREGROUND ALARM TRIGGERED 🚨');
              triggerAlarm(notification.request.content.title || 'Urgent Reminder');
            }
          });
        });
      });
    } else {
      import("../src/services/notificationPollingService").then(({ stopNotificationPolling }) => {
        stopNotificationPolling();
      });
    }

    return () => {
      if (bgSubscription) bgSubscription.remove();
    };
  }, [user, token]);

  return (
    <View style={styles.container}>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="consent" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="groups" options={{ title: "Select Groups" }} />
        <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Stack.Screen name="admin/login" options={{ title: "Admin Login" }} />
        <Stack.Screen name="admin/dashboard" options={{ title: "Admin Dashboard", headerLeft: () => null }} />
        {/* Explicitly hide header for notification details */}
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="trash" options={{ headerShown: false }} />
      </Stack>
      <AlarmModal />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AlarmProvider>
        <InitialLayout />
      </AlarmProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // 👈 change this to whatever you like
  },
});
