import axios from "axios";

// 👉 Update this to Rahul’s FastAPI base URL when ready
const baseURL = "http://localhost:8000";

const client = axios.create({ baseURL });

export async function login(email: string, password: string): Promise<string> {
  // TEMP: simulate login until backend is ready
  // const { data } = await client.post("/login", { email, password });
  // return data.token;
  await new Promise((res) => setTimeout(res, 300));
  return "demo-token";
}

export async function register(email: string, password: string): Promise<boolean> {
  // TEMP: simulate register
  await new Promise((res) => setTimeout(res, 300));
  return true;
}
