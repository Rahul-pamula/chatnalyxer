/**
 * WhatsApp Session Manager
 * Port: 3002
 * 
 * Responsibilities:
 * - Spawn/kill per-user WhatsApp processes
 * - Track active sessions
 * - Route QR/Pairing code requests
 * - Handle session cleanup
 */

import express from 'express';
import { spawn } from 'child_process';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const BASE_PORT = 4000; // User sessions start from port 4000
const BACKEND_URL = 'http://localhost:8000';

console.log(`🚀 Starting WhatsApp Session Manager on Port ${PORT}`);

// Track active sessions
const activeSessions = new Map();
// Map structure: userId -> { process, port, startedAt, status }

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Start WhatsApp session for a user
 */
app.post('/sessions/start/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    try {
        // Check if session already exists
        if (activeSessions.has(userId)) {
            const session = activeSessions.get(userId);
            return res.json({
                success: true,
                message: 'Session already running',
                port: session.port,
                status: session.status
            });
        }

        // Calculate port for this user
        const userPort = BASE_PORT + userId;

        console.log(`📱 Starting WhatsApp session for User ${userId} on port ${userPort}`);

        // Spawn user-specific WhatsApp process
        const whatsappProcess = spawn('node', [
            'user-whatsapp-service.js',
            userId.toString(),
            userPort.toString()
        ], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Log output
        whatsappProcess.stdout.on('data', (data) => {
            console.log(`[User ${userId}] ${data.toString().trim()}`);
        });

        whatsappProcess.stderr.on('data', (data) => {
            console.error(`[User ${userId} ERROR] ${data.toString().trim()}`);
        });

        // Handle process exit
        whatsappProcess.on('exit', (code) => {
            console.log(`❌ User ${userId} session exited with code ${code}`);
            activeSessions.delete(userId);

            // Notify backend
            axios.post(`${BACKEND_URL}/whatsapp/session-ended`, {
                user_id: userId,
                exit_code: code
            }).catch(err => console.error('Failed to notify backend:', err.message));
        });

        // Store session info
        activeSessions.set(userId, {
            process: whatsappProcess,
            port: userPort,
            startedAt: new Date(),
            status: 'initializing',
            pid: whatsappProcess.pid
        });

        res.json({
            success: true,
            message: 'WhatsApp session started',
            user_id: userId,
            port: userPort,
            pid: whatsappProcess.pid
        });

    } catch (error) {
        console.error(`❌ Failed to start session for User ${userId}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Stop WhatsApp session for a user
 */
app.post('/sessions/stop/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    try {
        if (!activeSessions.has(userId)) {
            return res.status(404).json({
                success: false,
                message: 'No active session found'
            });
        }

        const session = activeSessions.get(userId);
        console.log(`🛑 Stopping WhatsApp session for User ${userId}`);

        // Kill the process
        session.process.kill('SIGTERM');

        // Remove from active sessions
        activeSessions.delete(userId);

        res.json({
            success: true,
            message: 'Session stopped',
            user_id: userId
        });

    } catch (error) {
        console.error(`❌ Failed to stop session for User ${userId}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get session status for a user
 */
app.get('/sessions/status/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!activeSessions.has(userId)) {
        return res.json({
            active: false,
            message: 'No active session'
        });
    }

    const session = activeSessions.get(userId);
    res.json({
        active: true,
        user_id: userId,
        port: session.port,
        status: session.status,
        started_at: session.startedAt,
        pid: session.pid
    });
});

/**
 * Get QR code for a user
 */
app.get('/sessions/qr/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!activeSessions.has(userId)) {
        return res.status(404).json({
            error: 'No active session. Start session first.'
        });
    }

    const session = activeSessions.get(userId);

    try {
        // Forward request to user's WhatsApp service
        const response = await axios.get(`http://localhost:${session.port}/qr`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get QR code',
            message: error.message
        });
    }
});

/**
 * Generate pairing code for a user
 */
app.post('/sessions/pairing/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!activeSessions.has(userId)) {
        return res.status(404).json({
            error: 'No active session. Start session first.'
        });
    }

    const session = activeSessions.get(userId);

    try {
        // Forward request to user's WhatsApp service
        const response = await axios.post(`http://localhost:${session.port}/pairing-code/generate`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate pairing code',
            message: error.message
        });
    }
});

/**
 * List all active sessions
 */
app.get('/sessions/active', (req, res) => {
    const sessions = [];

    activeSessions.forEach((session, userId) => {
        sessions.push({
            user_id: userId,
            port: session.port,
            status: session.status,
            started_at: session.startedAt,
            pid: session.pid
        });
    });

    res.json({
        count: sessions.length,
        sessions: sessions
    });
});

/**
 * Update session status (called by user WhatsApp services)
 */
app.post('/sessions/update-status', (req, res) => {
    const { user_id, status, qr_code, pairing_code } = req.body;

    if (activeSessions.has(user_id)) {
        const session = activeSessions.get(user_id);
        session.status = status;

        if (qr_code) session.qr_code = qr_code;
        if (pairing_code) session.pairing_code = pairing_code;

        console.log(`📊 User ${user_id} status updated: ${status}`);
    }

    res.json({ success: true });
});

// ============================================
// HEALTH & MONITORING
// ============================================

/**
 * Heartbeat monitoring - check if processes are alive
 */
setInterval(() => {
    activeSessions.forEach((session, userId) => {
        try {
            // Check if process is still alive
            process.kill(session.pid, 0);
        } catch (e) {
            // Process is dead
            console.log(`💀 Session for user ${userId} died unexpectedly`);
            activeSessions.delete(userId);

            // Notify backend
            axios.post(`${BACKEND_URL}/whatsapp/session-ended`, {
                user_id: userId,
                reason: 'process_died'
            }).catch(err => console.error('Failed to notify backend:', err.message));
        }
    });
}, 30000); // Every 30 seconds

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'whatsapp-session-manager',
        port: PORT,
        active_sessions: activeSessions.size,
        uptime: process.uptime()
    });
});

// ============================================
// CLEANUP ON EXIT
// ============================================

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down Session Manager...');

    // Kill all active sessions
    activeSessions.forEach((session, userId) => {
        console.log(`Stopping session for User ${userId}`);
        session.process.kill('SIGTERM');
    });

    process.exit(0);
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`✅ WhatsApp Session Manager running on http://localhost:${PORT}`);
    console.log(`📊 Active sessions: ${activeSessions.size}`);
    console.log(`🔢 Base port for user sessions: ${BASE_PORT}`);
});
