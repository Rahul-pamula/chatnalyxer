import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', qr => {
    console.log('Scan this QR to log in:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('WhatsApp Web is ready!');

    try {
        // Wait a moment to allow chats to sync
        await new Promise(res => setTimeout(res, 3000));

        const chats = await client.getChats();

        // Find the exact group "TextNLytixs"
        const group = chats.find(chat => chat.isGroup && chat.name === 'TextNLytixs');

        if (!group) {
            console.log('Group "TextNLytixs" not found.');
            return;
        }

        console.log('Found group: ${group.name}');

        // Fetch recent messages from the group
        const messages = await group.fetchMessages({ limit: 100 }); // fetch more to ensure we get 10 from Rahul

        // Filter messages from Rahul Rahul
        const rahulMessages = [];
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            const contact = await msg.getContact();
            const senderName = contact.pushname || contact.name || '';

            if (senderName === 'Rahul Rahul') {
                rahulMessages.push(msg.body);
            }

            if (rahulMessages.length === 10) break; // stop after 10 messages
        }

        if (rahulMessages.length > 0) {
            console.log('Latest 10 messages from Rahul Rahul:');
            rahulMessages.reverse().forEach((msg, index) => {
                console.log('${index + 1}: ${msg}');
            });
        } else {
            console.log('No recent messages found from Rahul Rahul in the group.');
        }

    } catch (err) {
        console.error('Error fetching messages:', err);
    }
});

client.initialize();