import express from 'express';
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import os from "node:os";
import path from "node:path";

import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Handle unhandled rejections to catch ProtocolErrors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (reason && reason.message && reason.message.includes("Execution context was destroyed")) {
        console.log("🔄 OTP Service: Execution context destroyed - ignoring to keep service alive.");
    }
});

// Global state
let whatsappClient = null;
let isClientReady = false;
let currentQR = null;

// Tweak for Mac: Use system Chrome (ARM64 Native)
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fs = await import('fs');

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "chatnalyxer-otp-service",
        dataPath: path.join(os.homedir(), `.wwebjs-sessions-otp`),
    }),
    puppeteer: {
        executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
        headless: true, // Run INVISIBLE (Headless)
        ignoreHTTPSErrors: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-component-extensions-with-background-pages",
            "--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints",
            "--disable-ipc-flooding-protection",
            "--disable-renderer-backgrounding",
            "--enable-features=NetworkService,NetworkServiceInProcess"
        ],
        "--disable-renderer-backgrounding",
        "--enable-features=NetworkService,NetworkServiceInProcess"
        ],
    },
webVersion: '2.2403.2', // Pin version for stability
    webVersionCache: { type: 'none' }, // Disable caching to free init memory
});

// Mock request interception to save memory (Block images/css)
// Note: whatsapp-web.js requires Puppeteer to handle this manually if needed, 
// but passing args is cleaner. Above args block some, but manual interception is best.
// However, LocalAuth manages the page. We can't easily intercept without hacking.
// We rely on the flags above.

client.on("qr", (qr) => {
    currentQR = qr;
    console.log("QR Code received. Scan with WhatsApp:");
    qrcodeTerminal.generate(qr, { small: true });
});

// Resource blocking to save memory
client.on('ready', () => {
    console.log("✅ WhatsApp OTP service is ready!");
    isClientReady = true;
    whatsappClient = client;
    currentQR = null;
});

client.on('authenticated', () => {
    console.log("🔐 Authenticated successfully! Waiting for sync...");
});

client.on('auth_failure', (msg) => {
    console.error("❌ Authentication failure:", msg);
});

client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading: ${percent}% - ${message}`);
});

client.on('change_state', (state) => {
    console.log("🔄 Connection state changed:", state);
});

client.on("disconnected", (reason) => {
    console.log("❌ WhatsApp client disconnected:", reason);
    isClientReady = false;
    currentQR = null;
});

// Initialize client
client.initialize();

// Routes
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WhatsApp OTP Service</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 20px; background: #f0f2f5; }
                    .container { background: white; padding: 30px; border-radius: 12px; max-width: 500px; margin: 40px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    img { max-width: 100%; border-radius: 8px; margin: 20px 0; }
                    .status { margin: 15px 0; color: #666; }
                    .success { color: #008000; font-weight: bold; font-size: 1.2em; }
                    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>WhatsApp OTP Service</h1>
                    <div id="content">
                        <div class="spinner"></div>
                        <p>Loading status...</p>
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
                                    <p>The service is ready to send OTPs.</p>
                                    <p><small>\${new Date().toLocaleTimeString()}</small></p>
                                \`;
                            } else if (data.qr) {
                                if (data.qr !== lastQR) {
                                    lastQR = data.qr;
                                    contentDiv.innerHTML = \`
                                        <h3>Scan to Connect</h3>
                                        <img src="\${data.qr}" />
                                        <p class="status">Open WhatsApp > Linked Devices > Link a Device</p>
                                    \`;
                                }
                            } else {
                                contentDiv.innerHTML = \`
                                    <div class="spinner"></div>
                                    <p>Initializing WhatsApp...</p>
                                    <p class="status">Please wait, this may take a minute...</p>
                                \`;
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    // Poll every 2 seconds
                    setInterval(checkStatus, 2000);
                    checkStatus();
                </script>
            </body>
        </html>
    `);
});

// JSON Status endpoint for client polling
app.get('/status-json', async (req, res) => {
    try {
        const response = {
            ready: isClientReady,
            qr: null
        };

        if (!isClientReady && currentQR) {
            response.qr = await QRCode.toDataURL(currentQR);
        }

        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Health check endpoint (simple)
app.get('/health', (req, res) => {
    res.json({
        status: isClientReady ? 'ready' : 'not_ready',
        message: isClientReady ? 'WhatsApp service is ready' : 'WhatsApp service is initializing'
    });
});

// Send OTP endpoint
app.post('/send-otp', async (req, res) => {
    try {
        const { phone_number, message } = req.body;

        if (!phone_number || !message) {
            return res.status(400).json({ error: 'phone_number and message are required' });
        }

        if (!isClientReady) {
            return res.status(503).json({ error: 'WhatsApp service is not ready yet' });
        }

        // Send message
        await whatsappClient.sendMessage(phone_number, message);

        console.log(`✅ OTP sent to ${phone_number}`);
        res.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            error: 'Failed to send OTP',
            details: error.message
        });
    }
});

// Send general message endpoint
app.post('/send-message', async (req, res) => {
    try {
        const { phone_number, message } = req.body;

        if (!phone_number || !message) {
            return res.status(400).json({ error: 'phone_number and message are required' });
        }

        if (!isClientReady) {
            return res.status(503).json({ error: 'WhatsApp service is not ready yet' });
        }

        // Send message
        await whatsappClient.sendMessage(phone_number, message);

        console.log(`✅ Message sent to ${phone_number}`);
        res.json({ success: true, message: 'Message sent successfully' });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            error: 'Failed to send message',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 WhatsApp OTP service running on port ${PORT}`);
});
