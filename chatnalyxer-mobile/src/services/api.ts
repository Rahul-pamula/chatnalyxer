import axios from "axios";
import { BASE_URL } from "../config";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  },
});

export function setAuthToken(token?: string | null) {
  if (token) {
    client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common["Authorization"];
  }
}

// Global 401 error handler to prevent infinite loops
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('🔒 Authentication error - clearing token');

      // Clear token from axios
      delete client.defaults.headers.common["Authorization"];

      // Clear from AsyncStorage
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.removeItem('token');
      await AsyncStorage.default.removeItem('user');

      // Note: We can't redirect here directly, but the app will detect
      // the missing token and redirect to login
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
// --- Auth ---
export async function loginWithPassword(phone: string, password: string) {
  const { data } = await client.post("/auth/login", {
    phone_number: phone,
    password
  });
  return data; // { user, token }
}

export async function registerAndRequestOTP(username: string, phone: string, password: string, email: string) {
  const { data } = await client.post("/auth/register-and-request-otp", {
    username,
    phone_number: phone,
    password,
    email
  });
  return data;
}

export async function verifyOTP(phone: string, otp: string) {
  const { data } = await client.post("/auth/verify-otp", {
    phone_number: phone,
    otp_code: otp
  });
  return data; // { user, token }
}

export async function requestOTP(phone: string, username: string = "User") {
  const { data } = await client.post("/auth/request-otp", {
    phone_number: phone,
    username: username
  });
  return data;
}

export async function resetPassword(phone: string, otp: string, newPass: string) {
  const { data } = await client.post("/auth/reset-password", {
    phone_number: phone,
    otp_code: otp,
    new_password: newPass
  });
  return data;
}

// --- Groups ---
export async function getGroups() {
  const { data } = await client.get("/groups/");
  return data;
}

export async function updateGroupSelection(groupId: number, isSelected: boolean) {
  const { data } = await client.put(`/groups/${groupId}/selection`, {
    is_selected: isSelected,
  });
  return data;
}

export async function getSelectedGroups() {
  const { data } = await client.get("/groups/selected");
  return data;
}

export async function getPriorityMessages(groupId?: number) {
  let url = '/messages/priority/public';
  if (groupId) {
    url += `?group_id=${groupId}`;
  }
  const { data } = await client.get(url);
  return data;
}

export async function getAllMessages(groupId?: number) {
  let url = '/messages/public';
  if (groupId) {
    url += `?group_id=${groupId}`;
  }
  const { data } = await client.get(url);
  return data;
}

// --- Messages ---
export async function deleteMessage(messageId: number) {
  const { data } = await client.delete(`/messages/${messageId}`);
  return data;
}

export async function deleteAllMessages() {
  const { data } = await client.delete('/messages');
  return data;
}

export async function getTrashMessages(groupId?: number) {
  let url = '/messages/trash';
  if (groupId) {
    url += `?group_id=${groupId}`;
  }
  const { data } = await client.get(url);
  return data;
}

export async function emptyTrash() {
  const { data } = await client.delete('/messages/trash');
  return data;
}

export async function restoreMessage(messageId: number) {
  const { data } = await client.post(`/messages/${messageId}/restore`);
  return data;
}

export async function permanentDeleteMessage(messageId: number) {
  const { data } = await client.delete(`/messages/${messageId}/permanent`);
  return data;
}

// --- Dashboard ---
export async function getDashboard() {
  const { data } = await client.get("/dashboard/");
  return data;
}

// --- WhatsApp ---
export async function connectWhatsApp() {
  const { data } = await client.post("/whatsapp/connect");
  return data;
}

export async function getWhatsAppStatus() {
  const { data } = await client.get("/whatsapp/status");
  return data;
}

export async function disconnectWhatsApp() {
  const { data } = await client.post("/whatsapp/disconnect");
  return data;
}

// Legacy aliases for backward compatibility
export const startWhatsApp = connectWhatsApp;
export const stopWhatsApp = disconnectWhatsApp;

// --- Email ---
export async function linkEmail(email: string, password: string, provider: string = "gmail") {
  const { data } = await client.post("/email/link", {
    email,
    password,
    provider
  });
  return data;
}
// --- AI Chat ---
export async function chatWithAI(message: string) {
  const { data } = await client.post("/ai/chat", {
    message
  });
  return data;
}

export async function toggleMessagePriority(messageId: number) {
  const { data } = await client.post(`/messages/${messageId}/toggle-priority`);
  return data;
}
