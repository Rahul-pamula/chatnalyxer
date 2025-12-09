import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import axios from "axios";
import os from "node:os";
import path from "node:path";
import { BASE_URL, API_KEY } from "./config.js";
import {
  loadSelectedGroups,
  saveSelectedGroups,
  selectGroupsInteractively,
  shouldAnalyzeGroup,
  getSelectedGroupNames
} from "./services/groupSelector.js";

// Handle unhandled rejections to catch ProtocolErrors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason && reason.message && reason.message.includes("Execution context was destroyed")) {
    console.log("🔄 Unhandled ProtocolError — restarting client...");
    client.destroy();
    setTimeout(() => client.initialize(), 5000);
  }
});

// Get user_id from command line argument
const user_id = process.argv[2] || "default";

// Global variable to store selected groups
let selectedGroups = {};
let allGroups = [];

// ---- WhatsApp client ----
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: `chatnalyxer-bot-${user_id}`,
    dataPath: path.join(os.homedir(), `.wwebjs-sessions-${user_id}`),
  }),
  puppeteer: {
    headless: false, // run with visible browser for QR scanning
    ignoreHTTPSErrors: true,
    timeout: 60000, // Increase timeout to 60 seconds
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-features=site-per-process",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      `--user-data-dir=${path.join(os.homedir(), `whatsapp-data-${user_id}`)}`,
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-ipc-flooding-protection",
      "--no-zygote",
      "--disable-gpu-sandbox",
      "--disable-software-rasterizer",
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      "--disable-blink-features=AutomationControlled",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-crash-upload",
      "--disable-component-extensions-with-background-pages",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--force-color-profile=srgb",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  },
});

// ---- QR Code ----
let qrReceivedCallback = null;

client.on("qr", async (qr) => {
  if (qrReceivedCallback) {
    qrReceivedCallback(qr);
  }
});

export function startClient(qrCallback) {
  qrReceivedCallback = qrCallback;
  client.initialize();
}

export function stopClient() {
  client.destroy();
}


async function safeGetChats(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const chats = await client.getChats();
      return chats;
    } catch (error) {
      console.log(`Attempt ${attempt} failed to get chats: ${error.message}`);
      if (error.message && error.message.includes("Execution context was destroyed")) {
        console.log("🔄 ProtocolError in getChats — restarting client...");
        client.destroy();
        await new Promise(resolve => setTimeout(resolve, 5000));
        client.initialize();
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for reinitialization
      } else if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
    }
  }
}

// ---- When WhatsApp is ready ----
client.on("ready", async () => {
  console.log("✅ WhatsApp bot is ready!");

  // Send status to backend
  try {
    await axios.post(`${BASE_URL}/whatsapp/status`, { message: '✅ WhatsApp bot is ready!', ready: true, user_id });
  } catch (error) {
    console.log('Error sending status to backend:', error.message);
  }

  client.on('group_join', async (notification) => {
    console.log('Bot added to group:', notification.chat.name);
    // Sync groups immediately
    try {
      const chats = await safeGetChats();
      const currentGroups = chats.filter((chat) => chat.isGroup);
      await syncGroupsWithBackend(currentGroups);
      allGroups = currentGroups;
    } catch (err) {
      console.log('Error syncing groups on group join:', err.message);
    }
  });

  // Wait a bit for the page to fully load
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    const chats = await safeGetChats();
    allGroups = chats.filter((chat) => chat.isGroup);

    if (allGroups.length === 0) {
      console.log('❌ No groups found.');
      return;
    }

    console.log(`📌 Found ${allGroups.length} WhatsApp groups`);

    // Sync all groups with backend first
    await syncGroupsWithBackend(allGroups);
    // Periodic sync of groups every 5 minutes
    setInterval(async () => {
      try {
        const chats = await safeGetChats();
        const currentGroups = chats.filter((chat) => chat.isGroup);
        await syncGroupsWithBackend(currentGroups);
        allGroups = currentGroups;
      } catch (err) {
        console.log('Error syncing groups periodically:', err.message);
      }
    }, 5 * 60 * 1000); // 5 minutes
    // Load previously selected groups
    selectedGroups = loadSelectedGroups();

    // Check if any groups are already selected
    const selectedCount = Object.values(selectedGroups).filter(g => g.selected).length;

    if (selectedCount === 0) {
      // First time or no groups selected - select all groups by default
      console.log('\n🎯 No groups currently selected for analysis - selecting all groups by default');
      allGroups.forEach(group => {
        selectedGroups[group.id._serialized] = {
          name: group.name,
          selected: true,
          addedAt: new Date().toISOString()
        };
      });
      saveSelectedGroups(selectedGroups);
      console.log(`✅ Selected all ${allGroups.length} groups for analysis`);
    } else {
      // Show currently selected groups
      console.log(`\n✅ Currently analyzing ${selectedCount} selected groups:`);
      getSelectedGroupNames(selectedGroups).forEach(name => {
        console.log(`   - ${name}`);
      });
      console.log('\n💡 Group selection will auto-update when changed via web interface\n');
    }

    // Start monitoring for group selection changes
    startGroupSelectionMonitoring();

    console.log('\n⏳ Waiting for new messages from selected groups...');

  } catch (err) {
    console.error("❌ Error during initial sync:", err.message);
  }
});

// ---- Sync groups with backend ----
async function syncGroupsWithBackend(groups) {
  try {
    const groupsData = groups.map(group => ({
      whatsapp_id: group.id._serialized,
      name: group.name
    }));

    await axios.post(
      `${BASE_URL}/groups/sync-from-whatsapp`,
      { groups: groupsData },
      {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json"
        },
      }
    );

    console.log('✅ Groups synced with backend');
  } catch (error) {
    console.error('❌ Error syncing groups with backend:', error.response?.data || error.message);
  }
}

// ---- Forward new group messages ----
client.on("message_create", async (msg) => {
  // Skip if client not authenticated
  if (!client.info || !client.info.wid) {
    return;
  }

  try {
    const chat = await msg.getChat();

    if (!chat.isGroup) {
      return;
    }

    // Check if this group is selected for analysis
    if (!shouldAnalyzeGroup(chat.id._serialized, selectedGroups)) {
      return; // Skip messages from unselected groups
    }

    // Skip empty messages
    if (!msg.body || msg.body.trim() === '') {
      return;
    }

    let sender_name = 'Unknown';
    try {
      const contact = await msg.getContact();
      sender_name = contact.pushname || contact.name || contact.number || 'Unknown';
    } catch (error) {
      console.log('Could not get contact:', error.message);
    }

    const messageData = {
      content: msg.body,
      sender_name: sender_name,
      group_id: chat.id._serialized,
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
    };

    // Send the message to backend
    await axios.post(
      `${BASE_URL}/messages/from-whatsapp`,
      messageData,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    console.log(`📨 [${chat.name}] ${messageData.sender_name}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`);
  } catch (error) {
    console.error("❌ Error forwarding:", error.response?.data || error.message);
    if (error.message && error.message.includes("Execution context was destroyed")) {
      console.log("🔄 ProtocolError in message processing — restarting client...");
      setTimeout(() => {
        client.destroy();
        setTimeout(() => client.initialize(), 1000);
      }, 5000);
    }
  }
});

// ---- Auto-reconnect if disconnected ----
client.on("disconnected", () => {
  console.error("🔌 Disconnected — restarting…");
  setTimeout(() => client.initialize(), 3000);
});

// ---- Handle client errors ----
client.on("error", (error) => {
  console.error("❌ WhatsApp client error:", error.message);
  if (error.message.includes("Execution context was destroyed")) {
    console.log("🔄 Execution context destroyed — restarting client...");
    setTimeout(() => client.initialize(), 5000);
  }
});

// ---- Auto group selection monitoring ----
function startGroupSelectionMonitoring() {
  console.log('🔄 Starting automatic group selection monitoring...');

  setInterval(async () => {
    try {
      // Fetch selected groups from database
      const response = await axios.get(`${BASE_URL}/groups/selected/${user_id}`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });
      const backendGroups = response.data;

      // Convert backend groups to the local format
      const newSelectedGroups = {};
      for (const group of backendGroups) {
        // Find matching WhatsApp group by name
        const whatsappGroup = allGroups.find(g => g.name === group.name);
        if (whatsappGroup) {
          newSelectedGroups[whatsappGroup.id._serialized] = {
            name: group.name,
            selected: true,
            addedAt: new Date().toISOString()
          };
        }
      }

      // Compare with current selection
      const currentSelected = Object.keys(selectedGroups).filter(id => selectedGroups[id]?.selected);
      const newSelected = Object.keys(newSelectedGroups);

      // Check if there are changes
      const hasChanges = currentSelected.length !== newSelected.length ||
        !currentSelected.every(id => newSelected.includes(id));

      if (hasChanges) {
        console.log('\n🔄 Group selection changed via web interface!');
        console.log(`📊 Now monitoring ${newSelected.length} groups:`);

        selectedGroups = newSelectedGroups;
        saveSelectedGroups(selectedGroups);

        getSelectedGroupNames(selectedGroups).forEach(name => {
          console.log(`   - ${name}`);
        });
        console.log('✅ WhatsApp integration updated automatically\n');
      }

    } catch (error) {
      // Silently ignore errors to avoid spam - database might be temporarily unavailable
    }
  }, 5000); // Check every 5 seconds
}

// ---- Start client ----
client.initialize();
