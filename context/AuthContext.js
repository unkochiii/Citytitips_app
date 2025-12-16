import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

const API_URL = "https://site--en2versv0-backend--ftkq8hkxyc7l.code.run";

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");

  return {
    user: context.user,
    token: context.user?.token,
    isLoading: context.booting,
    login: context.login,
    signup: context.signup,
    logout: context.logout,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("authToken");
      const id = await SecureStore.getItemAsync("authUserId");
      const username = await SecureStore.getItemAsync("authUsername");

      if (token && id) setUser({ _id: id, token, username });
      setBooting(false);
    })();
  }, []);

  const auth = useMemo(
    () => ({
      user,
      booting,
      async login(email, password) {
        const res = await axios.post(`${API_URL}/auth/login`, {
          email,
          password,
        });
        const data = res.data;

        await SecureStore.setItemAsync("authToken", data.token);
        await SecureStore.setItemAsync("authUserId", data._id);
        await SecureStore.setItemAsync("authUsername", data.account.username);

        setUser({
          _id: data._id,
          token: data.token,
          username: data.account.username,
        });
      },
      async signup(payload) {
        const res = await axios.post(`${API_URL}/auth/signup`, payload);
        const data = res.data.user;

        await SecureStore.setItemAsync("authToken", data.token);
        await SecureStore.setItemAsync("authUserId", data._id);
        await SecureStore.setItemAsync("authUsername", data.account.username);

        setUser({
          _id: data._id,
          token: data.token,
          username: data.account.username,
        });
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
