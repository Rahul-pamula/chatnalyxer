import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions
 * Call this when app starts or user logs in
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('❌ Notification permission denied');
            return false;
        }

        console.log('✅ Notification permission granted');

        // Set up notification channel for Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return true;
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
}

/**
 * Show immediate notification (works in Expo Go!)
 */
export async function showLocalNotification(
    title: string,
    body: string,
    data?: any
): Promise<void> {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || {},
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null, // Show immediately
        });

        console.log(`📱 Local notification shown: ${title}`);
    } catch (error) {
        console.error('Error showing local notification:', error);
    }
}

/**
 * Schedule notification for later (for deadlines)
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: any
): Promise<string | null> {
    try {
        // Calculate seconds until trigger date
        const secondsUntilTrigger = Math.max(1, Math.floor((triggerDate.getTime() - Date.now()) / 1000));

        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || {},
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilTrigger },
        });

        console.log(`⏰ Notification scheduled for ${triggerDate.toLocaleString()}`);
        return identifier;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return null;
    }
}

/**
 * Cancel scheduled notification
 */
export async function cancelNotification(identifier: string): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
        console.log(`🗑️ Notification cancelled: ${identifier}`);
    } catch (error) {
        console.error('Error cancelling notification:', error);
    }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications() {
    try {
        return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error getting scheduled notifications:', error);
        return [];
    }
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('🗑️ All notifications cancelled');
    } catch (error) {
        console.error('Error cancelling all notifications:', error);
    }
}
