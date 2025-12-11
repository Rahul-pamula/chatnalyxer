import axios from 'axios';
import { BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types
export interface Message {
    id: string; // or number depending on backend, using string for safety in UI
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

export interface Task {
    id: number;
    task_description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'done';
    deadline?: string;
    created_at: string;
}

export const aiService = {
    // Chat with AI
    async chat(message: string) {
        const token = await AsyncStorage.getItem('userToken');
        // Using the same variable name as in other services (userToken or token?)
        // Let's check api.ts to be sure about token storage key. 
        // Usually it's 'userToken' based on previous context, but will verify if fails.

        // Note: The backend endpoint is POST /ai/chat
        const response = await axios.post(
            `${BASE_URL}/ai/chat`,
            { message },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data; // Returns { response: "AI Message" }
    },

    // Get important messages for dashboard or context
    async getImportantMessages() {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get(
            `${BASE_URL}/ai/messages/important`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    // Get AI tasks
    async getTasks() {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get(
            `${BASE_URL}/ai/tasks`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    // Update task status
    async updateTask(taskId: number, updates: { status?: string, priority?: string }) {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.put(
            `${BASE_URL}/ai/tasks/${taskId}`,
            updates,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    // Delete task (if needed)
    async deleteTask(taskId: number) {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.delete(
            `${BASE_URL}/ai/tasks/${taskId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    }
};
