/**
 * Admin WhatsApp Service (Separate from Users)
 * Port: 3003
 * Uses Baileys independently - NO mixing with user sessions
 */

import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import express from 'express';

const app = express();
app.use(express.json());

const PORT = 3003;
const logger = pino({ level: 'silent' });

let adminSocket = null;
let adminQR = null;
let adminConnected = false;
let qrCountdown = 60;
let qrTimer = null;

console.log('🚀 Starting Admin WhatsApp Service (Separate from Users)');

// QR Timer functions
function startQRTimer() {
    stopQRTimer();
    qrCountdown = 60;
    qrTimer = setInterval(() => {
        qrCountdown--;
        if (qrCountdown <= 0) {
            console.log('⏰ Admin QR expired');
            adminQR = null;
            stopQRTimer();
        }
    }, 1000);
}

function stopQRTimer() {
    if (qrTimer) {
        clearInterval(qrTimer);
        qrTimer = null;
    }
}

// Connect Admin WhatsApp
async function connectAdminWhatsApp() {
    try {
        console.log('📱 Connecting Admin WhatsApp...');

        // Use PostgreSQL Auth
        const { Pool } = await import('pg');
        const { usePostgresAuthState } = await import('./auth-adapter.js');

        // Get DB connection string from env or default to localhost
        const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chatnalyxer';

        const pool = new Pool({
            connectionString,
        });

        const { state, saveCreds } = await usePostgresAuthState(pool, 'admin-wa-session');
        const { version } = await fetchLatestBaileysVersion();

        adminSocket = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: state,
            browser: ['Chatnalyxer Admin', 'Chrome', '1.0.0']
        });

        // QR Code event
        adminSocket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📷 Admin QR Code generated');
                try {
                    adminQR = await QRCode.toDataURL(qr);
                    startQRTimer();
                } catch (error) {
                    console.error('❌ Failed to generate QR:', error);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                    : true;

                console.log('⚠️ Admin WhatsApp disconnected:', lastDisconnect?.error?.message);
                adminConnected = false;
                adminQR = null;
                stopQRTimer();

                if (shouldReconnect) {
                    console.log('🔄 Auto-reconnecting admin WhatsApp...');
                    setTimeout(() => connectAdminWhatsApp(), 3000);
                }
            } else if (connection === 'open') {
                console.log('✅ Admin WhatsApp connected!');
                adminConnected = true;
                adminQR = null;
                stopQRTimer();
            }
        });

        // Save credentials - critical for cloud persistence
        adminSocket.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('❌ Failed to connect admin WhatsApp:', error);
        adminConnected = false;
    }
}

// API Endpoints

// Get admin WhatsApp status
app.get('/status', (req, res) => {
    res.json({
        connected: adminConnected,
        qr_code: adminQR,
        countdown: qrCountdown,
        phone_number: adminSocket?.user?.id?.split(':')[0] || null
    });
});

// Connect admin WhatsApp
app.post('/connect', async (req, res) => {
    if (adminConnected) {
        return res.json({ success: true, message: 'Already connected' });
    }

    if (!adminSocket) {
        await connectAdminWhatsApp();
    }

    res.json({ success: true, message: 'Connection initiated' });
});

// Disconnect admin WhatsApp
app.post('/disconnect', async (req, res) => {
    try {
        if (adminSocket) {
            await adminSocket.logout();
            adminSocket = null;
        }
        adminConnected = false;
        adminQR = null;
        stopQRTimer();
        console.log('✅ Admin WhatsApp disconnected');
        res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reconnect (manual)
app.post('/reconnect', async (req, res) => {
    try {
        if (adminSocket) {
            await adminSocket.logout();
            adminSocket = null;
        }
        adminConnected = false;
        adminQR = null;
        stopQRTimer();

        await new Promise(resolve => setTimeout(resolve, 2000));
        await connectAdminWhatsApp();

        res.json({ success: true, message: 'Reconnecting...' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send message
app.post('/send', async (req, res) => {
    try {
        if (!adminConnected || !adminSocket) {
            return res.status(400).json({ error: 'Admin WhatsApp not connected' });
        }

        const { number, message } = req.body;
        if (!number || !message) {
            return res.status(400).json({ error: 'Missing number or message' });
        }

        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        await adminSocket.sendMessage(jid, { text: message });

        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'admin-whatsapp',
        port: PORT,
        connected: adminConnected
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Admin WhatsApp Service running on http://localhost:${PORT}`);
    console.log('📊 Endpoints:');
    console.log('   GET  /status      - Get connection status');
    console.log('   POST /connect     - Connect admin WhatsApp');
    console.log('   POST /disconnect  - Disconnect admin WhatsApp');
    console.log('   POST /reconnect   - Manual reconnect');
    console.log('   POST /send        - Send message');
    console.log('');
    console.log('🔐 This service is SEPARATE from user sessions');
});
