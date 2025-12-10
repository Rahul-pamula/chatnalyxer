import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import P from "pino";
import axios from "axios";
import fs from "fs";
import path from "path";
import { BASE_URL, API_KEY } from "./config.js";
import {
  loadSelectedGroups,
  saveSelectedGroups,
  selectGroupsInteractively,
  shouldAnalyzeGroup,
  getSelectedGroupNames
} from "./services/groupSelector.js";

// Get user_id and phone_number from command line argument
const user_id = process.argv[2] || "default";
const phoneNumber = process.argv[3]; // Phone number passed from backend

// Global variable to store selected groups
let selectedGroups = {};
let allGroups = [];
let sock;

async function connectToWhatsApp() {
  const authPath = `auth_info_baileys_${user_id}`;
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`🚀 Starting WhatsApp Client (Baileys v${version.join('.')}) for User ${user_id}`);

  // Initial Status
  try {
    await axios.post(`${BASE_URL}/whatsapp/status`, {
      message: 'Initializing Baileys Client...',
      ready: false,
      user_id,
      qr_code: null,
      pairing_code: null
    });
  } catch (error) {
    console.log('⚠️ Failed to send initial status:', error.message);
  }

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // Enable QR code in terminal for easier linking
    syncFullHistory: false,   // Optimization
    logger: P({ level: 'silent' }), // Silent logger
    browser: ["Chatnalyxer Local", "Chrome", "1.0.0"],
    markOnlineOnConnect: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Handle QR Code
    if (qr) {
      console.log('📱 QR Code received! Scan it in WhatsApp to link.');
      try {
        await axios.post(`${BASE_URL}/whatsapp/status`, {
          message: 'Scan QR Code in WhatsApp',
          ready: false,
          user_id,
          qr_code: qr,
          pairing_code: null
        });
      } catch (e) {
        console.log('⚠️ Failed to send QR to backend:', e.message);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);

      // Notify backend of disconnect
      try {
        await axios.post(`${BASE_URL}/whatsapp/status`, {
          message: 'Disconnected',
          ready: false,
          user_id
        });
      } catch (e) { }

      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000); // Reconnect
      } else {
        console.log('❌ Logged out. Delete auth folder to restart.');
        try { fs.rmSync(authPath, { recursive: true, force: true }); } catch (e) { }
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp bot is ready! Connection opened.');

      // Send status to backend
      try {
        await axios.post(`${BASE_URL}/whatsapp/status`, { message: '✅ WhatsApp bot is ready!', ready: true, user_id });
      } catch (error) {
        console.log('Error sending status to backend:', error.message);
      }

      // Sync Groups
      await syncGroups();
      startGroupSelectionMonitoring();
      console.log('\n⏳ Waiting for new messages from selected groups...');
    }
  });

  // Handle Pairing Code
  if (phoneNumber && !sock.authState.creds.registered) {
    console.log(`⏰ Phone number provided: ${phoneNumber}, registered: ${sock.authState.creds.registered}`);
    // Wait a small moment for socket to init
    setTimeout(async () => {
      try {
        console.log(`📡 Requesting Pairing Code for ${phoneNumber}...`);
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`✅ Pairing Code received: ${code}`);
        console.log(`⏰ Code valid for ~60 seconds. Please enter it in WhatsApp NOW!`);

        // Send to backend
        await axios.post(`${BASE_URL}/whatsapp/status`, {
          message: 'Enter Pairing Code in WhatsApp',
          ready: false,
          user_id,
          qr_code: null,
          pairing_code: code
        });
        console.log(`✅ Backend notified of code: ${code}`);
        console.log(`⏳ Waiting for you to enter the code in WhatsApp...`);
      } catch (err) {
        console.log('❌ Failed to request pairing code:', err);
        try {
          await axios.post(`${BASE_URL}/whatsapp/status`, {
            message: 'Pairing Failed: ' + err.message,
            ready: false,
            user_id
          });
        } catch (e) { }
      }
    }, 3000);
  }

  // Handle Messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      // Basic extraction (text conversation)
      const msgBody = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (!msgBody) continue;

      const remoteJid = msg.key.remoteJid;
      const isGroup = remoteJid.endsWith('@g.us');

      if (!isGroup) {
        // console.log('Ignoring non-group message');
        continue;
      }

      // Check selection
      if (!shouldAnalyzeGroup(remoteJid, selectedGroups)) {
        // console.log(`Skipping unselected group: ${remoteJid}`);
        continue;
      }

      const senderName = msg.pushName || 'Unknown';
      // console.log(`📨 Message in ${remoteJid}: ${msgBody}`);

      const messageData = {
        content: msgBody,
        sender_name: senderName,
        group_id: remoteJid,
        timestamp: new Date((msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString(),
      };

      // Send to backend
      try {
        await axios.post(
          `${BASE_URL}/messages/from-whatsapp`,
          messageData,
          { headers: { "x-api-key": API_KEY } }
        );
        // console.log(`Sent to backend: ${msgBody.substring(0, 20)}...`);
      } catch (err) {
        console.error("❌ Error forwarding:", err.message);
      }
    }
  });
}

// Logic to Sync Groups
async function syncGroups() {
  console.log('🔄 Syncing groups...');
  try {
    const groupsDict = await sock.groupFetchAllParticipating();
    allGroups = Object.values(groupsDict).map(g => ({
      id: { _serialized: g.id }, // Mimic wwebjs structure for compatibility
      name: g.subject
    }));

    console.log(`📌 Found ${allGroups.length} WhatsApp groups`);

    // Send to Backend
    const groupsData = allGroups.map(group => ({
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

    // Load selections logic (Mimicking existing logic)
    selectedGroups = loadSelectedGroups();
    // Auto-select if none selected
    if (Object.keys(selectedGroups).length === 0) {
      console.log('No groups selected, selecting all by default...');
      allGroups.forEach(group => {
        selectedGroups[group.id._serialized] = {
          name: group.name,
          selected: true,
          addedAt: new Date().toISOString()
        };
      });
      saveSelectedGroups(selectedGroups);
    }

  } catch (err) {
    console.log('❌ Error fetching groups:', err);
  }
}

// Backend Monitoring same as before
function startGroupSelectionMonitoring() {
  console.log('🔄 Starting automatic group selection monitoring...');
  setInterval(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/groups/selected/${user_id}`, {
        headers: { "x-api-key": API_KEY },
      });
      const backendGroups = response.data;
      // Convert backend groups to local format
      const newSelectedGroups = {};
      for (const group of backendGroups) {
        const whatsappGroup = allGroups.find(g => g.name === group.name);
        if (whatsappGroup) {
          newSelectedGroups[whatsappGroup.id._serialized] = {
            name: group.name,
            selected: true,
            addedAt: new Date().toISOString()
          };
        }
      }

      // Check changes (simplified)
      const currentKeys = Object.keys(selectedGroups).sort().join(',');
      const newKeys = Object.keys(newSelectedGroups).sort().join(',');
      if (currentKeys !== newKeys) {
        console.log('🔄 Selection updated from backend');
        selectedGroups = newSelectedGroups;
        saveSelectedGroups(selectedGroups);
      }
    } catch (error) {
      // ignore
    }
  }, 5000);
}

// Start
connectToWhatsApp();
