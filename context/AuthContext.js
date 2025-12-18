import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

const API_URL = "https://site--en2versv0-backend--ftkq8hkxyc7l.code.run";

export const AuthContext = createContext(null);

const toStr = (v) => (v == null ? "" : typeof v === "string" ? v : String(v));
const first = (...vals) => vals.find((v) => v != null && v !== "");

const extractAuth = (raw) => {
  // raw = res.data
  const data = raw?.data ?? raw;

  const token = toStr(
    first(
      data?.token,
      data?.authToken,
      data?.accessToken,
      data?.jwt,
      data?.user?.token,
      data?.user?.authToken,
      data?.user?.accessToken,
      data?.user?.jwt,
      data?.result?.token,
      data?.result?.authToken,
      data?.result?.accessToken
    )
  );

  const id = toStr(
    first(
      data?._id,
      data?.id,
      data?.userId,
      data?.accountId,
      data?.user?._id,
      data?.user?.id,
      data?.user?.userId,
      data?.result?._id,
      data?.result?.id
    )
  );

  const username = toStr(
    first(
      data?.account?.username,
      data?.user?.account?.username,
      data?.user?.username,
      data?.username,
      data?.result?.account?.username,
      data?.result?.username
    )
  );

  return { token, id, username, raw: data };
};

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
      try {
        const token = await SecureStore.getItemAsync("authToken"); // string
        const id = await SecureStore.getItemAsync("authUserId"); // string
        const username = await SecureStore.getItemAsync("authUsername"); // string

        if (token && id) setUser({ _id: id, token, username: username || "" });
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const auth = useMemo(
    () => ({
      user,
      booting,

      async login(email, password) {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });

        // DEBUG (enlève après)
        console.log("LOGIN RES.DATA =", JSON.stringify(res.data, null, 2));

        const { token, id, username } = extractAuth(res.data);

        if (!token || !id) {
          throw new Error("Invalid login response (token/id missing)");
        }

        await SecureStore.setItemAsync("authToken", token);
        await SecureStore.setItemAsync("authUserId", id);
        await SecureStore.setItemAsync("authUsername", username);

        setUser({ _id: id, token, username });
      },

      async signup(payload) {
        const res = await axios.post(`${API_URL}/auth/signup`, payload);

        // DEBUG (enlève après)
        console.log("SIGNUP RES.DATA =", JSON.stringify(res.data, null, 2));

        const { token, id, username } = extractAuth(res.data);

        if (!token || !id) {
          throw new Error("Invalid signup response (token/id missing)");
        }

        await SecureStore.setItemAsync("authToken", token);
        await SecureStore.setItemAsync("authUserId", id);
        await SecureStore.setItemAsync("authUsername", username);

        setUser({ _id: id, token, username });
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