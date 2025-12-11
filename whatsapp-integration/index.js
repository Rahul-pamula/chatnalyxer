import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import P from "pino";
import axios from "axios";
import fs from "fs";
import path from "path";
import { BASE_URL, API_KEY } from "./config-esm.js";

// Get user_id and phone_number from command line argument
const user_id = process.argv[2] || "default";
const phoneNumber = process.argv[3]; // Phone number passed from backend

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
        syncFullHistory: false,
        logger: P({ level: 'silent' }),
        browser: ["Chatnalyxer", "Chrome", "1.0.0"],
        markOnlineOnConnect: true,
    });

    sock.ev.on('creds.update', saveCreds);

    // Track if pairing code was requested
    let pairingCodeRequested = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;

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

            // Clear session on 401 to get fresh start
            if (lastDisconnect?.error?.output?.statusCode === 401) {
                console.log('❌ 401 error - clearing session for fresh start');
                try {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    // Recreate the folder immediately to avoid crash
                    fs.mkdirSync(authPath, { recursive: true });
                } catch (e) {
                    console.log('Error managing auth folder:', e.message);
                }
            }

            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 3000);
            } else {
                console.log('❌ Logged out. Delete auth folder to restart.');
                try { fs.rmSync(authPath, { recursive: true, force: true }); } catch (e) { }
            }
        } else if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');

            // Request pairing code ONLY if phone number is provided AND valid
            if (phoneNumber && phoneNumber.length >= 10 && !pairingCodeRequested && !sock.authState.creds.registered) {
                pairingCodeRequested = true;
                console.log(`⏰ Phone number provided: ${phoneNumber}`);

                // Wait a moment for connection to stabilize
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
                        console.log('❌ Failed to request pairing code:', err.message);
                        pairingCodeRequested = false; // Allow retry
                        try {
                            await axios.post(`${BASE_URL}/whatsapp/status`, {
                                message: 'Pairing Failed: ' + err.message,
                                ready: false,
                                user_id
                            });
                        } catch (e) { }
                    }
                }, 5000);
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
            console.log('\n⏳ Waiting for new messages from selected groups...');
        }
    });

    // Handle Messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            const msgBody = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            if (!msgBody) continue;

            const remoteJid = msg.key.remoteJid;
            const isGroup = remoteJid.endsWith('@g.us');

            if (!isGroup) continue;

            const senderName = msg.pushName || 'Unknown';

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
        const allGroups = Object.values(groupsDict).map(g => ({
            id: { _serialized: g.id },
            name: g.subject
        }));

        console.log(`📌 Found ${allGroups.length} WhatsApp groups`);

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
    } catch (err) {
        console.log('❌ Error fetching groups:', err);
    }
}

// Start
connectToWhatsApp();
