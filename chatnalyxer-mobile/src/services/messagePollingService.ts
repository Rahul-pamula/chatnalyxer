/**
 * Polling Service - Detects new messages and shows local notifications
 * This replaces push notifications for Expo Go demo
 */

import { showLocalNotification } from './localNotificationService';
import { BASE_URL } from '../config';

interface Message {
    id: number;
    content: string;
    group_name?: string;
    ai_summary?: string;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let lastMessageCount = 0;

/**
 * Start polling for new messages
 * Shows local notification when new message arrives
 */
export async function startMessagePolling(token: string) {
    // Stop any existing polling
    stopMessagePolling();

    // Get initial message count
    try {
        const response = await fetch(`${BASE_URL}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await response.json() as Message[];
        lastMessageCount = messages.length;
        console.log(`📊 Initial message count: ${lastMessageCount}`);
    } catch (error) {
        console.error('Failed to get initial message count:', error);
    }

    // Poll every 5 seconds for new messages
    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`${BASE_URL}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const messages = await response.json() as Message[];
            const currentCount = messages.length;

            // Check if new messages arrived
            if (currentCount > lastMessageCount) {
                const newMessageCount = currentCount - lastMessageCount;
                const latestMessage = messages[0]; // Assuming sorted by newest first

                console.log(`🔔 ${newMessageCount} new message(s) detected!`);

                // Show local notification
                await showLocalNotification(
                    latestMessage.group_name || 'New Message',
                    latestMessage.ai_summary || latestMessage.content?.substring(0, 100) || 'You have a new message',
                    { messageId: latestMessage.id }
                );

                lastMessageCount = currentCount;
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 5000) as any; // Poll every 5 seconds

    console.log('✅ Message polling started');
}

/**
 * Stop polling
 */
export function stopMessagePolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('🛑 Message polling stopped');
    }
}
