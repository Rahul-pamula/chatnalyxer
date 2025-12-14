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
export async function startWhatsApp() {
  const { data } = await client.post("/whatsapp/start");
  return data;
}

export async function getWhatsAppStatus() {
  const { data } = await client.get("/whatsapp/status");
  return data;
}

export async function stopWhatsApp() {
  const { data } = await client.post("/whatsapp/stop");
  return data;
}
