/**
 * User WhatsApp Service
 * Port: 3002
 * 
 * Responsibilities:
 * - WhatsApp connection management
 * - QR code generation
 * - Pairing code generation
 * - Message listening and forwarding
 * - PDF/Image processing (in-memory, Azure AI)
 * - OTP sending (for admin service)
 * 
 * Does NOT handle:
 * - Admin dashboard
 * - Admin authentication
 */

import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';

const app = express();
app.use(express.json());

// Get User ID, Port, and Phone Number from command-line arguments
const userId = parseInt(process.argv[2]) || 1;
const PORT = parseInt(process.argv[3]) || 3002;
const phoneNumber = process.argv[4]; // NEW: Phone number for pairing code

console.log(`🚀 Starting User WhatsApp Service for User ${userId} on Port ${PORT}`);
if (phoneNumber) {
    console.log(`📞 Phone number: ${phoneNumber}`);
}

// Global state
let sock;
let isClientReady = false;
let currentQR = null;
let isExpired = false;
let pairingCodeRequested = false; // Track if pairing code was requested

// Pairing Code State - will be populated by real Baileys code
let currentPairingCode = {
    code: null,
    expiresAt: null,
    generatedAt: null
};

// Get isRender flag
const isRender = process.env.RENDER;

// Auth state folder - dynamic based on user ID
const AUTH_FOLDER = isRender
    ? `/opt/render/.wwebjs-sessions-otp/baileys_auth_info_user_${userId}`
    : `./sessions/user_${userId}`;

// Ensure auth folder exists IMMEDIATELY
console.log(`📁 Creating auth folder: ${AUTH_FOLDER}`);
try {
    if (!fs.existsSync(AUTH_FOLDER)) {
        fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        console.log(`✅ Auth folder created: ${AUTH_FOLDER}`);
    } else {
        console.log(`✅ Auth folder already exists: ${AUTH_FOLDER}`);
    }
} catch (error) {
    console.error(`❌ Failed to create auth folder: ${error.message}`);
    process.exit(1);
}

// ============================================
// WHATSAPP CONNECTION LOGIC
// ============================================

async function connectToWhatsApp(isManualRequest = false) {
    // If already ready, don't reconnect unless manual
    if (isClientReady && sock?.ws?.isOpen && !isManualRequest) return;

    // Force cleanup if manual request or replacing socket
    if (sock) {
        try {
            sock.end(undefined);
            sock = null;
        } catch (e) { }
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        const { version } = await fetchLatestBaileysVersion();

        console.log(`Using WA v${version.join('.')}`);

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            mobile: false,
            browser: ['Chatnalyxer', 'Chrome', '120.0.0.0'],
            connectTimeoutMs: 60000,
            qrMaxRetries: 2,
        });

        let qrRotationCount = 0;

        sock.ev.on('creds.update', saveCreds);


        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Generate QR code (only once per session)
                currentQR = qr;
                isClientReady = false;
                isExpired = false;
                console.log(`📸 QR Code generated - Scan now!`);
            }


            // NEW: Handle pairing code request (when connecting)
            if (connection === 'connecting' && phoneNumber && !pairingCodeRequested && !sock.authState.creds.registered) {
                pairingCodeRequested = true;
                console.log(`⏰ Phone number provided: ${phoneNumber}`);

                // Wait a moment for connection to stabilize
                setTimeout(async () => {
                    try {
                        console.log(`📡 Requesting Pairing Code for ${phoneNumber}...`);
                        const code = await sock.requestPairingCode(phoneNumber);
                        console.log(`✅ Pairing Code received: ${code}`);
                        console.log(`⏰ Code valid for ~60 seconds. Please enter it in WhatsApp NOW!`);

                        // Store the real pairing code
                        currentPairingCode = {
                            code: code,
                            expiresAt: Date.now() + 60000, // 1 minute
                            generatedAt: Date.now()
                        };

                        console.log(`🔑 Real Baileys pairing code: ${code}`);
                    } catch (err) {
                        console.log('❌ Failed to request pairing code:', err.message);
                        isExpired = true;
                    }
                }, 3000); // Wait 3 seconds for connection to stabilize
            }

            if (connection === 'close') {
                isClientReady = false;
                currentQR = null;

                const error = lastDisconnect?.error;
                const statusCode = (error instanceof Boom) ? error.output.statusCode : undefined;

                console.log(`❌ Connection closed. Status: ${statusCode}.`);

                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    console.log("🚪 Logged out / Auth Invalid. Clearing session.");
                    try {
                        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    } catch (e) { }
                    isExpired = true;
                    return;
                }

                if (statusCode === DisconnectReason.restartRequired) {
                    console.log("🔄 Restart Required (515). Reconnecting...");
                    setTimeout(() => connectToWhatsApp(false), 1000);
                    return;
                }

                if (!isClientReady) {
                    console.log("⚠️ Connection failed during QR phase. Marking as EXPIRED.");
                    isExpired = true;

                    // Report failure to backend
                    try {
                        const axios = (await import('axios')).default;
                        const BASE_URL = 'http://localhost:8000';
                        await axios.post(`${BASE_URL}/whatsapp/status`, {
                            user_id: process.argv[2] || 1,
                            ready: false,
                            message: "Connection Failed/Expired",
                            expired: true
                        });
                    } catch (e) { console.error("Failed to report status:", e.message); }

                    return;
                }

                if (statusCode !== DisconnectReason.loggedOut) {
                    console.log("🔄 Active connection lost. Reconnecting...");
                    setTimeout(() => connectToWhatsApp(false), 2000);

                    // Report reconnecting
                    try {
                        const axios = (await import('axios')).default;
                        const BASE_URL = 'http://localhost:8000';
                        await axios.post(`${BASE_URL}/whatsapp/status`, {
                            user_id: process.argv[2] || 1,
                            ready: false,
                            message: "Reconnecting...",
                            expired: false
                        });
                    } catch (e) { }
                }

            } else if (connection === 'open') {
                console.log('✅ WhatsApp Connected!');
                isClientReady = true;
                currentQR = null;
                isExpired = false;

                // Report SUCCESS to session manager
                try {
                    const axios = (await import('axios')).default;
                    const SESSION_MANAGER_URL = 'http://localhost:3002';
                    const userId = parseInt(process.argv[2]) || 1;

                    await axios.post(`${SESSION_MANAGER_URL}/sessions/update-status`, {
                        user_id: userId,
                        status: 'open',  // Mark as open/ready
                        ready: true
                    });
                    console.log('📊 Status reported to session manager: open');
                } catch (e) {
                    console.error('❌ Failed to report status to session manager:', e.message);
                }

                // Sync WhatsApp groups to backend
                try {
                    const axios = (await import('axios')).default;
                    const userId = parseInt(process.argv[2]) || 1;

                    console.log('📋 Fetching WhatsApp groups...');
                    const groups = await sock.groupFetchAllParticipating();
                    const groupsList = Object.values(groups).map(group => ({
                        whatsapp_id: group.id,
                        name: group.subject || 'Unknown Group'
                    }));

                    console.log(`📤 Syncing ${groupsList.length} groups to backend...`);
                    await axios.post('http://localhost:8000/groups/sync-from-whatsapp', {
                        user_id: userId,
                        groups: groupsList
                    }, {
                        headers: {
                            'X-API-Key': 'b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4'
                        }
                    });
                    console.log(`✅ Synced ${groupsList.length} groups successfully!`);
                } catch (e) {
                    console.error('❌ Failed to sync groups:', e.message);
                }
            }
        });

        // ============================================
        // MESSAGE LISTENER - Phase 1 Ephemeral Processing
        // ============================================
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                if (!msg.message) continue;

                const remoteJid = msg.key.remoteJid;
                const isGroup = remoteJid.endsWith('@g.us');

                // Only process group messages
                if (!isGroup) continue;

                const senderName = msg.pushName || 'Unknown';
                let msgBody = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

                // Media Handling Variables
                let mediaType = "text";
                let finalContent = msgBody;

                const { downloadMediaMessage } = await import('@whiskeysockets/baileys');

                // 1. Check for Document (PDFs)
                if (msg.message.documentMessage) {
                    const doc = msg.message.documentMessage;
                    mediaType = "pdf";
                    msgBody = doc.caption || doc.fileName || "[PDF Document]";
                    finalContent = msgBody;

                    console.log(`📄 PDF detected in ${remoteJid}: ${doc.fileName}`);

                    try {
                        // Download Media to memory buffer (NO FILE SAVING)
                        const buffer = await downloadMediaMessage(
                            msg,
                            'buffer',
                            {},
                            {
                                logger: pino({ level: 'silent' }),
                                reuploadRequest: sock.updateMediaMessage
                            }
                        );

                        console.log(`✅ Downloaded PDF to memory: ${buffer.length} bytes`);

                        // Send buffer to backend for Azure AI analysis
                        const FormData = (await import('form-data')).default;
                        const formData = new FormData();
                        formData.append('file', buffer, {
                            filename: doc.fileName || 'document.pdf',
                            contentType: 'application/pdf'
                        });

                        // Backend will use Azure Document Intelligence to extract text
                        const axios = (await import('axios')).default;
                        const BASE_URL = 'http://localhost:8000';

                        const analysisResponse = await axios.post(
                            `${BASE_URL}/media/analyze-pdf`,
                            formData,
                            {
                                headers: formData.getHeaders(),
                                maxBodyLength: Infinity,
                                maxContentLength: Infinity
                            }
                        );

                        finalContent = analysisResponse.data.extracted_text || msgBody;
                        console.log(`✨ Azure AI extracted ${finalContent.length} chars from PDF`);

                        // Buffer automatically garbage collected - no cleanup needed!

                    } catch (e) {
                        console.error("❌ Failed to process PDF:", e.message);
                        finalContent = msgBody; // Fallback to caption
                    }
                }
                // 2. Check for Image
                else if (msg.message.imageMessage) {
                    const img = msg.message.imageMessage;
                    mediaType = "image";
                    msgBody = img.caption || "[Image]";
                    finalContent = msgBody;

                    try {
                        // Download Media to memory buffer (NO FILE SAVING)
                        const buffer = await downloadMediaMessage(
                            msg,
                            'buffer',
                            {},
                            {
                                logger: pino({ level: 'silent' }),
                                reuploadRequest: sock.updateMediaMessage
                            }
                        );

                        console.log(`✅ Downloaded image to memory: ${buffer.length} bytes`);

                        // Send buffer to backend for Azure AI analysis
                        const FormData = (await import('form-data')).default;
                        const formData = new FormData();
                        formData.append('file', buffer, {
                            filename: 'image.jpg',
                            contentType: 'image/jpeg'
                        });

                        // Backend will use Azure Vision API to extract text
                        const axios = (await import('axios')).default;
                        const BASE_URL = 'http://localhost:8000';

                        const analysisResponse = await axios.post(
                            `${BASE_URL}/media/analyze-image`,
                            formData,
                            {
                                headers: formData.getHeaders(),
                                maxBodyLength: Infinity,
                                maxContentLength: Infinity
                            }
                        );

                        finalContent = analysisResponse.data.extracted_text || msgBody;
                        console.log(`✨ Azure AI extracted ${finalContent.length} chars from image`);

                        // Buffer automatically garbage collected - no cleanup needed!

                    } catch (e) {
                        console.error("❌ Failed to process image:", e.message);
                        finalContent = msgBody; // Fallback to caption
                    }
                }

                // If no text, skip
                if (!msgBody) continue;

                // ============================================
                // CHECK IF GROUP IS SELECTED/ACTIVE
                // ============================================
                try {
                    const axios = (await import('axios')).default;
                    const BASE_URL = 'http://localhost:8000';
                    const API_KEY = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4";

                    // Fetch selected groups for this user
                    const selectedGroupsResponse = await axios.get(
                        `${BASE_URL}/groups/selected/${userId}`,
                        {
                            headers: { 'X-API-Key': API_KEY }
                        }
                    );

                    const selectedGroups = selectedGroupsResponse.data;
                    const isGroupSelected = selectedGroups.some(g => g.whatsapp_id === remoteJid);

                    if (!isGroupSelected) {
                        console.log(`⏭️  Skipping message from non-selected group: ${remoteJid}`);
                        continue; // Skip this message
                    }

                    console.log(`✅ Group is selected, processing message...`);
                } catch (e) {
                    console.error("❌ Failed to check group selection status:", e.message);
                    // On error, skip the message to be safe
                    continue;
                }

                // Send to Backend
                try {
                    const axios = (await import('axios')).default;
                    const BASE_URL = 'http://localhost:8000';
                    const API_KEY = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4";

                    await axios.post(`${BASE_URL}/messages/from-whatsapp`, {
                        user_id: userId, // Include user ID
                        content: msgBody,
                        extracted_content: finalContent !== msgBody ? finalContent : null,
                        sender_name: senderName,
                        group_id: remoteJid,
                        timestamp: new Date().toISOString(),
                        media_url: null, // No longer saving files
                        media_type: mediaType
                    }, {
                        headers: {
                            'X-API-Key': API_KEY
                        }
                    });

                    console.log(`✅ Message forwarded to backend (${mediaType}): ${msgBody.substring(0, 50)}...`);
                } catch (e) {
                    console.error("❌ Failed to forward message to backend:", e.message);
                }
            }
        });
    } catch (err) {
        console.error("Setup error:", err);
        isExpired = true;
    }
}

// Initialize on start
connectToWhatsApp(false);

// ============================================
// API ENDPOINTS
// ============================================

// Connect/Reconnect
app.post('/connect', (req, res) => {
    console.log("📢 User requested manual connection (Regenerate QR)");
    isExpired = false;
    currentQR = null;
    connectToWhatsApp(true);
    res.json({ message: 'Connection started' });
});

// Disconnect
app.post('/disconnect', async (req, res) => {
    console.log("🛑 User requested disconnect");
    try {
        await sock?.logout();
    } catch (e) { }
    isClientReady = false;
    currentQR = null;
    res.json({ message: 'Disconnected' });
});

// Sync Groups - Manual refresh
app.post('/sync-groups', async (req, res) => {
    try {
        if (!sock || !isClientReady) {
            return res.status(400).json({ error: 'WhatsApp not connected' });
        }

        const axios = (await import('axios')).default;
        const userId = parseInt(process.argv[2]) || 1;

        console.log('📋 Manually syncing WhatsApp groups...');
        const groups = await sock.groupFetchAllParticipating();
        const groupsList = Object.values(groups).map(group => ({
            whatsapp_id: group.id,
            name: group.subject || 'Unknown Group'
        }));

        console.log(`📤 Syncing ${groupsList.length} groups to backend...`);
        await axios.post('http://localhost:8000/groups/sync-from-whatsapp', {
            user_id: userId,
            groups: groupsList
        }, {
            headers: {
                'X-API-Key': 'b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4'
            }
        });

        console.log(`✅ Synced ${groupsList.length} groups successfully!`);
        res.json({
            success: true,
            message: `Synced ${groupsList.length} groups`,
            count: groupsList.length
        });
    } catch (e) {
        console.error('❌ Failed to sync groups:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Get QR Code
app.get('/qr', async (req, res) => {
    try {
        const response = {
            ready: isClientReady,
            expired: isExpired,
            qr: null
        };

        if (currentQR && !isExpired) {
            response.qr = await QRCode.toDataURL(currentQR);
        }
        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get Pairing Code
app.get('/pairing-code', (req, res) => {
    try {
        const isExpired = !currentPairingCode.code || Date.now() > currentPairingCode.expiresAt;
        const timeRemaining = currentPairingCode.code
            ? Math.max(0, currentPairingCode.expiresAt - Date.now())
            : 0;

        res.json({
            code: isExpired ? null : currentPairingCode.code,
            expiresAt: currentPairingCode.expiresAt,
            generatedAt: currentPairingCode.generatedAt,
            timeRemaining: Math.floor(timeRemaining / 1000),
            expired: isExpired,
            formatted: isExpired ? null : currentPairingCode.code.match(/.{1,4}/g).join(' ')
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate New Pairing Code
app.post('/pairing-code/generate', (req, res) => {
    try {
        // Return the real Baileys pairing code (generated during connection)
        const isExpired = !currentPairingCode.code || Date.now() > currentPairingCode.expiresAt;
        const timeRemaining = currentPairingCode.code
            ? Math.max(0, currentPairingCode.expiresAt - Date.now())
            : 0;

        if (isExpired || !currentPairingCode.code) {
            return res.status(400).json({
                error: 'No pairing code available. Please start WhatsApp session first.',
                expired: true
            });
        }

        res.json({
            code: currentPairingCode.code,
            expiresAt: currentPairingCode.expiresAt,
            generatedAt: currentPairingCode.generatedAt,
            timeRemaining: Math.floor(timeRemaining / 1000),
            expired: false,
            formatted: currentPairingCode.code.match(/.{1,4}/g).join(' ')
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Connection Status
app.get('/status', (req, res) => {
    res.json({
        ready: isClientReady,
        expired: isExpired,
        message: isClientReady ? 'WhatsApp service is ready' : 'WhatsApp service is not ready'
    });
});

// Send OTP (for admin service)
app.post('/send-otp', async (req, res) => {
    try {
        const { phone_number, message } = req.body;
        if (!phone_number || !message) return res.status(400).json({ error: 'Missing fields' });

        const isSocketOpen = sock?.ws?.isOpen;
        const hasUser = !!sock?.user;

        if (!isClientReady && !isSocketOpen && !hasUser) {
            console.log("❌ Service not ready");
            return res.status(503).json({ error: 'Service not ready' });
        }

        // Format phone (Baileys requires proper JID)
        let jid = phone_number.replace(/\\D/g, '');
        if (!jid.endsWith('@s.whatsapp.net')) jid += '@s.whatsapp.net';

        await sock.sendMessage(jid, { text: message });

        console.log(`✅ OTP sent to ${jid}`);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'user-whatsapp',
        port: PORT,
        whatsapp_ready: isClientReady,
        uptime: process.uptime()
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`✅ User WhatsApp Service running on http://localhost:${PORT}`);
    console.log(`📱 WhatsApp Status: ${isClientReady ? 'Connected' : 'Initializing...'}`);
});
