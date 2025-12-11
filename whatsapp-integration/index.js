import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import P from "pino";
import axios from "axios";
import fs from "fs";
import path from "path";
import { BASE_URL, API_KEY } from "./config-esm.js";
import { shouldAnalyzeGroup } from "./services/groupSelector.js";

// Get user_id and phone_number from command line argument
const user_id = process.argv[2] || "default";
const phoneNumber = process.argv[3]; // Phone number passed from backend

// Global variable to store selected groups for this user
let selectedGroups = {}; // Track selected groups for filtering

let sock;
let qrGeneratedAt = null; // Track when QR/pairing code was generated
let qrExpirationTimeout = null; // Store timeout reference to cancel if needed
let pairingExpirationTimeout = null; // Store pairing code timeout reference

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
        console.log('⚠️ Failed to send initial status. Details:', {
            message: error.message,
            code: error.code,
            url: `${BASE_URL}/whatsapp/status`
        });
    }

    sock = makeWASocket({
        version,
        auth: state,
        syncFullHistory: false,
        logger: P({ level: 'silent' }),
        browser: ["Chrome (Linux)", "", ""], // More realistic browser identifier
        markOnlineOnConnect: false, // Don't mark online immediately
        printQRInTerminal: false, // Disable terminal QR to avoid confusion
        defaultQueryTimeoutMs: 60000, // Increase timeout
        connectTimeoutMs: 60000, // Increase connection timeout
    });

    sock.ev.on('creds.update', saveCreds);

    // Track if pairing code was requested
    let pairingCodeRequested = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;

        // Handle QR Code
        if (qr) {
            console.log('📱 QR Code received! Scan it in WhatsApp to link.');
            qrGeneratedAt = Date.now(); // Track generation time

            try {
                await axios.post(`${BASE_URL}/whatsapp/status`, {
                    message: 'Scan QR Code in WhatsApp',
                    ready: false,
                    user_id,
                    qr_code: qr,
                    pairing_code: null,
                    expired: false
                });
            } catch (e) {
                console.log('⚠️ Failed to send QR to backend. Details:', {
                    message: e.message,
                    code: e.code,
                    url: `${BASE_URL}/whatsapp/status`,
                    responseData: e.response?.data
                });
            }

            // Clear any existing timeout
            if (qrExpirationTimeout) {
                clearTimeout(qrExpirationTimeout);
            }

            // Set expiration timeout (60 seconds)
            qrExpirationTimeout = setTimeout(async () => {
                if (!sock?.user) { // Not connected yet
                    console.log('⏰ QR Code expired after 60 seconds');
                    try {
                        await axios.post(`${BASE_URL}/whatsapp/status`, {
                            message: 'QR Expired - Click Generate QR',
                            ready: false,
                            user_id,
                            qr_code: null,
                            pairing_code: null,
                            expired: true
                        });
                    } catch (e) {
                        console.log('⚠️ Failed to send expiration status:', e.message);
                    }

                    // Close connection and exit cleanly
                    console.log('🛑 Stopping process - waiting for user to generate new QR');
                    sock?.end();
                    process.exit(0);
                } else {
                    console.log('✅ User connected - QR timeout canceled');
                }
            }, 60000); // 60 seconds
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut;

            console.log(`🔌 Connection closed - Status: ${statusCode}, Error:`, lastDisconnect?.error?.message);

            // Notify backend of disconnect
            try {
                // If we are auto-reconnecting (not logged out), do NOT mark as expired.
                // This keeps the frontend polling so it can pick up the reconnection.
                await axios.post(`${BASE_URL}/whatsapp/status`, {
                    message: isLoggedOut ? 'Logged Out' : 'Reconnecting...',
                    ready: false,
                    user_id,
                    expired: isLoggedOut // Only expire if this is a permanent logout
                });
            } catch (e) {
                console.log('⚠️ Failed to send disconnect status:', e.message);
            }

            // Only clear session on explicit logout
            if (isLoggedOut) {
                console.log('🧹 User logged out - clearing session');
                try {
                    fs.rmSync(authPath, { recursive: true, force: true });
                } catch (e) {
                    console.log('Error clearing auth folder:', e.message);
                }
                console.log('🛑 Process stopped. User must click "Generate QR" to try again.');
                process.exit(0);
            } else {
                console.log('🔄 Connection lost temporarily. Reconnecting...');
                connectToWhatsApp();
            }
        } else if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');

            // PAIRING CODE DISABLED - ONLY QR CODE MODE
            /* 
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
                        
                        qrGeneratedAt = Date.now(); // Track generation time

                        // Send to backend
                        await axios.post(`${BASE_URL}/whatsapp/status`, {
                            message: 'Enter Pairing Code in WhatsApp',
                            ready: false,
                            user_id,
                            qr_code: null,
                            pairing_code: code,
                            expired: false
                        });
                        console.log(`✅ Backend notified of code: ${code}`);
                        console.log(`⏳ Waiting for you to enter the code in WhatsApp...`);
                        
                        // Clear any existing timeout
                        if (pairingExpirationTimeout) {
                            clearTimeout(pairingExpirationTimeout);
                        }
                        
                        // Set expiration timeout (60 seconds)
                        pairingExpirationTimeout = setTimeout(async () => {
                            if (!sock?.user) { // Not connected yet
                                console.log('⏰ Pairing Code expired after 60 seconds');
                                try {
                                    await axios.post(`${BASE_URL}/whatsapp/status`, {
                                        message: 'Pairing Code Expired - Click Generate QR',
                                        ready: false,
                                        user_id,
                                        qr_code: null,
                                        pairing_code: null,
                                        expired: true
                                    });
                                } catch (e) {
                                    console.log('⚠️ Failed to send expiration status:', e.message);
                                }
                                
                                // Close connection and exit cleanly
                                console.log('🛑 Stopping process - waiting for user to generate new code');
                                sock?.end();
                                process.exit(0);
                            } else {
                                console.log('✅ User connected - Pairing code timeout canceled');
                            }
                        }, 60000); // 60 seconds
                    } catch (err) {
                        console.log('❌ Failed to request pairing code:', err.message);
                        try {
                            await axios.post(`${BASE_URL}/whatsapp/status`, {
                                message: 'Pairing Failed: ' + err.message,
                                ready: false,
                                user_id,
                                expired: true
                            });
                        } catch (e) { }
                        
                        // Exit on failure - user must click Generate QR again
                        console.log('🛑 Process stopped due to pairing code error');
                        process.exit(1);
                    }
                }, 5000);
            }
            */
            console.log('📱 QR Code mode enabled - pairing code disabled');
        } else if (connection === 'open') {
            console.log('✅ WhatsApp bot is ready! Connection opened.');

            // Cancel any pending expiration timeouts since connection succeeded
            if (qrExpirationTimeout) {
                clearTimeout(qrExpirationTimeout);
                qrExpirationTimeout = null;
                console.log('✅ QR expiration timeout canceled - connection successful');
            }
            if (pairingExpirationTimeout) {
                clearTimeout(pairingExpirationTimeout);
                pairingExpirationTimeout = null;
                console.log('✅ Pairing code expiration timeout canceled - connection successful');
            }

            // Send status to backend
            try {
                await axios.post(`${BASE_URL}/whatsapp/status`, { message: '✅ WhatsApp bot is ready!', ready: true, user_id });
            } catch (error) {
                console.log('Error sending status to backend:', error.message);
            }

            // Sync Groups
            await syncGroups();
            // Load selected groups for filtering
            await loadSelectedGroupsFromBackend();
            // Periodically refresh selected groups (every 5 seconds)
            setInterval(async () => {
                await loadSelectedGroupsFromBackend();
            }, 5000);
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

            // ✨ Check if this group is selected for analysis
            if (!shouldAnalyzeGroup(remoteJid, selectedGroups)) {
                // Silently skip messages from unselected groups
                continue;
            }

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

                // Log successful forwarding
                const groupName = selectedGroups[remoteJid]?.name || remoteJid;
                console.log(`📨 [${groupName}] ${senderName}: ${msgBody.substring(0, 50)}${msgBody.length > 50 ? '...' : ''}`);
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

// Load selected groups from backend database
async function loadSelectedGroupsFromBackend() {
    try {
        const response = await axios.get(`${BASE_URL}/groups/selected/${user_id}`, {
            headers: { "x-api-key": API_KEY }
        });

        const backendGroups = response.data;
        const newSelectedGroups = {};

        for (const group of backendGroups) {
            newSelectedGroups[group.whatsapp_id] = {
                name: group.name,
                selected: true,
                addedAt: new Date().toISOString()
            };
        }

        selectedGroups = newSelectedGroups;
        const count = backendGroups.length;
        console.log(`✅ Loaded ${count} selected group${count !== 1 ? 's' : ''} for user ${user_id}`);
        if (count > 0) {
            console.log('   Selected groups:', backendGroups.map(g => g.name).join(', '));
        }

        return selectedGroups;
    } catch (error) {
        console.log('⚠️ Error loading selected groups from backend:', error.message);
        return {};
    }
}

// Start
connectToWhatsApp();
