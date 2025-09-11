import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import puppeteer from "puppeteer";
import qrcode from "qrcode-terminal";
import axios from "axios";
import os from "node:os";
import path from "node:path";
import { BASE_URL, API_KEY } from "./config.js";

// ---- WhatsApp client ----
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "chatnalyxer-bot",
    dataPath: path.join(os.homedir(), ".wwebjs-sessions"),
  }),
  puppeteer: {
    executablePath: puppeteer.executablePath(), // ensures correct Chromium
    headless: false, // show Chrome for debugging
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-features=site-per-process",
    ],
  },
});

// ---- QR Code ----
client.on("qr", (qr) => {
  console.log("📲 Scan this QR to log in:");
  qrcode.generate(qr, { small: true });
});

// ---- When WhatsApp is ready ----
client.on("ready", async () => {
  console.log("✅ WhatsApp bot is ready! Waiting for new messages...");

  try {
    const chats = await client.getChats();
    const groups = chats.filter((chat) => chat.isGroup);

    if (groups.length === 0) {
      console.log('❌ No groups found.');
      return;
    }
    console.log(`📌 Found ${groups.length} groups:`);
    groups.forEach((group) => console.log(`- ${group.name}`));
  } catch (err) {
    console.error("❌ Error during initial sync:", err.message);
  }
});

// ---- Forward new group messages ----
// The following code is already configured to send messages from all people in the group.
// It does not filter by sender, as required for the AI to work.
client.on("message_create", async (msg) => {
  try {
    const chat = await msg.getChat();
    const contact = await msg.getContact();

    if (!chat.isGroup) {
      return;
    }

    // This is the data being sent to Rahul's backend
    const messageData = {
      content: msg.body,
      sender_name: contact.pushname || contact.name || contact.number,
      group_id: chat.id._serialized, // A unique ID for the group
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
    };

    // Send the message to Rahul's backend with the API key
    await axios.post(
      `${BASE_URL}/messages/from-whatsapp`,
      messageData,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );
    console.log(`➡️ Sent to backend from ${messageData.sender_name} in ${chat.name}: ${msg.body}`);
  } catch (error) {
    console.error("❌ Error forwarding:", error.response?.data || error.message);
  }
});

// ---- Auto-reconnect if disconnected ----
client.on("disconnected", () => {
  console.error("🔌 Disconnected — restarting…");
  setTimeout(() => client.initialize(), 3000);
});

// ---- Start client ----
client.initialize();
