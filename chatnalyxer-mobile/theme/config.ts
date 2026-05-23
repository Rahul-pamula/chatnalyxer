import { Platform } from 'react-native';

// Auto-detect platform and use appropriate URL
const isWeb = Platform.OS === 'web';

// TESTING: Using HTTPS to check if HTTP is blocked
export const BASE_URL = isWeb
    ? 'http://localhost:8000'
    : 'https://chatnalyxer-backend-tgge.onrender.com';  // HTTPS (no cleartext blocking)

export const OTP_URL = `${BASE_URL}/auth/send-otp`;
export const QR_URL = `${BASE_URL}/qr`;

// Local HTTP (blocked on Android 9+):
// : 'http://172.21.224.32:8000';