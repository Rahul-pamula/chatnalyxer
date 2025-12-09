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
            "--disable-gpu",
            "--disable-features=site-per-process",
            "--disable-web-security",
            "--no-first-run",
            "--no-default-browser-check"
        ],
    },
});

client.on("qr", (qr) => {
    currentQR = qr;
    console.log("QR Code received. Scan with WhatsApp:");
    qrcodeTerminal.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("✅ WhatsApp OTP service is ready!");
    isClientReady = true;
    whatsappClient = client;
    currentQR = null;
});

client.on("disconnected", () => {
    console.log("❌ WhatsApp client disconnected");
    isClientReady = false;
    currentQR = null;
});

// Initialize client
client.initialize();

// Routes
app.get('/', async (req, res) => {
    try {
        if (isClientReady) {
            return res.send(`
                <html>
                    <head><title>WhatsApp Status</title><meta http-equiv="refresh" content="2"></head>
                    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1 style="color: green;">✅ WhatsApp Connected!</h1>
                        <p>The OTP service is ready to send messages.</p>
                        <p><small>Last updated: ${new Date().toLocaleTimeString()}</small></p>
                    </body>
                </html>
            `);
        }

        if (currentQR) {
            const qrImage = await QRCode.toDataURL(currentQR);
            return res.send(`
                <html>
                    <head><title>Scan QR Code</title><meta http-equiv="refresh" content="3"></head>
                    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>Scan this QR Code</h1>
                        <img src="${qrImage}" style="width: 300px; height: 300px;" />
                        <p>Open WhatsApp > Linked Devices > Link a Device</p>
                        <p style="color: #666;">Code updates automatically.</p>
                    </body>
                </html>
            `);
        }

        return res.send(`
            <html>
                <head><title>Initializing...</title><meta http-equiv="refresh" content="3"></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5;">
                    <h1>⏳ Initializing WhatsApp...</h1>
                    <div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <p><strong>Status:</strong> Waiting for QR Code...</p>
                        <p>If this is the first time running, it may be <strong>downloading Chromium</strong> (150MB+).</p>
                        <p>This can take <strong>1-3 minutes</strong> depending on your internet.</p>
                        <hr/>
                        <p><small>Checking status again in 3 seconds...</small></p>
                        <p><small>Last check: ${new Date().toLocaleTimeString()}</small></p>
                    </div>
                    <p style="margin-top: 20px;">Check your Terminal window for download progress bars.</p>
                </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send("Error generating page: " + e.message);
    }
});


// Health check endpoint
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
