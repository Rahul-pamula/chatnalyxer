/**
 * Admin OTP Service
 * Port: 3001
 * 
 * Responsibilities:
 * - Send OTP to new users during registration
 * - Admin dashboard UI
 * - Admin authentication
 * - User management
 * 
 * Does NOT handle:
 * - WhatsApp connection
 * - Message forwarding
 * - Pairing codes
 */

import express from 'express';
import pino from 'pino';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

console.log(`🚀 Starting Admin OTP Service on Port ${PORT}`);

// Database Connection
const { Pool } = await import('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chatnalyxer'
});

// Ensure admin_sessions table exists
await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        login_time BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log('✅ Admin Session Table Ready');

// Admin credentials (use environment variables in production)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ============================================
// ADMIN AUTHENTICATION ENDPOINTS
// ============================================

// Login endpoint
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const sessionId = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);

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

// Logout endpoint
app.post('/admin/logout', async (req, res) => {
    const { sessionId } = req.body;
    try {
        await pool.query('DELETE FROM admin_sessions WHERE session_id = $1', [sessionId]);
    } catch (e) { }
    res.json({ success: true });
});

// Check session
app.get('/admin/check-session', async (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) return res.json({ valid: false });

    try {
        const result = await pool.query('SELECT * FROM admin_sessions WHERE session_id = $1', [sessionId]);
        if (result.rows.length > 0) {
            res.json({ valid: true });
        } else {
            res.json({ valid: false });
        }
    } catch (e) {
        res.json({ valid: false });
    }
});

// ============================================
// ADMIN DASHBOARD ENDPOINTS
// ============================================

// Get active users from backend
app.get('/admin/users', async (req, res) => {
    try {
        const axios = (await import('axios')).default;
        const response = await axios.get('http://localhost:8000/admin/dashboard');
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Stop user session
app.post('/admin/stop-user/:userId', async (req, res) => {
    try {
        const axios = (await import('axios')).default;
        await axios.post(`http://localhost:8000/admin/stop-user/${req.params.userId}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to stop user' });
    }
});

// ============================================
// OTP SENDING (For User Registration)
// ============================================

// Note: This requires WhatsApp connection from user-whatsapp-service
// For now, this will proxy to the user service
app.post('/send-otp', async (req, res) => {
    try {
        const { phone_number, message } = req.body;
        if (!phone_number || !message) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // Proxy to user WhatsApp service (port 3002)
        const axios = (await import('axios')).default;
        const response = await axios.post('http://localhost:3002/send-otp', {
            phone_number,
            message
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error sending OTP:', error.message);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'admin-otp',
        port: PORT,
        uptime: process.uptime()
    });
});

// ============================================
// ADMIN DASHBOARD UI
// ============================================

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
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        font-size: 16px;
                        transition: border-color 0.3s;
                    }
                    .form-group input:focus {
                        outline: none;
                        border-color: #667eea;
                    }
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
                        transition: transform 0.2s;
                    }
                    .btn:hover {
                        transform: translateY(-2px);
                    }
                    .error {
                        background: #fee;
                        color: #c33;
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                        display: none;
                    }
                    .dashboard {
                        display: none;
                        padding: 40px;
                    }
                    .dashboard-header {
                        background: white;
                        padding: 24px;
                        border-radius: 12px;
                        margin-bottom: 24px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .dashboard-header h1 {
                        color: #333;
                        margin-bottom: 8px;
                    }
                    .badge {
                        display: inline-block;
                        padding: 6px 12px;
                        background: #e8f5e9;
                        color: #2e7d32;
                        border-radius: 20px;
                        font-size: 14px;
                        font-weight: 600;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                        margin-bottom: 24px;
                    }
                    .stat-card {
                        background: white;
                        padding: 24px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .stat-card h3 {
                        color: #666;
                        font-size: 14px;
                        margin-bottom: 8px;
                    }
                    .stat-card .value {
                        font-size: 32px;
                        font-weight: 700;
                        color: #333;
                    }
                    .logout-btn {
                        background: #f44336;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <!-- Login Screen -->
                <div id="loginScreen" class="login-container">
                    <div class="login-box">
                        <h1>🔐 Admin Panel</h1>
                        <p>Chatnalyxer Admin Service</p>
                        <div id="error" class="error"></div>
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

                <!-- Dashboard Screen -->
                <div id="dashboard" class="dashboard">
                    <div class="dashboard-header">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h1>📊 Admin Dashboard</h1>
                                <span class="badge">Admin OTP Service - Port ${PORT}</span>
                            </div>
                            <button class="logout-btn" onclick="logout()">Logout</button>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>Service Status</h3>
                            <div class="value" style="color: #4caf50;">✓ Running</div>
                        </div>
                        <div class="stat-card">
                            <h3>Port</h3>
                            <div class="value">${PORT}</div>
                        </div>
                        <div class="stat-card">
                            <h3>Service Type</h3>
                            <div class="value" style="font-size: 20px;">Admin OTP</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <h3>ℹ️ Service Information</h3>
                        <p style="margin-top: 12px; color: #666; line-height: 1.6;">
                            This service handles:<br>
                            • OTP sending for user registration<br>
                            • Admin authentication<br>
                            • User management<br>
                            <br>
                            WhatsApp operations are handled by the User WhatsApp Service (Port 3002).
                        </p>
                    </div>
                </div>

                <script>
                    let sessionId = localStorage.getItem('adminSessionId');

                    // Check session on load
                    if (sessionId) {
                        checkSession();
                    }

                    async function checkSession() {
                        try {
                            const res = await fetch('/admin/check-session', {
                                headers: { 'x-session-id': sessionId }
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
                            } else {
                                showError('Invalid credentials');
                            }
                        } catch (e) {
                            showError('Login failed');
                        }
                    });

                    async function logout() {
                        try {
                            await fetch('/admin/logout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sessionId })
                            });
                        } catch (e) {}
                        localStorage.removeItem('adminSessionId');
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
                
                    // Admin WhatsApp (Separate Service on Port 3003)
                    let qrCountdown = 60;
                    let qrTimer = null;

                    async function loadAdminWhatsApp() {
                        try {
                            const res = await fetch('http://localhost:3003/status');
                            const data = await res.json();
                            const section = document.getElementById('adminWhatsAppSection');
                            
                            if (data.connected) {
                                stopQRTimer();
                                const phoneNumber = data.phone_number || 'N/A';
                                section.innerHTML = '<div style="text-align: center;"><div style="font-size: 18px; color: #4caf50; margin-bottom: 12px;">✅ Connected</div><div style="color: #666; margin-bottom: 16px;">Phone: +' + phoneNumber + '</div><button class="btn btn-danger btn-small" onclick="disconnectAdminWhatsApp()">Disconnect</button></div>';
                            } else if (data.qr_code) {
                                if (!qrTimer) startQRTimer();
                                qrCountdown = data.countdown;
                                const expiredHtml = qrCountdown <= 0 ? '<div style="margin-top: 16px;"><p style="color: #f44336; margin-bottom: 12px;">QR Code Expired</p><button class="btn btn-success btn-small" onclick="reconnectAdminWhatsApp()">Generate New QR</button></div>' : '';
                                section.innerHTML = '<div class="qr-container"><p style="color: #666; margin-bottom: 12px;">Scan with WhatsApp:</p><img src="' + data.qr_code + '" alt="QR Code" style="max-width: 300px; margin: 16px auto;" /><div style="font-size: 18px; font-weight: 700; color: ' + (qrCountdown <= 10 ? '#f44336' : '#667eea') + '; margin-top: 16px;">⏱️ Expires in: ' + qrCountdown + 's</div>' + expiredHtml + '</div>';
                            } else {
                                stopQRTimer();
                                section.innerHTML = '<div style="text-align: center;"><button class="btn btn-success btn-small" onclick="connectAdminWhatsApp()">Connect WhatsApp</button></div>';
                            }
                        } catch (e) {
                            console.error('Failed to load admin WhatsApp:', e);
                            document.getElementById('adminWhatsAppSection').innerHTML = '<div style="text-align: center; color: #f44336;">Admin WhatsApp service not running (Port 3003)</div>';
                        }
                    }

                    function startQRTimer() {
                        qrTimer = setInterval(() => {
                            qrCountdown--;
                            if (qrCountdown <= 0) {
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

                    async function connectAdminWhatsApp() {
                        try {
                            await fetch('http://localhost:3003/connect', { method: 'POST' });
                            setTimeout(loadAdminWhatsApp, 1000);
                        } catch (e) {
                            alert('Failed to connect admin WhatsApp. Make sure admin-whatsapp-service.js is running on port 3003');
                        }
                    }

                    async function disconnectAdminWhatsApp() {
                        if (!confirm('Disconnect admin WhatsApp?')) return;
                        try {
                            await fetch('http://localhost:3003/disconnect', { method: 'POST' });
                            stopQRTimer();
                            loadAdminWhatsApp();
                        } catch (e) {
                            alert('Failed to disconnect admin WhatsApp');
                        }
                    }

                    async function reconnectAdminWhatsApp() {
                        try {
                            await fetch('http://localhost:3003/reconnect', { method: 'POST' });
                            setTimeout(loadAdminWhatsApp, 2000);
                        } catch (e) {
                            alert('Failed to reconnect admin WhatsApp');
                        }
                    }

                </script>
            </body>
        </html>
    `);
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`✅ Admin OTP Service running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔐 Default credentials: admin / admin123`);
});
