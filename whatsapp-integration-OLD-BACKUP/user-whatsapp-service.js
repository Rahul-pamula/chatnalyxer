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

// Get User ID and Port from command-line arguments
const userId = parseInt(process.argv[2]) || 1;
const PORT = parseInt(process.argv[3]) || 3002;

console.log(`🚀 Starting User WhatsApp Service for User ${userId} on Port ${PORT}`);

// Global state
let sock;
let isClientReady = false;
let currentQR = null;
let isExpired = false;

// Pairing Code State
let currentPairingCode = {
    code: null,
    expiresAt: null,
    generatedAt: null
};

// Generate 8-digit pairing code
const generatePairingCode = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// Generate new pairing code (called manually by user)
const createNewPairingCode = () => {
    currentPairingCode = {
        code: generatePairingCode(),
        expiresAt: Date.now() + 60000, // 1 minute
        generatedAt: Date.now()
    };
    console.log(`🔑 Pairing code generated: ${currentPairingCode.code} (expires in 60s)`);
    return currentPairingCode;
};

// Get isRender flag
const isRender = process.env.RENDER;

// Auth state folder - dynamic based on user ID
const AUTH_FOLDER = isRender
    ? `/opt/render/.wwebjs-sessions-otp/baileys_auth_info_user_${userId}`
    : `./auth_info_baileys_user_${userId}`;

// Ensure auth folder exists
if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
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
                qrRotationCount++;
                if (qrRotationCount > 3) {
                    console.log("🛑 QR expired (No scan detected). Stopping.");
                    try { sock.end(undefined); } catch (e) { }
                    isClientReady = false;
                    currentQR = null;
                    isExpired = true;
                    return;
                }

                currentQR = qr;
                isClientReady = false;
                isExpired = false;
                console.log(`📸 QR Code generated (Attempt ${qrRotationCount}/3) - Scan now!`);
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

                // Report SUCCESS to backend
                try {
                    const axios = (await import('axios')).default;
                    const BASE_URL = 'http://localhost:8000';
                    const userId = process.argv[2] || 1;

                    await axios.post(`${BASE_URL}/whatsapp/status`, {
                        user_id: userId,
                        ready: true,
                        message: "Connected",
                        qr_code: null,
                        expired: false
                    });
                    console.log(`📡 Reported status to backend for User ${userId}`);
                } catch (e) {
                    console.error("❌ Failed to report status to backend:", e.message);
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
        const newCode = createNewPairingCode();
        res.json({
            code: newCode.code,
            expiresAt: newCode.expiresAt,
            generatedAt: newCode.generatedAt,
            timeRemaining: 60,
            expired: false,
            formatted: newCode.code.match(/.{1,4}/g).join(' ')
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
