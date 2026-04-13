// import * as Notifications from 'expo-notifications'; // ❌ Removed to avoid SDK 53 side-effects
import { BASE_URL } from '../config';

/**
 * Handle notification action responses (Snooze/Dismiss)
 */
export async function setupNotificationActionHandlers() {
    // Listen for notification responses (when user taps action buttons)
    const Notifications = await import('expo-notifications');
    Notifications.addNotificationResponseReceivedListener(async (response) => {
        const { actionIdentifier, notification } = response;
        const notificationData = notification.request.content.data;

        console.log('📲 Notification action received:', actionIdentifier);

        // Handle Action Buttons
        if (actionIdentifier === 'snooze') {
            await handleSnooze(notificationData);
        } else if (actionIdentifier === 'dismiss' || actionIdentifier === 'stop') {
            await handleDismiss(notificationData);
        }

        // Handle Default Tap (Body of notification)
        else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
            console.log('🔔 Default notification tap:', notificationData);

            if (notificationData.type === 'whatsapp_disconnect') {
                // Navigate to setup screen to reconnect
                import('expo-router').then(({ router }) => {
                    // Short delay to ensure app is ready
                    setTimeout(() => {
                        router.push('/setup');
                    }, 500);
                });
            }
        }
    });
}


/**
 * Snooze alarm for 5 minutes (Max 3 times)
 */
async function handleSnooze(data: any) {
    try {
        const { notification_id, event_id } = data;
        let snoozeCount = data.snoozeCount || 0;

        if (snoozeCount >= 3) {
            console.log('🛑 Max snooze limit reached! Stopping alarm.');
            await handleDismiss(data);
            return;
        }

        snoozeCount++;
        console.log(`😴 Snoozing alarm for 5 minutes... (Snooze # ${snoozeCount}/3)`);

        // Schedule a new notification in 5 minutes
        const Notifications = await import('expo-notifications');
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Alarm (Snoozed)',
                body: `Your alarm will ring again in 5 minutes. (${3 - snoozeCount} snoozes left)`,
                sound: 'alarm.mp3',
                data: { ...data, snoozeCount },
                categoryIdentifier: 'alarm_actions',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 5 * 60, // 5 minutes
            },
        });

        // Optionally: Update backend about snooze
        // await fetch(`${BASE_URL}/notifications/${notification_id}/snooze`, { method: 'POST' });

        console.log('✅ Alarm snoozed successfully');
    } catch (error) {
        console.error('❌ Error snoozing alarm:', error);
    }
}

/**
 * Dismiss alarm
 */
async function handleDismiss(data: any) {
    try {
        const { notification_id } = data;

        console.log('✅ Dismissing alarm...');

        // Optionally: Update backend about dismissal
        // await fetch(`${BASE_URL}/notifications/${notification_id}/dismiss`, { method: 'POST' });

        console.log('✅ Alarm dismissed');
    } catch (error) {
        console.error('❌ Error dismissing alarm:', error);
    }
}
