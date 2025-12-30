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

const app = express();
app.use(express.json());

const PORT = 3001;
const logger = pino({ level: 'silent' });

// Admin session storage
const sessions = new Map();
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

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

        const { state, saveCreds } = await useMultiFileAuthState('./admin-wa-auth');
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
                    const fs = await import('fs');
                    try {
                        fs.default.rmSync('./admin-wa-auth', { recursive: true, force: true });
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

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const sessionId = Math.random().toString(36).substring(7);
        sessions.set(sessionId, { username, loginTime: Date.now() });
        res.json({ success: true, sessionId });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/admin/logout', (req, res) => {
    const { sessionId } = req.body;
    sessions.delete(sessionId);
    res.json({ success: true });
});

app.get('/admin/check-session', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    res.json({ valid: sessionId && sessions.has(sessionId) });
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

        // await adminSocket.sendMessage(jid, { text: message }); // Removed duplicate

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
                            <h2>👥 Active Processing Sessions</h2>
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
                            
                            // Show active scanners or those with PIDs
                            // Check for PID existence to determine logic "Active"
                            const activeUsers = data.users.filter(u => u.is_active_scanner || u.pid);
                            
                            if (activeUsers.length === 0) {
                                userList.innerHTML = '<div class="no-users">No active sessions running</div>';
                                return;
                            }
                            
                            userList.innerHTML = activeUsers.map(user => {
                                const hasPid = user.pid && user.pid !== 'N/A';
                                const statusClass = hasPid ? 'status-connected' : 'status-error';
                                const statusText = hasPid ? 'Process Running' : 'Process Missing';
                                const statusIcon = hasPid ? '✅' : '⚠️';
                                
                                return \`
                                    <div class="user-card">
                                        <div class="user-info">
                                            <div class="user-name">\${user.username || 'Unknown'}</div>
                                            <div class="user-phone">
                                                <span>📞 \${user.phone_number}</span>
                                            </div>
                                            <div class="user-pid">PID: \${user.pid || 'N/A'}</div>
                                        </div>
                                        <div class="status-group">
                                            <div class="status-badge \${statusClass}">
                                                \${statusIcon} \${statusText}
                                            </div>
                                            \${hasPid ? \`<button class="btn btn-danger btn-small" style="font-size:12px; padding:4px 8px;" onclick="disconnectUser(\${user.id})">Disconnect</button>\` : ''}
                                        </div>
                                    </div>
                                \`;
                            }).join('');
                        } catch (e) {
                            console.error('Failed to load users:', e);
                            document.getElementById('userList').innerHTML = '<div class="no-users">Failed to load users</div>';
                        }
                    }
                </script>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`✅ Admin Dashboard running on http://localhost:${PORT}`);
    console.log(`🔐 Login: admin / admin123`);
    console.log('');
    console.log('📱 Admin WhatsApp integrated in dashboard');
    console.log('👥 View active users');
    console.log('📤 Send OTPs to new users');
});
