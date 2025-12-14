// Backend URL Configuration
// Backend deployed on Render
const RENDER_BACKEND_URL = "https://chatnalyxer-backend.onrender.com";

// For local development (uncomment when testing locally)
const LOCALHOST_URL = "http://localhost:8000";

// General API calls go to Render
// export const BASE_URL = RENDER_BACKEND_URL;
export const BASE_URL = LOCALHOST_URL;

// OTP and WhatsApp service calls go to Render
// export const OTP_URL = RENDER_BACKEND_URL;
export const OTP_URL = LOCALHOST_URL;

export const QR_URL = `${RENDER_BACKEND_URL}/qr`;
