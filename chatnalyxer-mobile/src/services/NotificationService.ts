import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { BASE_URL } from '../config';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const NotificationService = {
    /**
     * Request notification permissions and register for push notifications
     * Returns the Expo push token if successful
     */
    async registerForPushNotifications(token: string): Promise<string | null> {
        try {
            // Check if running on physical device
            if (!Device.isDevice) {
                console.log('Push notifications only work on physical devices');
                return null;
            }

            // Request permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token - permission denied');
                return null;
            }

            // Get push token
            const pushTokenData = await Notifications.getExpoPushTokenAsync({
                projectId: 'your-project-id', // Will be configured in app.json
            });
            const pushToken = pushTokenData.data;

            console.log('📱 Push Token:', pushToken);

            // Setup notification channels for Android
            if (Platform.OS === 'android') {
                await this.setupNotificationChannels();
            }

            // Send token to backend
            await this.sendTokenToBackend(token, pushToken);

            return pushToken;
        } catch (error) {
            console.error('Error registering for push notifications:', error);
            return null;
        }
    },

    /**
     * Create notification channels for Android (different priorities)
     */
    async setupNotificationChannels() {
        if (Platform.OS !== 'android') return;

        try {
            // CRITICAL priority channel
            await Notifications.setNotificationChannelAsync('CRITICAL', {
                name: 'Critical Messages',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF0000',
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });

            // HIGH priority channel
            await Notifications.setNotificationChannelAsync('HIGH', {
                name: 'High Priority Messages',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FFA500',
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });

            // MEDIUM priority channel
            await Notifications.setNotificationChannelAsync('MEDIUM', {
                name: 'Medium Priority Messages',
                importance: Notifications.AndroidImportance.DEFAULT,
                vibrationPattern: [0, 250],
                lightColor: '#0000FF',
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });

            console.log('✅ Notification channels created');
        } catch (error) {
            console.error('Error creating notification channels:', error);
        }
    },

    /**
     * Send push token to backend for storage
     */
    async sendTokenToBackend(authToken: string, pushToken: string): Promise<boolean> {
        try {
            const response = await fetch(`${BASE_URL}/notifications/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ push_token: pushToken }),
            });

            if (response.ok) {
                console.log('✅ Push token registered with backend');
                return true;
            } else {
                console.error('Failed to register push token:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Error sending token to backend:', error);
            return false;
        }
    },

    /**
     * Schedule a local notification (for testing)
     */
    async scheduleLocalNotification(
        title: string,
        body: string,
        data: any = {},
        priority: 'HIGH' | 'MEDIUM' | 'CRITICAL' = 'MEDIUM'
    ) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: 'default',
                    priority: Notifications.AndroidImportance.HIGH,
                    categoryIdentifier: priority,
                },
                trigger: null, // Show immediately
            });
        } catch (error) {
            console.error('Error scheduling notification:', error);
        }
    },

    /**
     * Get notification permissions status
     */
    async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
        const { status } = await Notifications.getPermissionsAsync();
        return status;
    },

    /**
     * Add listener for notifications received while app is in foreground
     */
    addNotificationReceivedListener(
        callback: (notification: Notifications.Notification) => void
    ) {
        return Notifications.addNotificationReceivedListener(callback);
    },

    /**
     * Add listener for when user taps on a notification
     */
    addNotificationResponseListener(
        callback: (response: Notifications.NotificationResponse) => void
    ) {
        return Notifications.addNotificationResponseReceivedListener(callback);
    },

    /**
     * Get badge count
     */
    async getBadgeCount(): Promise<number> {
        return await Notifications.getBadgeCountAsync();
    },

    /**
     * Set badge count
     */
    async setBadgeCount(count: number) {
        await Notifications.setBadgeCountAsync(count);
    },

    /**
     * Clear all notifications
     */
    async clearAllNotifications() {
        await Notifications.dismissAllNotificationsAsync();
    },
};
