import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Global state
let sock;
let isClientReady = false;
let currentQR = null;

// Auth state folder
const AUTH_FOLDER = '/opt/render/.wwebjs-sessions-otp/baileys_auth_info';

// Ensure auth folder exists
if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }), // Suppress detailed logs to save I/O
        browser: ['Chatnalyxer', 'Chrome', '1.0.0'],
        syncFullHistory: false, // Critical for memory saving!
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            currentQR = qr;
            console.log("📸 QR Code received!");
            isClientReady = false;
        }

        if (connection === 'close') {
            isClientReady = false;
            currentQR = null;
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                // Reconnect with delay to prevent loops
                setTimeout(connectToWhatsApp, 2000);
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Connected!');
            isClientReady = true;
            currentQR = null;
        }
    });
}

// Start connection
connectToWhatsApp();

// --- API ROUTES (Compatible with previous version) ---

// 1. UI for QR Code (SPA)
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WhatsApp OTP Service</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: system-ui, sans-serif; text-align: center; padding: 20px; background: #f0f2f5; }
                    .container { background: white; padding: 30px; border-radius: 12px; max-width: 500px; margin: 40px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    img { max-width: 100%; border-radius: 8px; margin: 20px 0; }
                    .success { color: #008000; font-weight: bold; font-size: 1.5em; }
                    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>WhatsApp OTP Service</h1>
                    <div id="content">
                        <div class="spinner"></div>
                        <p>Connecting...</p>
                    </div>
                </div>
                <script>
                    const contentDiv = document.getElementById('content');
                    let lastQR = '';

                    async function checkStatus() {
                        try {
                            const res = await fetch('/status-json');
                            const data = await res.json();

                            if (data.ready) {
                                contentDiv.innerHTML = \`
                                    <div class="success">✅ WhatsApp Connected!</div>
                                    <p>Service is ready (Lightweight Engine).</p>
                                \`;
                            } else if (data.qr) {
                                if (data.qr !== lastQR) {
                                    lastQR = data.qr;
                                    contentDiv.innerHTML = \`
                                        <h3>Scan to Connect</h3>
                                        <img src="\${data.qr}" />
                                        <p>Open WhatsApp > Linked Devices > Link a Device</p>
                                    \`;
                                }
                            } else {
                                contentDiv.innerHTML = '<div class="spinner"></div><p>Waiting for QR...</p>';
                            }
                        } catch (e) { console.error(e); }
                    }
                    setInterval(checkStatus, 2000);
                    checkStatus();
                </script>
            </body>
        </html>
    `);
});

app.get('/status-json', async (req, res) => {
    try {
        const response = { ready: isClientReady, qr: null };
        if (!isClientReady && currentQR) {
            response.qr = await QRCode.toDataURL(currentQR);
        }
        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: isClientReady ? 'ready' : 'not_ready',
        message: isClientReady ? 'WhatsApp service is ready' : 'WhatsApp service is initializing'
    });
});

app.post('/send-otp', async (req, res) => {
    try {
        const { phone_number, message } = req.body;
        if (!phone_number || !message) return res.status(400).json({ error: 'Missing fields' });
        if (!isClientReady) return res.status(503).json({ error: 'Service not ready' });

        // Format phone (Baileys requires proper JID)
        let jid = phone_number.replace(/\D/g, '');
        if (!jid.endsWith('@s.whatsapp.net')) jid += '@s.whatsapp.net';

        await sock.sendMessage(jid, { text: message });

        console.log(`✅ OTP sent to ${jid}`);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// Legacy route support
app.post('/send-message', async (req, res) => {
    // Redirect logic to send-otp since they are identical here
    req.url = '/send-otp';
    app._router.handle(req, res);
});

app.listen(PORT, () => {
    console.log(`🚀 Lightweight WhatsApp (Baileys) running on port ${PORT}`);
});
