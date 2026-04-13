import { Platform } from 'react-native';

// Auto-detect platform and use appropriate URL
// Web: Use localhost (for web testing in browser)
// Mobile: Use local network IP (for mobile device testing)
const isWeb = Platform.OS === 'web';

export const BASE_URL = isWeb
    ? 'http://localhost:8000'  // For web testing
    : 'http://localhost:8000';// For USB debugging (already handled by adb reverse)
export const OTP_URL = `${BASE_URL}/auth/send-otp`;
export const QR_URL = `${BASE_URL}/qr`;

// For Azure production (when ready):
// export const BASE_URL = 'https://chatnalyxer-backend-1765864832.azurewebsites.net';
