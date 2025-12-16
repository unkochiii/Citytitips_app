// context/AuthContext.js
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return {
        token: context.user?.token,
        userId: context.user?._id,
        username: context.user?.username,
        isLoading: context.booting,
        user: context.user,
        login: context.login,
        signup: context.signup,
        logout: context.logout,
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // { _id, token, username }
    const [booting, setBooting] = useState(true);

    useEffect(() => {
        (async () => {
            const token = await SecureStore.getItemAsync("authToken");
            const id = await SecureStore.getItemAsync("authUserId");
            const username = await SecureStore.getItemAsync("authUsername");
            if (token && id) setUser({ _id: id, token, username: username || "" });
            setBooting(false);
        })();
    }, []);

    const auth = useMemo(
        () => ({
            user,
            booting,

            async login(email, password) {
                try {
                    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
                    const data = res.data;

                    await SecureStore.setItemAsync("authToken", data.token);
                    await SecureStore.setItemAsync("authUserId", data._id);
                    await SecureStore.setItemAsync("authUsername", data.account?.username || "");

                    setUser({ _id: data._id, token: data.token, username: data.account?.username || "" });
                    return data;
                } catch (error) {
                    const message = error.response?.data?.message || error.response?.data?.error || error.message || "Login failed";
                    throw new Error(message);
                }
            },

            async signup(payload) {
                try {
                    const res = await axios.post(`${API_URL}/auth/signup`, payload);
                    const data = res.data; // { message, user: { _id, token, account: { username } } }

                    await SecureStore.setItemAsync("authToken", data.user.token);
                    await SecureStore.setItemAsync("authUserId", data.user._id);
                    await SecureStore.setItemAsync("authUsername", data.user.account?.username || "");

                    setUser({ _id: data.user._id, token: data.user.token, username: data.user.account?.username || "" });
                    return data;
                } catch (error) {
                    const message = error.response?.data?.message || error.response?.data?.error || error.message || "Signup failed";
                    throw new Error(message);
                }
            },

            async logout() {
                await SecureStore.deleteItemAsync("authToken");
                await SecureStore.deleteItemAsync("authUserId");
                await SecureStore.deleteItemAsync("authUsername");
                setUser(null);
            },
        }),
        [user, booting]
    );

    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
