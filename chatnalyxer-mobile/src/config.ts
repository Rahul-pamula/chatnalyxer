import { Platform } from 'react-native';

// Updated dynamically based on development environment
// REMOTE TESTING: Use ngrok tunnel for all platforms
const NGROK_TUNNEL_URL = "https://a5bb3882f987.ngrok-free.app";

// For local development only (comment out when using ngrok)
// const LOCALHOST_URL = "http://localhost:8000";

// Use ngrok tunnel for remote testing on any device
export const BASE_URL = NGROK_TUNNEL_URL;

export const QR_URL = `${NGROK_TUNNEL_URL}/qr`;
