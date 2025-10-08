import { Platform } from 'react-native';

export const BASE_URL = Platform.OS === 'web' ? "http://localhost:8000" : "http://10.84.19.232:8000";
