// app/context/AuthContext.js
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTokenReady, setIsTokenReady] = useState(false); // ✅ Nouveau flag

  // Normalise le nom de ville
  const normalizeCity = (c) => {
    if (!c) return c;
    return c
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) =>
        w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w
      )
      .join(" ");
  };

  useEffect(() => {
    const loadUser = async () => {
      console.log(`[${Platform.OS}] ========== LOADING USER ==========`);
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");

        console.log(
          `[${Platform.OS}] Token from storage:`,
          storedToken ? "EXISTS" : "NULL"
        );
        console.log(
          `[${Platform.OS}] User from storage:`,
          storedUser ? "EXISTS" : "NULL"
        );

        if (storedToken && storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.city) parsed.city = normalizeCity(parsed.city);

          // ✅ IMPORTANT: Set token FIRST, then user
          setToken(storedToken);
          setUser(parsed);

          console.log(
            `[${Platform.OS}] Token set:`,
            storedToken.substring(0, 30) + "..."
          );
          console.log(`[${Platform.OS}] User set:`, parsed?.username);

          // ✅ Sur Android, attendre un peu plus pour s'assurer que le state est mis à jour
          if (Platform.OS === "android") {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          setIsTokenReady(true);
        } else {
          console.log(`[${Platform.OS}] No stored credentials`);
          setIsTokenReady(true);
        }
      } catch (error) {
        console.error(`[${Platform.OS}] Erreur chargement user:`, error);
        setIsTokenReady(true);
      } finally {
        setIsLoading(false);
        console.log(`[${Platform.OS}] ========== LOADING COMPLETE ==========`);
      }
    };

    loadUser();
  }, []);

  const login = async (userData) => {
    try {
      console.log(`[${Platform.OS}] ========== LOGIN ==========`);
      console.log("Données reçues:", JSON.stringify(userData, null, 2));

      const newToken = userData.token;

      const possibleRoles = userData.user.roles ||
        userData.user.account?.roles ||
        (userData.user.role ? [userData.user.role] : null) ||
        (userData.user.account?.role ? [userData.user.account.role] : null) || [
          "user",
        ];

      const newRoles = Array.isArray(possibleRoles)
        ? possibleRoles
        : [String(possibleRoles)];

      const normalizedCity =
        userData.user.city ||
        userData.user.location?.city ||
        userData.user.account?.city ||
        "";

      const newUser = {
        _id: userData.user._id || userData.user.account?._id,
        username:
          userData.user.username || userData.user.account?.username || "",
        avatar: userData.user.avatar || userData.user.account?.avatar,
        roles: newRoles,
        role: userData.user.role || newRoles[0] || "user",
        city: normalizeCity(normalizedCity),
        adminCities:
          userData.user.adminCities || userData.user.account?.adminCities || [],
        isAdmin: userData.user.isAdmin || newRoles.includes("admin") || false,
        isSuperAdmin:
          userData.user.isSuperAdmin ||
          newRoles.includes("superAdmin") ||
          false,
      };

      console.log(
        `[${Platform.OS}] User à sauvegarder:`,
        JSON.stringify(newUser, null, 2)
      );

      // ✅ Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem("token", newToken);
      await AsyncStorage.setItem("user", JSON.stringify(newUser));

      // ✅ Mettre à jour le state
      setToken(newToken);
      setUser(newUser);
      setIsTokenReady(true);

      console.log(`[${Platform.OS}] Login complete, token saved`);
    } catch (error) {
      console.error(`[${Platform.OS}] Erreur login:`, error);
    }
  };

  const logout = async () => {
    try {
      console.log(`[${Platform.OS}] ========== LOGOUT ==========`);
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setIsTokenReady(false);
    } catch (error) {
      console.error(`[${Platform.OS}] Erreur logout:`, error);
    }
  };

  // ✅ Fonction pour récupérer le token directement depuis AsyncStorage (fallback)
  const getToken = useCallback(async () => {
    if (token) return token;

    try {
      const storedToken = await AsyncStorage.getItem("token");
      console.log(
        `[${Platform.OS}] getToken fallback:`,
        storedToken ? "EXISTS" : "NULL"
      );
      return storedToken;
    } catch (error) {
      console.error(`[${Platform.OS}] Erreur getToken:`, error);
      return null;
    }
  }, [token]);

  const refreshUser = async () => {
    // ✅ Utiliser getToken pour être sûr d'avoir le token
    const currentToken = await getToken();

    if (!currentToken || !user?._id) {
      console.log(`[${Platform.OS}] refreshUser: pas de token ou user`);
      return null;
    }

    try {
      console.log(`[${Platform.OS}] ========== REFRESH USER ==========`);
      const response = await fetch(
        `https://site--citytitipsback--fp64tcf5fhqm.code.run/user/${user._id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      const apiUser = data.user || data.data || data;

      if (apiUser && apiUser._id) {
        const updatedRoles =
          apiUser.roles || (apiUser.role ? [apiUser.role] : ["user"]);

        const updatedUser = {
          _id: apiUser._id,
          username: apiUser.username || apiUser.account?.username,
          avatar: apiUser.avatar,
          roles: updatedRoles,
          role: apiUser.role || updatedRoles[0] || "user",
          city: normalizeCity(apiUser.city || apiUser.location?.city),
          adminCities: apiUser.adminCities || [],
          isAdmin:
            apiUser.isAdmin ||
            (updatedRoles && updatedRoles.includes("admin")) ||
            false,
          isSuperAdmin:
            apiUser.isSuperAdmin ||
            (updatedRoles && updatedRoles.includes("superAdmin")) ||
            false,
        };

        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        console.log(`[${Platform.OS}] User refreshed:`, updatedUser.username);
        return updatedUser;
      }
    } catch (error) {
      console.error(`[${Platform.OS}] Erreur refreshUser:`, error);
    }

    return null;
  };

  const isAdmin =
    user?.isAdmin ||
    user?.roles?.includes("admin") ||
    user?.role === "admin" ||
    false;
  const isSuperAdmin =
    user?.isSuperAdmin ||
    user?.roles?.includes("superAdmin") ||
    user?.role === "superAdmin" ||
    false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isTokenReady, // ✅ Nouveau
        isAdmin,
        isSuperAdmin,
        login,
        logout,
        refreshUser,
        getToken, // ✅ Nouveau - fonction pour récupérer le token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
};
