/**
 * Admin Dashboard with Integrated WhatsApp
 * Port: 3001
 * Features: Admin WhatsApp, Active Users, Send OTP
 */

import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';

const app = express();
app.use(express.json());

const PORT = 3001;
const logger = pino({ level: 'silent' });

// Load environment variables (Backend .env has the DB URL)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load from sibling backend directory first
dotenv.config({ path: path.resolve(__dirname, '../chatnalyxer-backend/.env') });
// Also try local .env for overrides
dotenv.config();

// Fix for Render/Heroku protocols (postgres:// -> postgresql://)
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres://")) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace("postgres://", "postgresql://", 1);
}

// Database Connection
const { Pool } = await import('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chatnalyxer'
});

// Admin session storage (DB-based)
// const sessions = new Map(); // REMOVED
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Ensure table exists
await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        login_time BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

// Custom Auth Adapter Import
const { usePostgresAuthState } = await import('./auth-adapter.js');

// Admin WhatsApp state
let adminSocket = null;
let adminQR = null;
let adminConnected = false;
let qrCountdown = 60;
let qrTimer = null;

console.log('🚀 Starting Admin Dashboard with WhatsApp');

// ============================================
// ADMIN WHATSAPP FUNCTIONS
// ============================================

function startQRTimer() {
    if (qrTimer) clearInterval(qrTimer);
    qrCountdown = 60;
    qrTimer = setInterval(() => {
        qrCountdown--;
        if (qrCountdown <= 0) {
            adminQR = null;
            clearInterval(qrTimer);
            qrTimer = null;
        }
    }, 1000);
}

async function connectAdminWhatsApp() {
    try {
        console.log('📱 Connecting Admin WhatsApp...');

        // Use PostgreSQL Auth
        // const { state, saveCreds } = await useMultiFileAuthState('./admin-wa-auth');
        const { state, saveCreds } = await usePostgresAuthState(pool, 'admin_wa_session');
        const { version } = await fetchLatestBaileysVersion();

        adminSocket = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: state,
            browser: ['Chatnalyxer Admin', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            retryRequestDelayMs: 5000,
            keepAliveIntervalMs: 10000,
        });

        adminSocket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📷 Admin QR Code generated');
                adminQR = await QRCode.toDataURL(qr);
                startQRTimer();
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error.output.statusCode
                    : undefined;

                let shouldReconnect = (statusCode !== DisconnectReason.loggedOut);

                console.log('⚠️ Admin WhatsApp disconnected');
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    console.log('🛑 Session invalid/logged out. Clearing auth and retrying...');
                    try {
                        fs.rmSync('./admin-wa-auth', { recursive: true, force: true });
                        console.log('🧹 Auth folder cleared.');
                        shouldReconnect = true; // Force reconnect to generate new QR
                    } catch (e) {
                        console.error('Failed to clear auth:', e);
                    }
                }

                adminConnected = false;
                adminQR = null;
                if (qrTimer) clearInterval(qrTimer);

                if (shouldReconnect) {
                    console.log('🔄 Attempting to reconnect in 3s...');
                    setTimeout(() => connectAdminWhatsApp(), 3000);
                }
            } else if (connection === 'open') {
                console.log('✅ Admin WhatsApp connected!');
                adminConnected = true;
                adminQR = null;
                if (qrTimer) clearInterval(qrTimer);
            }
        });

        adminSocket.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('❌ Failed to connect admin WhatsApp:', error);
    }
}

// ============================================
// ADMIN AUTHENTICATION
// ============================================

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const sessionId = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);
        // sessions.set(sessionId, { username, loginTime: Date.now() });
        try {
            await pool.query(
                'INSERT INTO admin_sessions (session_id, username, login_time) VALUES ($1, $2, $3)',
                [sessionId, username, Date.now()]
            );
            res.json({ success: true, sessionId });
        } catch (e) {
            res.status(500).json({ error: 'Database error' });
        }
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/admin/logout', async (req, res) => {
    const { sessionId } = req.body;
    // sessions.delete(sessionId);
    try {
        await pool.query('DELETE FROM admin_sessions WHERE session_id = $1', [sessionId]);
    } catch (e) { }
    res.json({ success: true });
});

app.get('/admin/check-session', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    let valid = false;
    if (sessionId) {
        try {
            const result = await pool.query('SELECT 1 FROM admin_sessions WHERE session_id = $1', [sessionId]);
            valid = result.rows.length > 0;
        } catch (e) { }
    }
    res.json({ valid });
});

// ============================================
// ADMIN WHATSAPP API
// ============================================

app.get('/admin/whatsapp/status', (req, res) => {
    res.json({
        connected: adminConnected,
        qr_code: adminQR,
        countdown: qrCountdown,
        phone_number: adminSocket?.user?.id?.split(':')[0] || null
    });
});

app.post('/admin/whatsapp/connect', async (req, res) => {
    if (adminConnected) {
        return res.json({ success: true, message: 'Already connected' });
    }
    if (!adminSocket) {
        await connectAdminWhatsApp();
    }
    res.json({ success: true, message: 'Connecting...' });
});

app.post('/admin/whatsapp/disconnect', async (req, res) => {
    try {
        if (adminSocket) {
            await adminSocket.logout();
            adminSocket = null;
        }

        // Clean up session files
        const authPath = './admin-wa-auth';
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('🧹 Auth folder cleared on manual disconnect.');
        }

        adminConnected = false;
        adminQR = null;
        if (qrTimer) clearInterval(qrTimer);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/admin/whatsapp/reconnect', async (req, res) => {
    try {
        if (adminSocket) {
            await adminSocket.logout();
            adminSocket = null;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        await connectAdminWhatsApp();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send OTP
app.post('/admin/send-otp', async (req, res) => {
    try {
        if (!adminConnected || !adminSocket) {
            return res.status(400).json({ error: 'Admin WhatsApp not connected' });
        }

        const { phone_number, message } = req.body;
        if (!phone_number || !message) {
            return res.status(400).json({ error: 'Missing phone_number or message' });
        }

        const jid = phone_number.includes('@') ? phone_number : `${phone_number}@s.whatsapp.net`;
        await adminSocket.sendMessage(jid, { text: message });

        console.error('\n\n==================================================');
        console.error(`📤 OTP sent to ${phone_number}`);
        console.error(`📝 OTP Content: "${message}"`);
        console.error('==================================================\n\n');
        res.json({ success: true, message: 'OTP sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Alias for backward compatibility
app.post('/send-otp', async (req, res) => {
    try {
        if (!adminConnected || !adminSocket) {
            return res.status(400).json({ error: 'Admin WhatsApp not connected' });
        }

        const { phone_number, message } = req.body;
        if (!phone_number || !message) {
            return res.status(400).json({ error: 'Missing phone_number or message' });
        }

        const jid = phone_number.includes('@') ? phone_number : `${phone_number}@s.whatsapp.net`;
        await adminSocket.sendMessage(jid, { text: message });

        console.error('\n\n==================================================');
        console.error(`📤 OTP sent to ${phone_number}`);
        console.error(`📝 OTP Content: "${message}"`);
        console.error('==================================================\n\n');
        res.json({ success: true, message: 'OTP sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ACTIVE USERS
// ============================================

app.get('/admin/users', async (req, res) => {
    try {
        const axios = (await import('axios')).default;
        const response = await axios.get('http://localhost:8000/admin/dashboard');
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ============================================
// USER MANAGEMENT API
// ============================================

app.post('/admin/users/:userId/disconnect', async (req, res) => {
    try {
        const { userId } = req.params;
        const axios = (await import('axios')).default;
        // Call session manager to stop session
        await axios.post(`http://localhost:3002/sessions/stop/${userId}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/admin/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const axios = (await import('axios')).default;
        // Call backend to delete user
        const response = await axios.delete(`http://localhost:8000/admin/users/${userId}`);
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// DASHBOARD UI
// ============================================

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Admin Dashboard</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: #f8f9fa; /* Light gray background for contrast */
                    }
                    .login-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: #ffffff; /* White background as requested */
                    }
                    .login-box {
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.08); /* Softer shadow */
                        width: 100%;
                        max-width: 400px;
                        border: 1px solid #eee;
                    }
                    .login-box h1 { text-align: center; margin-bottom: 30px; color: #333; }
                    .form-group { margin-bottom: 20px; }
                    .form-group label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
                    .form-group input {
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        font-size: 16px;
                        transition: border-color 0.2s;
                    }
                    .form-group input:focus { outline: none; border-color: #667eea; }
                    .btn {
                        width: 100%;
                        padding: 14px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        display: inline-flex;
                        justify-content: center;
                        align-items: center;
                        gap: 8px;
                    }
                    .btn:hover { transform: translateY(-1px); opacity: 0.95; }
                    .btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
                    
                    .btn-small { width: auto; padding: 8px 16px; font-size: 14px; }
                    .btn-success { background: #4caf50; }
                    .btn-danger { background: #f44336; }
                    .btn-outline { background: transparent; border: 1px solid #ccc; color: #555; }
                    .btn-outline:hover { background: #f5f5f5; }

                    .dashboard { display: none; padding: 40px; max-width: 1200px; margin: 0 auto; }
                    .header {
                        background: white;
                        padding: 24px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border: 1px solid #eaeaea;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 24px;
                    }
                    .stat-card {
                        background: white;
                        padding: 24px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        text-align: center;
                        border: 1px solid #eaeaea;
                    }
                    .stat-number {
                        font-size: 36px;
                        font-weight: 800;
                        color: #667eea;
                        margin-bottom: 8px;
                    }
                    .stat-label {
                        font-size: 14px;
                        color: #666;
                        font-weight: 600;
                    }
                    .section {
                        background: white;
                        padding: 24px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        margin-bottom: 24px;
                        border: 1px solid #eaeaea;
                    }
                    .section h2 { margin-bottom: 16px; color: #333; font-size: 18px; display: flex; align-items: center; gap: 8px; }
                    .qr-container { text-align: center; padding: 20px; }
                    
                    /* QR Scanning Animation */
                    .qr-wrapper {
                        position: relative;
                        display: inline-block;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    .qr-wrapper img {
                        display: block;
                        max-width: 250px;
                    }
                    .scan-line {
                        position: absolute;
                        width: 100%;
                        height: 3px;
                        background: #4caf50;
                        box-shadow: 0 0 4px #4caf50;
                        top: 0;
                        left: 0;
                        animation: scan 2.5s infinite linear;
                        opacity: 0.6;
                    }
                    @keyframes scan {
                        0% { top: 0; }
                        50% { top: 100%; }
                        100% { top: 0; }
                    }

                    .user-list { display: flex; flex-direction: column; gap: 12px; }
                    .user-card {
                        background: white;
                        padding: 16px;
                        border-radius: 8px;
                        border: 1px solid #eaeaea;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: transform 0.2s;
                    }
                    .user-card:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                    .user-info { flex: 1; }
                    .user-name { font-weight: 700; font-size: 16px; color: #333; margin-bottom: 4px; }
                    .user-phone { color: #666; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
                    .user-pid { font-family: monospace; font-size: 12px; color: #888; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; display: inline-block; }
                    
                    .status-group {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        gap: 8px;
                    }
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                    }
                    .status-connected { background: #e8f5e9; color: #2e7d32; }
                    .status-error { background: #ffebee; color: #c62828; }
                    
                    /* Loader */
                    .loader {
                        border: 3px solid #f3f3f3;
                        border-top: 3px solid #667eea;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

                    .no-users {
                        text-align: center;
                        color: #999;
                        padding: 40px;
                        font-size: 16px;
                        background: #fcfcfc;
                        border-radius: 8px;
                        border: 1px dashed #ddd;
                    }
                </style>
            </head>
            <body>
                <div id="loginScreen" class="login-container">
                    <div class="login-box">
                        <h1>🔐 Admin Login</h1>
                        <div id="error" style="display:none; background:#fee; color:#c33; padding:12px; border-radius:8px; margin-bottom:20px;"></div>
                        <form id="loginForm">
                            <div class="form-group">
                                <label>Username</label>
                                <input type="text" id="username" required placeholder="admin">
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input type="password" id="password" required placeholder="••••••••">
                            </div>
                            <button type="submit" class="btn">Login</button>
                        </form>
                    </div>
                </div>

                <div id="dashboard" class="dashboard">
                    <div class="header">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="font-size:24px;">📊</span>
                            <h1 style="font-size:24px;">Admin Dashboard</h1>
                        </div>
                        <button class="btn btn-danger btn-small" onclick="logout()">Logout</button>
                    </div>

                    <!-- Summary Stats -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number" id="totalUsers">-</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="activeSessions">-</div>
                            <div class="stat-label">Active Sessions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="totalMessages">-</div>
                            <div class="stat-label">Total Messages</div>
                        </div>
                    </div>

                    <!-- Admin WhatsApp -->
                    <div class="section">
                        <h2>📱 Admin WhatsApp Integration</h2>
                        <div id="adminWhatsApp"></div>
                    </div>

                    <!-- Active Users -->
                    <div class="section">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                            <h2>👥 Users & Sessions</h2>
                            <button class="btn btn-outline btn-small" onclick="loadUsers()">🔄 Refresh</button>
                        </div>
                        <div id="userList"></div>
                    </div>
                </div>

                <script>
                    let sessionId = localStorage.getItem('adminSessionId');
                    let refreshInterval;
                    let qrCountdown = 60;
                    let qrTimer = null;
                    let isConnecting = false;

                    if (sessionId) checkSession();

                    async function checkSession() {
                        try {
                            const res = await fetch('/admin/check-session', {
                                headers: { 'x-session-id': sessionId }
                            });
                            const data = await res.json();
                            if (data.valid) {
                                showDashboard();
                                loadDashboard();
                                refreshInterval = setInterval(loadDashboard, 10000); // Slower interval
                            } else {
                                showLogin();
                            }
                        } catch (e) {
                            showLogin();
                        }
                    }

                    document.getElementById('loginForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const username = document.getElementById('username').value;
                        const password = document.getElementById('password').value;

                        try {
                            const res = await fetch('/admin/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username, password })
                            });
                            const data = await res.json();

                            if (data.success) {
                                sessionId = data.sessionId;
                                localStorage.setItem('adminSessionId', sessionId);
                                showDashboard();
                                loadDashboard();
                                refreshInterval = setInterval(loadDashboard, 10000);
                            } else {
                                showError('Invalid credentials');
                            }
                        } catch (e) {
                            showError('Login failed');
                        }
                    });

                    async function logout() {
                        await fetch('/admin/logout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sessionId })
                        });
                        localStorage.removeItem('adminSessionId');
                        if (refreshInterval) clearInterval(refreshInterval);
                        showLogin();
                    }

                    function showDashboard() {
                        document.getElementById('loginScreen').style.display = 'none';
                        document.getElementById('dashboard').style.display = 'block';
                    }

                    function showLogin() {
                        document.getElementById('loginScreen').style.display = 'flex';
                        document.getElementById('dashboard').style.display = 'none';
                    }

                    function showError(msg) {
                        const error = document.getElementById('error');
                        error.textContent = msg;
                        error.style.display = 'block';
                        setTimeout(() => error.style.display = 'none', 3000);
                    }

                    async function loadDashboard() {
                        await loadAdminWhatsApp();
                        await loadUsers();
                    }

                    async function loadAdminWhatsApp() {
                        try {
                            const res = await fetch('/admin/whatsapp/status');
                            const data = await res.json();
                            const section = document.getElementById('adminWhatsApp');
                            
                            if (data.connected) {
                                if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
                                isConnecting = false;
                                section.innerHTML = \`
                                    <div style="text-align:center; padding: 20px;">
                                        <div style="font-size:18px; color:#4caf50; margin-bottom:12px; font-weight:600;">✅ System Connected</div>
                                        <div style="color:#666; margin-bottom:20px;">
                                            Phone: <strong>+\${data.phone_number || 'N/A'}</strong>
                                        </div>
                                        <button class="btn btn-danger btn-small" onclick="disconnectWhatsApp()">Disconnect & Reset</button>
                                    </div>\`;
                            } else if (data.qr_code && data.countdown > 0) {
                                // QR code is valid
                                isConnecting = false;
                                if (!qrTimer) {
                                    qrTimer = setInterval(() => { 
                                        qrCountdown--; 
                                        const display = document.getElementById('qr-countdown-display');
                                        if (display) display.textContent = '⏱️ Refreshing in ' + qrCountdown + 's';
                                        
                                        if (qrCountdown <= 0) {
                                            clearInterval(qrTimer);
                                            qrTimer = null;
                                            loadAdminWhatsApp();
                                        }
                                    }, 1000);
                                }
                                qrCountdown = data.countdown;
                                section.innerHTML = \`
                                    <div class="qr-container">
                                        <p style="margin-bottom:16px;">Scan this QR code with WhatsApp (Linked Devices)</p>
                                        <div class="qr-wrapper">
                                            <img src="\${data.qr_code}" alt="QR Code"/>
                                            <div class="scan-line"></div>
                                        </div>
                                        <div id="qr-countdown-display" style="font-size:16px; font-weight:600; color:\${qrCountdown <= 10 ? '#f44336' : '#667eea'}; margin-top:16px;">
                                            ⏱️ Refreshing in \${qrCountdown}s
                                        </div>
                                    </div>\`;
                            } else if (data.qr_code && data.countdown <= 0) {
                                // Expired
                                if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
                                section.innerHTML = \`
                                    <div style="text-align:center; padding: 20px;">
                                        <div style="font-size:16px; color:#f44336; margin-bottom:12px;">⏰ OR Code Expired</div>
                                        <button class="btn btn-success" onclick="reconnectWhatsApp()">Generate New QR Code</button>
                                    </div>\`;
                            } else {
                                // Not connected
                                if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
                                if (isConnecting) {
                                     section.innerHTML = \`
                                        <div style="text-align:center; padding: 40px;">
                                            <div class="loader" style="margin: 0 auto 16px;"></div>
                                            <div style="color:#666;">Requests connection...</div>
                                        </div>\`;
                                } else {
                                    section.innerHTML = \`
                                        <div style="text-align:center; padding: 20px;">
                                            <p style="color:#666; margin-bottom:16px;">Connect system WhatsApp to enable OTP sending</p>
                                            <button class="btn btn-success" onclick="connectWhatsApp()">Connect WhatsApp</button>
                                        </div>\`;
                                }
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    async function connectWhatsApp() {
                        isConnecting = true;
                        loadAdminWhatsApp(); // Show loader immediately
                        try {
                            const res = await fetch('/admin/whatsapp/connect', { method: 'POST' });
                            const data = await res.json();
                            if(!data.success) throw new Error(data.message);
                            setTimeout(loadAdminWhatsApp, 1500);
                        } catch (e) {
                            isConnecting = false;
                            alert('Failed to connect: ' + e.message);
                            loadAdminWhatsApp();
                        }
                    }

                    async function disconnectWhatsApp() {
                        if (!confirm('Are you sure you want to disconnect the admin WhatsApp?')) return;
                        await fetch('/admin/whatsapp/disconnect', { method: 'POST' });
                        loadAdminWhatsApp();
                    }

                    async function reconnectWhatsApp() {
                        isConnecting = true;
                        loadAdminWhatsApp();
                        await fetch('/admin/whatsapp/reconnect', { method: 'POST' });
                        setTimeout(loadAdminWhatsApp, 2000);
                    }

                    // User Management
                    async function disconnectUser(userId) {
                        if(!confirm(\`Disconnect and stop processing for User ID \${userId}?\`)) return;
                        try {
                            const res = await fetch(\`/admin/users/\${userId}/disconnect\`, { method: 'POST' });
                            const data = await res.json();
                            if (data.success) {
                                loadUsers(); // Refresh list
                            } else {
                                alert('Failed: ' + data.error);
                            }
                        } catch(e) {
                            alert('Error: ' + e.message);
                        }
                    }

                    async function loadUsers() {
                        try {
                            const res = await fetch('/admin/users');
                            const data = await res.json();
                            
                            if (data.stats) {
                                document.getElementById('totalUsers').textContent = data.stats.total_users;
                                document.getElementById('activeSessions').textContent = data.stats.active_sessions;
                            }
                            
                            // Try total messages
                            try {
                                const healthRes = await fetch('http://localhost:8000/admin/health');
                                const healthData = await healthRes.json();
                                document.getElementById('totalMessages').textContent = healthData.database?.total_messages || '-';
                            } catch (e) {}
                            
                            const userList = document.getElementById('userList');
                            
                            if (!data.users || data.users.length === 0) {
                                userList.innerHTML = '<div class="no-users">No users found</div>';
                                return;
                            }
                            
                            // Sort: Active first, then by ID
                            const sortedUsers = data.users.sort((a, b) => {
                                const aActive = a.pid || a.is_active_scanner;
                                const bActive = b.pid || b.is_active_scanner;
                                if (aActive === bActive) return a.user_id - b.user_id;
                                return bActive ? 1 : -1;
                            });
                            
                            userList.innerHTML = sortedUsers.map(user => {
                                const hasPid = user.pid && user.pid !== 'N/A';
                                const isActive = hasPid || user.is_active_scanner;
                                const statusClass = isActive ? 'status-connected' : 'status-error';
                                const statusText = isActive ? 'Process Running' : 'Offline';
                                const statusIcon = isActive ? '✅' : '⚫';
                                
                                return \`
                                    <div class="user-card">
                                        <div class="user-info">
                                            <div class="user-name">\${user.username || 'Unknown'} (ID: \${user.user_id})</div>
                                            <div class="user-phone">
                                                📞 \${user.phone_number || 'No Number'}
                                            </div>
                                            \${hasPid ? \`<div class="user-pid">PID: \${user.pid}</div>\` : ''}
                                        </div>
                                        <div class="status-group">
                                            <span class="status-badge \${statusClass}">
                                                \${statusIcon} \${statusText}
                                            </span>
                                            <div style="display:flex; gap:5px; margin-top:4px;">
                                                <!-- Action Buttons -->
                                                \${hasPid ? 
                                                    \`<button class="btn btn-danger btn-small" style="font-size:12px; padding:4px 8px;" onclick="disconnectUser(\${user.user_id})">Stop</button>\` 
                                                    : ''
                                                }
                                                <button class="btn btn-outline btn-small" style="border-color:#ff4444; color:#ff4444; font-size:12px; padding:4px 8px;" onclick="deleteUser(\${user.user_id})">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                \`;
                            }).join('');
                            
                        } catch (e) {
                            console.error('Failed to load users:', e);
                            document.getElementById('userList').innerHTML = '<div class="no-users">Error loading users</div>';
                        }
                    }

                    // NEW: Delete User Function
                    async function deleteUser(userId) {
                        if(!confirm(\`⚠️ WARNING: This will PERMANENTLY delete User \${userId} and ALL their messages/groups. This cannot be undone.\\n\\nAre you sure?\`)) return;
                        
                        try {
                            const res = await fetch(\`/admin/users/\${userId}\`, { method: 'DELETE' });
                            const data = await res.json();
                            
                            if (data.success) {
                                alert('✅ User deleted successfully');
                                loadUsers(); // Refresh list
                            } else {
                                alert('❌ Failed: ' + (data.error || data.detail || 'Unknown error'));
                            }
                        } catch(e) {
                            alert('❌ Error: ' + e.message);
                        }
                    }

                    // Start
                    loadAdminWhatsApp();
                </script>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`✅ Admin Dashboard running on http://localhost:${PORT}`);
    console.log(`🔐 Login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('📱 Admin WhatsApp integrated in dashboard');
    console.log('👥 View active users');
    console.log('📤 Send OTPs to new users');
});
