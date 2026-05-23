/**
 * Admin WhatsApp Service using whatsapp-web.js
 * Separate from user sessions (which use Baileys)
 * Features: QR code, 60-second countdown, manual reconnect
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import { EventEmitter } from 'events';

class AdminWhatsAppService extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.qrCode = null;
        this.isReady = false;
        this.isConnecting = false;
        this.qrExpiry = null;
        this.qrTimer = null;
        this.countdown = 60;
    }

    async initialize() {
        console.log('📱 Initializing Admin WhatsApp Client (whatsapp-web.js)...');

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'admin-whatsapp',
                dataPath: './admin-wa-session'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventHandlers();

        try {
            this.isConnecting = true;
            await this.client.initialize();
        } catch (error) {
            console.error('❌ Failed to initialize admin WhatsApp:', error);
            this.isConnecting = false;
            throw error;
        }
    }

    setupEventHandlers() {
        // QR Code event
        this.client.on('qr', async (qr) => {
            console.log('📷 Admin QR Code received');
            try {
                // Generate QR code as data URL
                this.qrCode = await qrcode.toDataURL(qr);
                this.startQRTimer();
                this.emit('qr', this.qrCode);
            } catch (error) {
                console.error('❌ Failed to generate QR code:', error);
            }
        });

        // Ready event
        this.client.on('ready', () => {
            console.log('✅ Admin WhatsApp is ready!');
            this.isReady = true;
            this.isConnecting = false;
            this.qrCode = null;
            this.stopQRTimer();
            this.emit('ready');
        });

        // Authenticated event
        this.client.on('authenticated', () => {
            console.log('🔐 Admin WhatsApp authenticated');
            this.emit('authenticated');
        });

        // Auth failure event
        this.client.on('auth_failure', (msg) => {
            console.error('❌ Admin WhatsApp authentication failed:', msg);
            this.isConnecting = false;
            this.emit('auth_failure', msg);
        });

        // Disconnected event
        this.client.on('disconnected', (reason) => {
            console.log('⚠️ Admin WhatsApp disconnected:', reason);
            this.isReady = false;
            this.isConnecting = false;
            this.qrCode = null;
            this.stopQRTimer();
            this.emit('disconnected', reason);
        });

        // Loading screen event
        this.client.on('loading_screen', (percent, message) => {
            console.log(`📊 Loading: ${percent}% - ${message}`);
        });
    }

    startQRTimer() {
        this.stopQRTimer();
        this.countdown = 60;
        this.qrExpiry = Date.now() + 60000; // 60 seconds from now

        this.qrTimer = setInterval(() => {
            this.countdown--;
            this.emit('countdown', this.countdown);

            if (this.countdown <= 0) {
                console.log('⏰ QR Code expired');
                this.qrCode = null;
                this.stopQRTimer();
                this.emit('qr_expired');
            }
        }, 1000);
    }

    stopQRTimer() {
        if (this.qrTimer) {
            clearInterval(this.qrTimer);
            this.qrTimer = null;
        }
        this.qrExpiry = null;
    }

    async connect() {
        if (this.isReady) {
            return { success: true, message: 'Already connected' };
        }

        if (this.isConnecting) {
            return { success: true, message: 'Connection in progress' };
        }

        try {
            await this.initialize();
            return { success: true, message: 'Connection started' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async disconnect() {
        if (this.client) {
            try {
                this.stopQRTimer();
                await this.client.destroy();
                this.client = null;
                this.isReady = false;
                this.isConnecting = false;
                this.qrCode = null;
                console.log('✅ Admin WhatsApp disconnected');
                return { success: true, message: 'Disconnected successfully' };
            } catch (error) {
                console.error('❌ Failed to disconnect:', error);
                return { success: false, error: error.message };
            }
        }
        return { success: true, message: 'Already disconnected' };
    }

    async reconnect() {
        console.log('🔄 Reconnecting admin WhatsApp...');
        await this.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.connect();
    }

    getStatus() {
        return {
            ready: this.isReady,
            connecting: this.isConnecting,
            qr_code: this.qrCode,
            countdown: this.countdown,
            qr_expiry: this.qrExpiry
        };
    }

    async sendMessage(number, message) {
        if (!this.isReady) {
            throw new Error('WhatsApp not ready');
        }

        try {
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
            await this.client.sendMessage(chatId, message);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }

    getInfo() {
        if (!this.isReady || !this.client) {
            return null;
        }
        return this.client.info;
    }
}

// Singleton instance
const adminWhatsApp = new AdminWhatsAppService();

export default adminWhatsApp;
