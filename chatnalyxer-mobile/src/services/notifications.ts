import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { BASE_URL } from '../config';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
});

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        // 1. HIGH Priority Channel (Red)
        await Notifications.setNotificationChannelAsync('high_priority', {
            name: 'High Priority',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
        });

        // 2. Deadline Reminder Channel (Orange)
        await Notifications.setNotificationChannelAsync('deadline_reminder', {
            name: 'Deadline Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 500],
            lightColor: '#FFFF9900',
        });

        // 3. ALARM Channel (Critical - Red, Loud)
        await Notifications.setNotificationChannelAsync('alarm_channel', {
            name: 'Alarms',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FFFF0000',
            sound: 'alarm.mp3', // Custom alarm sound (place in assets/sounds/)
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
    }

    // Register notification action categories (iOS + Android only, not supported on web)
    if (Platform.OS !== 'web') {
        await Notifications.setNotificationCategoryAsync('alarm_actions', [
            {
                identifier: 'snooze',
                buttonTitle: '😴 Snooze 5 min',
                options: {
                    opensAppToForeground: false,
                },
            },
            {
                identifier: 'dismiss',
                buttonTitle: '✅ Dismiss',
                options: {
                    opensAppToForeground: false,
                },
            },
        ]);
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            Alert.alert('Permission Denied', 'Failed to get push notification permissions!');
            return;
        }

        try {
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId ?? 'your-project-id',
            })).data;
            console.log('📱 Expo Push Token:', token);
        } catch (error) {
            console.log('⚠️ Push notifications skipped (Expo Go limitation):', error);
            // Return null so flow continues (Local notifications still work)
            return null;
        }
    } else {
        Alert.alert('Device Required', 'Must use physical device for Push Notifications');
    }

    return token;
}

/**
 * Save push token to backend
 */
export async function savePushToken(token: string, userToken: string) {
    try {
        const response = await fetch(`${BASE_URL}/users/push-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ push_token: token }),
        });

        if (response.ok) {
            console.log('✅ Push token saved to backend');
        } else {
            console.error('❌ Failed to save push token');
        }
    } catch (error) {
        console.error('❌ Error saving push token:', error);
    }
}

/**
 * Schedule a local notification (for testing or immediate alert)
 */
export async function scheduleLocalNotification(title: string, body: string, seconds: number = 2, channelId: string = 'high_priority') {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: { data: 'goes here' },
            sound: 'default',
            channelId: channelId, // Add channelId here
        } as any,
        trigger: seconds <= 0 ? null : {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: seconds,
            repeats: false
        },
    });
}

/**
 * Schedule multiple reminders for a specific deadline (15m, 1h, 1d before)
 */
export async function scheduleDeadlineReminders(deadline: Date, title: string) {
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs <= 0) return; // Deadline passed

    // Define intervals in milliseconds
    const intervals = [
        { label: '15m Before', ms: 15 * 60 * 1000 },
        { label: '1h Before', ms: 60 * 60 * 1000 },
        { label: '1d Before', ms: 24 * 60 * 60 * 1000 }
    ];

    for (const interval of intervals) {
        const triggerTime = deadline.getTime() - interval.ms;
        const triggerDate = new Date(triggerTime);
        const secondsUntilTrigger = (triggerTime - now.getTime()) / 1000;

        // If trigger time is in the future
        if (secondsUntilTrigger > 10) {
            console.log(`⏰ Scheduling reminder '${interval.label}' for: ${triggerDate.toLocaleTimeString()}`);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `⏰ ${interval.label}: ${title}`,
                    body: `Your deadline is in ${interval.label}. Don't miss it!`,
                    sound: 'default',
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    channelId: 'deadline_reminder', // Use the deadline reminder channel
                } as any, // Cast to any to avoid TS error for channelId
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: triggerDate,
                }
            });
        }
    }
}
