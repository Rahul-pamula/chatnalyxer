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

// Auth state folder - use local path for development, Render path for production
const AUTH_FOLDER = process.env.RENDER ? '/opt/render/.wwebjs-sessions-otp/baileys_auth_info' : './auth_info_baileys_admin';

// Ensure auth folder exists
if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

// Connection Logic
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
            browser: ['Chatnalyxer OTP', 'Chrome', '120.0.0.0'],
            connectTimeoutMs: 60000,
            qrMaxRetries: 2, // Retries 2 times (approx 40-60s active window)
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

                // logic:
                // 401: Logged out / Bad Session -> Clear & Retry logic handled?
                // 408: Timeout -> EXPIRE. Do not loop.
                // 428: Precondition Required -> Retry.
                // DisconnectReason.loggedOut -> Clear & exit.

                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    console.log("🚪 Logged out / Auth Invalid. Clearing session.");
                    try {
                        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    } catch (e) { }
                    // Do NOT auto-reconnect. Admin must click "Connect".
                    isExpired = true;
                    return;
                }

                // Handle 515 (Restart Required) specifically - allow retry
                if (statusCode === DisconnectReason.restartRequired) {
                    console.log("🔄 Restart Required (515). Reconnecting...");
                    setTimeout(() => connectToWhatsApp(false), 1000);
                    return;
                }

                // If QR timeout (often manifests as generic close or 408)
                // If we were NOT ready and connection closed, assume QR failed/timeout.
                if (!isClientReady) {
                    console.log("⚠️ Connection failed during QR phase. Marking as EXPIRED.");
                    isExpired = true;
                    return;
                    // STOP HERE. No auto retry.
                }

                // If we WERE ready (active connection lost), try to reconnect
                if (statusCode !== DisconnectReason.loggedOut) {
                    console.log("🔄 Active connection lost. Reconnecting...");
                    setTimeout(() => connectToWhatsApp(false), 2000);
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp Connected!');
                isClientReady = true;
                currentQR = null;
                isExpired = false;
            }
        });
    } catch (err) {
        console.error("Setup error:", err);
        isExpired = true;
    }
}

let isExpired = false;

// Initialize on start BUT do not loop effectively if it fails immediately?
// Actually for first run we generally want to try.
connectToWhatsApp(false);


// --- API ROUTES ---

app.post('/connect', (req, res) => {
    console.log("📢 User requested manual connection (Regenerate QR)");
    isExpired = false;
    currentQR = null;
    connectToWhatsApp(true);
    res.json({ message: 'Connection started' });
});

app.post('/disconnect', async (req, res) => {
    console.log("🛑 User requested disconnect");
    try {
        await sock?.logout();
    } catch (e) { }

    try {
        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    } catch (e) { }

    isClientReady = false;
    currentQR = null;
    isExpired = true; // effectively disconnected/stopped
    res.json({ message: 'Disconnected and session cleared' });
});

app.get('/status-json', async (req, res) => {
    try {
        const response = {
            ready: isClientReady,
            qr: null,
            expired: isExpired
        };

        if (!isClientReady && currentQR && !isExpired) {
            response.qr = await QRCode.toDataURL(currentQR);
        }
        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: isClientReady ? 'ready' : (isExpired ? 'expired' : 'initializing'),
        message: isClientReady ? 'WhatsApp service is ready' : 'WhatsApp service is not ready'
    });
});

app.post('/send-otp', async (req, res) => {
    try {
        const { phone_number, message } = req.body;
        if (!phone_number || !message) return res.status(400).json({ error: 'Missing fields' });

        // Relaxed check: Allow if explicit ready flag OR if socket is actually connected
        const isSocketOpen = sock?.ws?.isOpen;
        const hasUser = !!sock?.user;

        console.log(`DEBUG: isClientReady=${isClientReady}, isSocketOpen=${isSocketOpen}, hasUser=${hasUser}`);

        if (!isClientReady && !isSocketOpen && !hasUser) {
            console.log("❌ Service not ready (Client not ready & Socket not open & No User)");
            return res.status(503).json({ error: 'Service not ready' });
        }

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

// Admin Dashboard - Get active users from backend
app.get('/admin/users', async (req, res) => {
    try {
        const axios = (await import('axios')).default;
        const response = await axios.get('http://localhost:8000/admin/dashboard');
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Admin Dashboard - Stop user session
app.post('/admin/stop-user/:userId', async (req, res) => {
    try {
        const axios = (await import('axios')).default;
        await axios.post(`http://localhost:8000/admin/stop-user/${req.params.userId}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to stop user' });
    }
});

// Simple session storage (in production, use Redis or database)
const sessions = new Map();

// Admin credentials (use environment variables in production)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Login endpoint
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

// Logout endpoint
app.post('/admin/logout', (req, res) => {
    const { sessionId } = req.body;
    sessions.delete(sessionId);
    res.json({ success: true });
});

// Check session
app.get('/admin/check-session', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId && sessions.has(sessionId)) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

// Enhanced UI Route with Authentication
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Chatnalyxer Admin Panel</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                        background: #f5f7fa;
                        min-height: 100vh;
                    }
                    
                    /* Login Page */
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
                    .login-box h1 {
                        text-align: center;
                        margin-bottom: 10px;
                        color: #333;
                        font-size: 28px;
                    }
                    .login-box p {
                        text-align: center;
                        color: #666;
                        margin-bottom: 30px;
                    }
                    .form-group {
                        margin-bottom: 20px;
                    }
                    .form-group label {
                        display: block;
                        margin-bottom: 8px;
                        color: #333;
                        font-weight: 500;
                    }
                    .form-group input {
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        font-size: 14px;
                    }
                    .form-group input:focus {
                        outline: none;
                        border-color: #667eea;
                    }
                    .login-btn {
                        width: 100%;
                        padding: 14px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.3s;
                    }
                    .login-btn:hover {
                        background: #5568d3;
                    }
                    .error-msg {
                        background: #fee;
                        color: #c33;
                        padding: 10px;
                        border-radius: 6px;
                        margin-bottom: 20px;
                        display: none;
                    }
                    
                    /* Dashboard */
                    .navbar {
                        background: white;
                        padding: 16px 24px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .navbar h1 {
                        font-size: 20px;
                        color: #333;
                    }
                    .logout-btn {
                        padding: 8px 16px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .dashboard {
                        max-width: 1400px;
                        margin: 24px auto;
                        padding: 0 24px;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 24px;
                    }
                    @media (max-width: 768px) {
                        .dashboard { grid-template-columns: 1fr; }
                    }
                    .card {
                        background: white;
                        border-radius: 12px;
                        padding: 24px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .card.full-width {
                        grid-column: 1 / -1;
                    }
                    .card h2 {
                        color: #333;
                        margin-bottom: 20px;
                        font-size: 18px;
                        font-weight: 600;
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: 600;
                        margin-bottom: 15px;
                    }
                    .status-badge.connected { background: #d4edda; color: #155724; }
                    .status-badge.disconnected { background: #f8d7da; color: #721c24; }
                    .status-badge.expired { background: #fff3cd; color: #856404; }
                    .btn {
                        padding: 10px 20px;
                        border-radius: 6px;
                        border: none;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                        margin: 5px;
                    }
                    .btn:hover { opacity: 0.9; }
                    .btn-primary { background: #667eea; color: white; }
                    .btn-danger { background: #dc3545; color: white; }
                    .btn-small { padding: 6px 12px; font-size: 12px; }
                    #qr-area {
                        text-align: center;
                        margin: 20px 0;
                    }
                    #qr-img {
                        max-width: 280px;
                        border-radius: 8px;
                        border: 1px solid #ddd;
                    }
                    .user-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    .user-table th {
                        background: #f8f9fa;
                        padding: 12px;
                        text-align: left;
                        font-weight: 600;
                        color: #495057;
                        border-bottom: 2px solid #dee2e6;
                        font-size: 13px;
                    }
                    .user-table td {
                        padding: 12px;
                        border-bottom: 1px solid #dee2e6;
                        font-size: 14px;
                    }
                    .user-table tr:hover {
                        background: #f8f9fa;
                    }
                    .status-dot {
                        display: inline-block;
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        margin-right: 8px;
                    }
                    .status-dot.active { background: #28a745; }
                    .status-dot.inactive { background: #dc3545; }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    .stat-box {
                        background: #667eea;
                        color: white;
                        padding: 24px;
                        border-radius: 8px;
                        text-align: center;
                    }
                    .stat-box h3 {
                        font-size: 36px;
                        margin-bottom: 8px;
                        font-weight: 700;
                    }
                    .stat-box p {
                        opacity: 0.9;
                        font-size: 14px;
                    }
                    .loading {
                        text-align: center;
                        padding: 40px;
                        color: #6c757d;
                    }
                </style>
            </head>
            <body>
                <!-- Login Page -->
                <div id="login-page" class="login-container">
                    <div class="login-box">
                        <h1>🔐 Admin Login</h1>
                        <p>Chatnalyxer Admin Panel</p>
                        <div id="login-error" class="error-msg"></div>
                        <form id="login-form">
                            <div class="form-group">
                                <label>Username</label>
                                <input type="text" id="username" required autocomplete="username">
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input type="password" id="password" required autocomplete="current-password">
                            </div>
                            <button type="submit" class="login-btn">Login</button>
                        </form>
                    </div>
                </div>

                <!-- Dashboard Page -->
                <div id="dashboard-page" style="display:none;">
                    <div class="navbar">
                        <h1>📊 Chatnalyxer Admin Panel</h1>
                        <button onclick="logout()" class="logout-btn">Logout</button>
                    </div>

                    <div class="dashboard">
                        <!-- WhatsApp Connection Card -->
                        <div class="card">
                            <h2>📱 System WhatsApp</h2>
                            <div id="status-area">
                                <span id="status-badge" class="status-badge">Checking...</span>
                            </div>
                            <div id="actions">
                                <button onclick="triggerConnect()" class="btn btn-primary">Link WhatsApp</button>
                                <button onclick="triggerDisconnect()" class="btn btn-danger">Disconnect</button>
                            </div>
                            <div id="qr-area" style="display:none;">
                                <h3 style="margin: 20px 0 10px; font-size: 16px;">Scan QR Code</h3>
                                <img id="qr-img" src="" />
                                <p style="color: #6c757d; margin-top: 10px; font-size: 13px;">Open WhatsApp > Linked Devices > Link a Device</p>
                            </div>
                        </div>

                        <!-- Stats Card -->
                        <div class="card">
                            <h2>📊 Statistics</h2>
                            <div class="stats-grid">
                                <div class="stat-box">
                                    <h3 id="total-users">0</h3>
                                    <p>Total Users</p>
                                </div>
                                <div class="stat-box">
                                    <h3 id="active-sessions">0</h3>
                                    <p>Active Sessions</p>
                                </div>
                            </div>
                        </div>

                        <!-- Active Users Card -->
                        <div class="card full-width">
                            <h2>👥 User Sessions</h2>
                            <div id="users-container">
                                <div class="loading">Loading users...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    let sessionId = localStorage.getItem('adminSessionId');
                    const statusBadge = document.getElementById('status-badge');
                    const qrArea = document.getElementById('qr-area');
                    const qrImg = document.getElementById('qr-img');
                    let lastQR = '';
                    let statusInterval, usersInterval;

                    // Check if already logged in
                    checkSession();

                    async function checkSession() {
                        if (!sessionId) {
                            showLogin();
                            return;
                        }

                        try {
                            const res = await fetch('/admin/check-session', {
                                headers: { 'X-Session-Id': sessionId }
                            });
                            const data = await res.json();
                            
                            if (data.valid) {
                                showDashboard();
                            } else {
                                showLogin();
                            }
                        } catch (e) {
                            showLogin();
                        }
                    }

                    function showLogin() {
                        document.getElementById('login-page').style.display = 'flex';
                        document.getElementById('dashboard-page').style.display = 'none';
                        clearInterval(statusInterval);
                        clearInterval(usersInterval);
                    }

                    function showDashboard() {
                        document.getElementById('login-page').style.display = 'none';
                        document.getElementById('dashboard-page').style.display = 'block';
                        startDashboard();
                    }

                    // Login form
                    document.getElementById('login-form').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const username = document.getElementById('username').value;
                        const password = document.getElementById('password').value;
                        const errorDiv = document.getElementById('login-error');

                        try {
                            const res = await fetch('/admin/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username, password })
                            });

                            if (res.ok) {
                                const data = await res.json();
                                sessionId = data.sessionId;
                                localStorage.setItem('adminSessionId', sessionId);
                                showDashboard();
                            } else {
                                errorDiv.textContent = 'Invalid username or password';
                                errorDiv.style.display = 'block';
                            }
                        } catch (e) {
                            errorDiv.textContent = 'Login failed. Please try again.';
                            errorDiv.style.display = 'block';
                        }
                    });

                    async function logout() {
                        await fetch('/admin/logout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sessionId })
                        });
                        localStorage.removeItem('adminSessionId');
                        sessionId = null;
                        showLogin();
                    }

                    function startDashboard() {
                        checkStatus();
                        loadUsers();
                        statusInterval = setInterval(checkStatus, 2000);
                        usersInterval = setInterval(loadUsers, 5000);
                    }

                    // Check WhatsApp Status
                    async function checkStatus() {
                        try {
                            const res = await fetch('/status-json');
                            const data = await res.json();

                            if (data.ready) {
                                statusBadge.className = 'status-badge connected';
                                statusBadge.textContent = '✅ Connected';
                                qrArea.style.display = 'none';
                            } else if (data.expired) {
                                statusBadge.className = 'status-badge expired';
                                statusBadge.textContent = '⚠️ QR Expired - Click Link';
                                qrArea.style.display = 'none';
                            } else if (data.qr) {
                                statusBadge.className = 'status-badge disconnected';
                                statusBadge.textContent = '⏳ Waiting for Scan';
                                if (data.qr !== lastQR) {
                                    lastQR = data.qr;
                                    qrImg.src = data.qr;
                                    qrArea.style.display = 'block';
                                }
                            } else {
                                statusBadge.className = 'status-badge disconnected';
                                statusBadge.textContent = '⚪ Disconnected';
                                qrArea.style.display = 'none';
                            }
                        } catch (e) {
                            statusBadge.textContent = '❌ Error';
                        }
                    }

                    // Load Active Users
                    async function loadUsers() {
                        try {
                            const res = await fetch('/admin/users');
                            const data = await res.json();
                            
                            document.getElementById('total-users').textContent = data.stats.total_users;
                            document.getElementById('active-sessions').textContent = data.stats.active_sessions;

                            const container = document.getElementById('users-container');
                            
                            if (data.users.length === 0) {
                                container.innerHTML = '<div class="loading">No users yet</div>';
                                return;
                            }

                            let html = '<table class="user-table"><thead><tr>';
                            html += '<th>User</th><th>Phone</th><th>Status</th><th>PID</th><th>Action</th>';
                            html += '</tr></thead><tbody>';

                            data.users.forEach(user => {
                                const statusClass = user.is_active_scanner ? 'active' : 'inactive';
                                const statusText = user.is_active_scanner ? 'Running' : 'Stopped';
                                
                                html += '<tr>';
                                html += \`<td><strong>\${user.username}</strong></td>\`;
                                html += \`<td>\${user.phone_number}</td>\`;
                                html += \`<td><span class="status-dot \${statusClass}"></span>\${statusText}</td>\`;
                                html += \`<td>\${user.pid || '-'}</td>\`;
                                html += '<td>';
                                if (user.is_active_scanner) {
                                    html += \`<button class="btn btn-danger btn-small" onclick="stopUser(\${user.user_id}, '\${user.username}')">Stop</button>\`;
                                }
                                html += '</td></tr>';
                            });

                            html += '</tbody></table>';
                            container.innerHTML = html;
                        } catch (e) {
                            document.getElementById('users-container').innerHTML = '<div class="loading">Failed to load users</div>';
                        }
                    }

                    async function triggerConnect() {
                        statusBadge.textContent = 'Starting...';
                        await fetch('/connect', { method: 'POST' });
                        checkStatus();
                    }

                    async function triggerDisconnect() {
                        if(!confirm('Are you sure? This will wipe the session.')) return;
                        statusBadge.textContent = 'Disconnecting...';
                        await fetch('/disconnect', { method: 'POST' });
                        checkStatus();
                    }

                    async function stopUser(userId, username) {
                        if(!confirm(\`Stop session for \${username}?\`)) return;
                        try {
                            await fetch(\`/admin/stop-user/\${userId}\`, { method: 'POST' });
                            loadUsers();
                        } catch (e) {
                            alert('Failed to stop user');
                        }
                    }
                </script>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Chatnalyxer Admin Panel running on http://localhost:${PORT}`);
    console.log(`📱 System WhatsApp OTP Service Ready`);
    console.log(`👥 User Monitoring Dashboard Active`);
    console.log(`🔐 Default credentials: admin / admin123`);
    console.log(`⚠️  Change credentials via ADMIN_USERNAME and ADMIN_PASSWORD env vars`);
});
