import { Platform } from 'react-native';

export const BASE_URL = Platform.OS === 'web' ? "http://localhost:8000" : "http://10.84.20.86:8000";
export const QR_URL = Platform.OS === 'web' ? "http://localhost:3000/qr" : "http://10.84.20.86:3000/qr";
