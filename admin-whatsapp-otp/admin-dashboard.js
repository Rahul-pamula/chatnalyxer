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
            browser: ['Chatnalyxer Admin', 'Chrome', '1.0.0']
        });

        adminSocket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📷 Admin QR Code generated');
                adminQR = await QRCode.toDataURL(qr);
                startQRTimer();
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                    : true;

                console.log('⚠️ Admin WhatsApp disconnected');
                adminConnected = false;
                adminQR = null;
                if (qrTimer) clearInterval(qrTimer);

                if (shouldReconnect) {
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

        console.log(`📤 OTP sent to ${phone_number}`);
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

        console.log(`📤 OTP sent to ${phone_number}`);
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
                        background: #f5f7fa;
                    }
                    .login-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .login-box {
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        width: 100%;
                        max-width: 400px;
                    }
                    .login-box h1 { text-align: center; margin-bottom: 30px; color: #333; }
                    .form-group { margin-bottom: 20px; }
                    .form-group label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; }
                    .form-group input {
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        font-size: 16px;
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
                    }
                    .btn:hover { transform: translateY(-2px); }
                    .btn-small { width: auto; padding: 8px 16px; font-size: 14px; }
                    .btn-success { background: #4caf50; }
                    .btn-danger { background: #f44336; }

                    .dashboard { display: none; padding: 40px; max-width: 1200px; margin: 0 auto; }
                    .header {
                        background: white;
                        padding: 24px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
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
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        text-align: center;
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
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        margin-bottom: 24px;
                    }
                    .section h2 { margin-bottom: 16px; color: #333; }
                    .qr-container { text-align: center; padding: 20px; }
                    .qr-container img { max-width: 300px; margin: 16px auto; }
                    .user-list { display: flex; flex-direction: column; gap: 12px; }
                    .user-card {
                        background: #f8f9fa;
                        padding: 16px;
                        border-radius: 8px;
                        border: 2px solid #e0e0e0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .user-info { flex: 1; }
                    .user-name { font-weight: 700; font-size: 16px; color: #333; margin-bottom: 4px; }
                    .user-phone { color: #666; font-size: 14px; margin-bottom: 4px; }
                    .user-status { font-size: 12px; color: #4caf50; font-weight: 600; }
                    .status-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                        background: #4caf50;
                        color: white;
                    }
                    .no-users {
                        text-align: center;
                        color: #999;
                        padding: 40px;
                        font-size: 16px;
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
                                <input type="text" id="username" required>
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input type="password" id="password" required>
                            </div>
                            <button type="submit" class="btn">Login</button>
                        </form>
                    </div>
                </div>

                <div id="dashboard" class="dashboard">
                    <div class="header">
                        <h1>📊 Admin Dashboard</h1>
                        <button class="btn btn-danger btn-small" onclick="logout()">Logout</button>
                    </div>

                    <!-- Summary Stats -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number" id="totalUsers">0</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="activeSessions">0</div>
                            <div class="stat-label">Active Sessions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number" id="totalMessages">0</div>
                            <div class="stat-label">Total Messages</div>
                        </div>
                    </div>

                    <!-- Admin WhatsApp -->
                    <div class="section">
                        <h2>📱 Admin WhatsApp</h2>
                        <div id="adminWhatsApp"></div>
                    </div>

                    <!-- Active Users -->
                    <div class="section">
                        <h2>👥 Active Users</h2>
                        <div id="userList"></div>
                    </div>
                </div>

                <script>
                    let sessionId = localStorage.getItem('adminSessionId');
                    let refreshInterval;
                    let qrCountdown = 60;
                    let qrTimer = null;

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
                                refreshInterval = setInterval(loadDashboard, 5000);
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
                                refreshInterval = setInterval(loadDashboard, 5000);
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
                                section.innerHTML = '<div style="text-align:center;"><div style="font-size:18px;color:#4caf50;margin-bottom:12px;">✅ Connected</div><div style="color:#666;margin-bottom:16px;">Phone: +' + (data.phone_number || 'N/A') + '</div><button class="btn btn-danger btn-small" onclick="disconnectWhatsApp()">Disconnect</button></div>';
                            } else if (data.qr_code && data.countdown > 0) {
                                // QR code is valid - show it with countdown
                                if (!qrTimer) {
                                    qrTimer = setInterval(() => { 
                                        qrCountdown--; 
                                        if (qrCountdown <= 0) {
                                            clearInterval(qrTimer);
                                            qrTimer = null;
                                            loadAdminWhatsApp(); // Refresh to show expired state
                                        }
                                    }, 1000);
                                }
                                qrCountdown = data.countdown;
                                section.innerHTML = '<div class="qr-container"><p>Scan with WhatsApp:</p><img src="' + data.qr_code + '" alt="QR Code"/><div style="font-size:18px;font-weight:700;color:' + (qrCountdown <= 10 ? '#f44336' : '#667eea') + ';margin-top:16px;">⏱️ ' + qrCountdown + 's</div></div>';
                            } else if (data.qr_code && data.countdown <= 0) {
                                // QR code expired - show reconnect button
                                if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
                                section.innerHTML = '<div style="text-align:center;"><div style="font-size:18px;color:#f44336;margin-bottom:12px;">⏰ QR Code Expired</div><p style="color:#666;margin-bottom:16px;">The QR code has expired after 60 seconds</p><button class="btn btn-success btn-small" onclick="reconnectWhatsApp()">Generate New QR</button></div>';
                            } else {
                                // Not connected, no QR - show connect button
                                if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
                                section.innerHTML = '<div style="text-align:center;"><button class="btn btn-success btn-small" onclick="connectWhatsApp()">Connect WhatsApp</button></div>';
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    async function connectWhatsApp() {
                        await fetch('/admin/whatsapp/connect', { method: 'POST' });
                        setTimeout(loadAdminWhatsApp, 1000);
                    }

                    async function disconnectWhatsApp() {
                        if (!confirm('Disconnect?')) return;
                        await fetch('/admin/whatsapp/disconnect', { method: 'POST' });
                        loadAdminWhatsApp();
                    }

                    async function reconnectWhatsApp() {
                        await fetch('/admin/whatsapp/reconnect', { method: 'POST' });
                        setTimeout(loadAdminWhatsApp, 2000);
                    }

                    async function loadUsers() {
                        try {
                            const res = await fetch('/admin/users');
                            const data = await res.json();
                            
                            // Update stats
                            document.getElementById('totalUsers').textContent = data.stats?.total_users || 0;
                            document.getElementById('activeSessions').textContent = data.stats?.active_sessions || 0;
                            
                            // Fetch total messages from backend health endpoint
                            try {
                                const healthRes = await fetch('http://localhost:8000/admin/health');
                                const healthData = await healthRes.json();
                                document.getElementById('totalMessages').textContent = healthData.database?.total_messages || 0;
                            } catch (e) {
                                document.getElementById('totalMessages').textContent = '0';
                            }
                            
                            const userList = document.getElementById('userList');
                            
                            if (!data.users || data.users.length === 0) {
                                userList.innerHTML = '<div class="no-users">No active users</div>';
                                return;
                            }
                            
                            // Filter only active users
                            const activeUsers = data.users.filter(u => u.is_active_scanner);
                            
                            if (activeUsers.length === 0) {
                                userList.innerHTML = '<div class="no-users">No active users</div>';
                                return;
                            }
                            
                            userList.innerHTML = activeUsers.map(user => {
                                return '<div class="user-card"><div class="user-info"><div class="user-name">' + user.username + '</div><div class="user-phone">📞 ' + user.phone_number + '</div><div class="user-status">PID: ' + (user.pid || 'N/A') + '</div></div><div class="status-badge">✅ ' + (user.status_message || 'Connected') + '</div></div>';
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
