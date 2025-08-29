import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import fetch from 'node-fetch';

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "chatnalyxer-bot" }),
    puppeteer: { headless: true }
});

// Show QR when login required
client.on('qr', qr => {
    console.log('Scan this QR to log in:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('✅ WhatsApp bot is ready!');

    try {
        // Wait a moment to allow chats to sync
        await new Promise(res => setTimeout(res, 3000));

        const chats = await client.getChats();

        // Find the exact group "TextNLytixs"
        const group = chats.find(chat => chat.isGroup && chat.name === 'TextNLytixs');

        if (!group) {
            console.log('❌ Group "TextNLytixs" not found.');
            return;
        }

        console.log(`📌 Found group: ${group.name}`);

        // Fetch recent messages from the group
        const messages = await group.fetchMessages({ limit: 100 });

        // Filter last 10 messages from "Rahul Rahul"
        const rahulMessages = [];
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            const contact = await msg.getContact();
            const senderName = contact.pushname || contact.name || '';

            if (senderName === 'Rahul Rahul') {
                rahulMessages.push(msg);

                // --- Forward each Rahul msg to backend ---
                await sendToBackend(senderName, group.name, msg.body, msg.timestamp);
            }

            if (rahulMessages.length === 10) break;
        }

        if (rahulMessages.length > 0) {
            console.log('📨 Latest 10 messages from Rahul Rahul:');
            rahulMessages.reverse().forEach((msg, index) => {
                console.log(`${index + 1}: ${msg.body}`);
            });
        } else {
            console.log('No recent messages found from Rahul Rahul in the group.');
        }

    } catch (err) {
        console.error('❌ Error fetching messages:', err);
    }
});

// Listen for NEW incoming messages
client.on('message', async msg => {
    console.log(`📥 ${msg.from}: ${msg.body}`);

    try {
        const res = await fetch("http://127.0.0.1:8000/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sender: msg.from, text: msg.body })
        });

        const data = await res.json();
        console.log("🤖 Backend replied:", data);
    } catch (err) {
        console.error("❌ Error sending message to backend:", err);
    }
});

// helper function to send old msgs to backend
async function sendToBackend(sender, group, message, timestamp) {
    try {
        const res = await fetch("http://127.0.0.1:8000/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sender: sender,
                group: group,
                message: message,
                timestamp: new Date(timestamp * 1000).toISOString()
            })
        });

        if (!res.ok) {
            console.error("❌ Failed to send message to backend:", await res.text());
        } else {
            console.log(`✅ Sent old message to backend: ${message}`);
        }

    } catch (err) {
        console.error("❌ Error sending to backend:", err);
    }
}

client.initialize();