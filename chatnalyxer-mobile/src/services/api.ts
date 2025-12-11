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
export async function apiLogin(email: string, password: string) {
  const { data } = await client.post("/auth/login", { email, password });
  return data; // { user, token }
}

export async function apiRegister(username: string, email: string, password: string) {
  const { data } = await client.post("/auth/register", { username, email, password });
  return data; // { user, token }
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
