const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Import configuration
const { BASE_URL, API_KEY } = require('./config.cjs');

// Get user_id and phone_number from command line arguments
const user_id = process.argv[2] || "default";
const phoneNumber = process.argv[3]; // Phone number passed from backend

let client;

console.log(`🚀 Starting WhatsApp Client (whatsapp-web.js) for User ${user_id}`);

// Initial Status
async function sendStatus(statusData) {
  try {
    await axios.post(`${BASE_URL}/whatsapp/status`, {
      user_id,
      ...statusData
    });
  } catch (error) {
    console.log('⚠️ Failed to send status to backend:', error.message);
  }
}

// Initialize WhatsApp Client
client = new Client({
  authStrategy: new LocalAuth({
    clientId: `user-${user_id}`,
    dataPath: './.wwebjs_auth'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

// Send initial status
sendStatus({
  message: 'Initializing WhatsApp Client...',
  ready: false,
  qr_code: null,
  pairing_code: null
});

// QR Code Event
client.on('qr', (qr) => {
  console.log('📱 QR Code received! Scan it in WhatsApp to link.');
  qrcode.generate(qr, { small: true });

  sendStatus({
    message: 'Scan QR Code in WhatsApp',
    ready: false,
    qr_code: qr,
    pairing_code: null
  });
});

// Ready Event
client.on('ready', async () => {
  console.log('✅ WhatsApp client is ready! Connection opened.');

  await sendStatus({
    message: '✅ WhatsApp bot is ready!',
    ready: true
  });

  // Sync groups
  await syncGroups();

  // Start monitoring group selection from backend
  startGroupSelectionMonitoring();

  console.log('\\n⏳ Waiting for new messages from selected groups...');
});

// Authenticated Event (for pairing code)
client.on('authenticated', () => {
  console.log('✅ Authentication successful!');
});

// Auth Failure Event
client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
  sendStatus({
    message: 'Authentication failed: ' + msg,
    ready: false
  });
});

// Disconnected Event
client.on('disconnected', (reason) => {
  console.log('🔌 WhatsApp disconnected:', reason);
  sendStatus({
    message: 'Disconnected: ' + reason,
    ready: false
  });
});

// Message Event
client.on('message', async (msg) => {
  try {
    const chat = await msg.getChat();

    // Only process group messages
    if (!chat.isGroup) {
      return;
    }

    const groupId = chat.id._serialized;
    const contact = await msg.getContact();
    const senderName = contact.pushname || contact.name || 'Unknown';

    // Check if this group should be analyzed (this will be managed by backend)
    // For now, we'll forward all group messages and let backend filter

    const messageData = {
      content: msg.body,
      sender_name: senderName,
      group_id: groupId,
      timestamp: new Date(msg.timestamp * 1000).toISOString()
    };

    // Send to backend
    try {
      await axios.post(
        `${BASE_URL}/messages/from-whatsapp`,
        messageData,
        { headers: { "x-api-key": API_KEY } }
      );
      // console.log(`✅ Forwarded message from ${senderName} in group ${groupId}`);
    } catch (err) {
      console.error("❌ Error forwarding message:", err.message);
    }
  } catch (error) {
    console.error('❌ Error processing message:', error.message);
  }
});

// Initialize client
console.log('🔄 Initializing WhatsApp client...');
client.initialize();

// Request pairing code if phone number provided
if (phoneNumber) {
  console.log(`📱 Phone number provided: ${phoneNumber}`);

  // Wait for client to be ready to request pairing code
  client.on('ready', async () => {
    // Check if already authenticated
    if (client.info) {
      console.log('✅ Already authenticated, skipping pairing code request');
      return;
    }
  });

  // Listen for when we can request pairing code
  setTimeout(async () => {
    try {
      console.log(`📡 Requesting Pairing Code for ${phoneNumber}...`);
      const code = await client.requestPairingCode(phoneNumber);
      console.log(`✅ Pairing Code received: ${code}`);
      console.log(`⏰ Code valid for ~60 seconds. Please enter it in WhatsApp NOW!`);

      await sendStatus({
        message: 'Enter Pairing Code in WhatsApp',
        ready: false,
        qr_code: null,
        pairing_code: code
      });

      console.log(`✅ Backend notified of pairing code: ${code}`);
      console.log(`⏳ Waiting for you to enter the code in WhatsApp...`);
    } catch (err) {
      console.error('❌ Failed to request pairing code:', err);
      await sendStatus({
        message: 'Pairing Failed: ' + err.message,
        ready: false
      });
    }
  }, 10000); // Wait 10 seconds for client to initialize
}

// Group Sync Function
async function syncGroups() {
  console.log('🔄 Syncing groups...');
  try {
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);

    console.log(`📌 Found ${groups.length} WhatsApp groups`);

    const groupsData = groups.map(group => ({
      whatsapp_id: group.id._serialized,
      name: group.name
    }));

    await axios.post(
      `${BASE_URL}/groups/sync-from-whatsapp`,
      {
        user_id: parseInt(user_id),
        groups: groupsData
      },
      { headers: { "x-api-key": API_KEY } }
    );

    console.log(`✅ Groups synced with backend`);
  } catch (err) {
    console.error('❌ Error syncing groups:', err.message);
  }
}

// Monitor group selection from backend
function startGroupSelectionMonitoring() {
  console.log('🔄 Starting group selection monitoring...');

  // Poll backend every 10 seconds for group selection updates
  setInterval(async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/groups/selected/${user_id}`,
        { headers: { "x-api-key": API_KEY } }
      );

      const selectedGroups = response.data;
      // console.log(`📋 Monitoring ${selectedGroups.length} selected groups`);
    } catch (error) {
      // Silently fail - backend might not be ready
    }
  }, 10000);
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\\n⏹️ Shutting down WhatsApp client...');
  await client.destroy();
  process.exit(0);
});
