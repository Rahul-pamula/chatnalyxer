import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
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

// Connection Logic
async function connectToWhatsApp(autoRetry = false) {
    // If already ready, don't reconnect
    if (isClientReady && sock?.ws?.isOpen) return;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Chatnalyxer', 'Chrome', '120.0.6099.199'],
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            retryRequestDelayMs: 5000,
            qrMaxRetries: 5 // Stop generating QRs after 5 tries
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentQR = qr;
                isClientReady = false;
                console.log("📸 New QR Code generated");
            }

            if (connection === 'close') {
                isClientReady = false;
                currentQR = null;

                const error = lastDisconnect?.error;
                const statusCode = (error instanceof Boom) ? error.output.statusCode : undefined;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 405;

                console.log(`❌ Connection closed. Status: ${statusCode}.`);

                // Only auto-reconnect if it was a network glitch, NOT a logout/timeout
                if (shouldReconnect && autoRetry) {
                    setTimeout(() => connectToWhatsApp(true), 3000);
                } else if (statusCode === 408) {
                    console.log("⚠️ QR Timeout. Waiting for user to press 'Connect'.");
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp Connected!');
                isClientReady = true;
                currentQR = null;
            }
        });
    } catch (err) {
        console.error("Setup error:", err);
    }
}

// Start immediately? No, wait for user or persisted session?
// Try to connect once on boot. If session exists, it will connect. If not, it will generate QR.
connectToWhatsApp(true);

// --- API ROUTES ---

app.post('/connect', (req, res) => {
    console.log("📢 User requested manual connection");
    connectToWhatsApp(true);
    res.json({ message: 'Connection started' });
});

app.post('/disconnect', async (req, res) => {
    console.log("🛑 User requested disconnect");
    try {
        await sock?.logout();
        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        isClientReady = false;
        currentQR = null;
        res.json({ message: 'Disconnected and session cleared' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// UI Route
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WhatsApp Manager</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: system-ui, sans-serif; text-align: center; padding: 20px; background: #f0f2f5; }
                    .container { background: white; padding: 30px; border-radius: 12px; max-width: 500px; margin: 40px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    img { max-width: 100%; border-radius: 8px; margin: 20px 0; }
                    .btn { padding: 10px 20px; border-radius: 5px; border: none; font-size: 16px; cursor: pointer; margin: 5px; }
                    .btn-primary { background: #008069; color: white; }
                    .btn-danger { background: #dc3545; color: white; }
                    .status-box { padding: 15px; background: #e9ecef; border-radius: 8px; margin-bottom: 20px; }
                    .green { color: #008000; font-weight: bold; }
                    .red { color: #dc3545; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>WhatsApp Manager</h1>
                    
                    <div id="status-area" class="status-box">
                        <p>Status: <span id="status-text">Checking...</span></p>
                    </div>

                    <div id="actions">
                        <button onclick="triggerConnect()" class="btn btn-primary">Link WhatsApp / Refresh QR</button>
                        <button onclick="triggerDisconnect()" class="btn btn-danger">Disconnect & Reset</button>
                    </div>

                    <div id="qr-area" style="display:none;">
                        <h3>Scan Code</h3>
                        <img id="qr-img" src="" />
                        <p>Open WhatsApp > Linked Devices > Link a Device</p>
                    </div>
                </div>

                <script>
                    const statusText = document.getElementById('status-text');
                    const qrArea = document.getElementById('qr-area');
                    const qrImg = document.getElementById('qr-img');
                    let lastQR = '';

                    async function checkStatus() {
                        try {
                            const res = await fetch('/status-json');
                            const data = await res.json();

                            if (data.ready) {
                                statusText.innerHTML = '<span class="green">✅ Connected</span>';
                                qrArea.style.display = 'none';
                            } else if (data.qr) {
                                statusText.innerHTML = '<span class="red">⚠️ Not Connected (Waiting for Scan)</span>';
                                if (data.qr !== lastQR) {
                                    lastQR = data.qr;
                                    qrImg.src = data.qr;
                                    qrArea.style.display = 'block';
                                }
                            } else {
                                statusText.innerHTML = '<span>⚪ Disconnected / Idle</span>';
                                qrArea.style.display = 'none';
                            }
                        } catch (e) {
                            statusText.innerText = 'Error connecting to server';
                        }
                    }

                    async function triggerConnect() {
                        statusText.innerText = 'Starting connection...';
                        await fetch('/connect', { method: 'POST' });
                        checkStatus();
                    }

                    async function triggerDisconnect() {
                        if(!confirm('Are you sure? This will wipe the session.')) return;
                        statusText.innerText = 'Disconnecting...';
                        await fetch('/disconnect', { method: 'POST' });
                        checkStatus();
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
