import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

/**
 * Hook to handle notification responses
 * Use in root app component
 */
export function useNotificationObserver() {
    const router = useRouter();
    const notificationListener = useRef<any>();
    const responseListener = useRef<any>();

    useEffect(() => {
        // Listen for notifications received while app is open
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('📬 Notification received:', notification);
        });

        // Listen for notification taps
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Notification tapped:', response);

            // Navigate based on notification data
            const data = response.notification.request.content.data;

            if (data.messageId) {
                router.push('/dashboard');
            } else if (data.eventId) {
                router.push('/ai-chat');
            }
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [router]);
}
