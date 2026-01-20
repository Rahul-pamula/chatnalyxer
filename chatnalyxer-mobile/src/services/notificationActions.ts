import * as Notifications from 'expo-notifications';
import { BASE_URL } from '../config';

/**
 * Handle notification action responses (Snooze/Dismiss)
 */
export function setupNotificationActionHandlers() {
    // Listen for notification responses (when user taps action buttons)
    Notifications.addNotificationResponseReceivedListener(async (response) => {
        const { actionIdentifier, notification } = response;
        const notificationData = notification.request.content.data;

        console.log('📲 Notification action received:', actionIdentifier);

        // Handle Action Buttons
        if (actionIdentifier === 'snooze') {
            await handleSnooze(notificationData);
        } else if (actionIdentifier === 'dismiss') {
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
 * Snooze alarm for 5 minutes
 */
async function handleSnooze(data: any) {
    try {
        const { notification_id, event_id } = data;

        console.log('😴 Snoozing alarm for 5 minutes...');

        // Schedule a new notification in 5 minutes
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Alarm (Snoozed)',
                body: 'Your snoozed alarm is ringing!',
                sound: 'alarm.mp3',
                data: data,
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
