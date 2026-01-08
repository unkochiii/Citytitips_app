// services/api.js
import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Remplace par l'URL de TON backend
const API_URL = "https://api--tanjablabla--t4nqvl4d28d8.code.run";

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["Content-Type"] = "application/json";
  return config;
});

export default api;
