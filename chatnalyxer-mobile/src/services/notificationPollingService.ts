import * as Notifications from 'expo-notifications';
import { BASE_URL } from '../config';

let pollingInterval: any = null;

/**
 * Background service that polls backend for pending notifications
 * and triggers local notifications on the device
 */
export async function startNotificationPolling(authToken: string) {
    if (pollingInterval) {
        console.log('📡 Notification polling already running');
        return;
    }

    console.log('🔔 Starting notification polling service...');

    // Poll every 30 seconds
    pollingInterval = setInterval(async () => {
        await checkAndTriggerNotifications(authToken);
    }, 30000); // 30 seconds

    // Also check immediately
    await checkAndTriggerNotifications(authToken);
}

/**
 * Stop the notification polling service
 */
export function stopNotificationPolling() {
    if (pollingInterval) {
        console.log('🛑 Stopping notification polling service');
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

/**
 * Check for pending notifications from backend and trigger local notifications
 */
async function checkAndTriggerNotifications(authToken: string) {
    try {
        // Fetch pending notifications from backend
        const response = await fetch(`${BASE_URL}/notifications/`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (!response.ok) {
            console.log('❌ Failed to fetch notifications:', response.status);
            return;
        }

        const data = await response.json();

        // Handle different response formats
        const notifications = Array.isArray(data) ? data : (data.notifications || []);

        console.log(`📡 Got ${notifications.length} total notifications from backend`);

        if (!Array.isArray(notifications) || notifications.length === 0) {
            return;
        }

        // Filter for notifications that should be delivered NOW
        const now = new Date();
        console.log(`⏰ Current time: ${now.toISOString()}`);

        const pendingNotifications = notifications.filter((notif: any) => {
            // Skip if user already acknowledged it in the app
            if (notif.is_read) {
                console.log(`  ⏭️ Skipping notification ${notif.id}: already read by user`);
                return false;
            }

            // ERROR FIX: Treat backend time as LOCAL TIME (strip 'Z')
            // Backend sends "16:00Z" which is intended to be 16:00 Local
            // If we parse as UTC, it becomes 21:30 (5.5h future) and won't trigger
            const cleanTime = notif.scheduled_time.replace('Z', '').replace(/[+-]\d{2}:?\d{2}$/, '');

            // Manual parsing to ensure local time components
            const parts = cleanTime.split(/[-T:.]/);
            const scheduledTime = new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                parseInt(parts[2]),
                parseInt(parts[3] || '0'),
                parseInt(parts[4] || '0'),
                parseInt(parts[5] || '0')
            );

            // Adjust for device timezone offset
            // Backend stored "16:19" (Local) as UTC.
            // We want "16:19 Local" converted to real UTC.
            // new Date(..., 16, 19) in UTC env gives 16:19 UTC.
            // Real target should be 10:49 UTC (16:19 - 5.5h).
            // offset is -330 for IST. 
            // So we ADD the offset: 16:19 + (-330m) = 10:49.
            const offset = now.getTimezoneOffset();
            scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);

            const timeDiff = scheduledTime.getTime() - now.getTime();
            const diffMins = Math.round(timeDiff / 60000);

            console.log(`  📬 Notification ${notif.id}: "${notif.title}" scheduled for ${scheduledTime.toISOString()} (in ${diffMins} mins)`);
            console.log(`     (Offset used: ${offset} mins)`);

            // Trigger if scheduled time is in the past up to 5 mins or future up to 30 secs
            // This triggers local notifications even if backend already marked as "sent"
            const shouldTrigger = timeDiff <= 30000 && timeDiff >= -300000; // -5 mins to +30 secs
            console.log(`    ${shouldTrigger ? '✅ WILL TRIGGER' : '❌ Skip'} (timeDiff: ${diffMins} mins, sent=${notif.is_sent})`);

            return shouldTrigger;
        });

        if (pendingNotifications.length === 0) {
            return;
        }

        console.log(`📬 Found ${pendingNotifications.length} pending notifications to deliver`);

        // Trigger local notifications
        for (const notif of pendingNotifications) {
            await triggerLocalNotification(notif, authToken);
        }

    } catch (error) {
        console.error('❌ Error checking notifications:', error);
    }
}

/**
 * Trigger a local notification on the device
 */
async function triggerLocalNotification(notif: any, authToken: string) {
    try {
        const isAlarm = notif.notification_type === 'alarm';
        const priority = notif.priority || 'HIGH';

        // Determine channel based on type
        let channelId = 'high_priority';
        if (isAlarm) {
            channelId = 'alarm_channel';
        } else if (notif.notification_type === 'deadline_reminder' || notif.notification_type === 'event_reminder') {
            channelId = 'deadline_reminder';
        }

        // Schedule immediate notification
        await Notifications.scheduleNotificationAsync({
            content: {
                title: notif.title,
                body: notif.message,
                sound: isAlarm ? 'alarm.mp3' : '	',
                priority: priority === 'CRITICAL'
                    ? Notifications.AndroidNotificationPriority.MAX
                    : Notifications.AndroidNotificationPriority.HIGH,
                channelId: channelId,
                data: {
                    notificationId: notif.id,
                    eventId: notif.related_event_id,
                    messageId: notif.related_message_id,
                },
                categoryIdentifier: isAlarm ? 'alarm_actions' : undefined,
            } as any,
            trigger: null, // Immediate delivery
        });

        console.log(`✅ Triggered local notification: ${notif.title}`);

        // Mark as read on backend so we don't trigger it again
        await fetch(`${BASE_URL}/notifications/${notif.id}/mark-read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error(`❌ Failed to trigger notification ${notif.id}:`, error);
    }
}
