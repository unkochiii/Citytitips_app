// services/api.js
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = "https://site--en2versv0-backend--ftkq8hkxyc7l.code.run";

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
