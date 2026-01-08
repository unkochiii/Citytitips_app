import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Normalise le nom de ville (ex: 'tanger' -> 'Tanger')
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
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          // Normaliser la ville si présente
          const parsed = JSON.parse(storedUser);
          if (parsed?.city) parsed.city = normalizeCity(parsed.city);
          setUser(parsed);
          console.log(
            "AuthProvider: user loaded from storage:",
            JSON.stringify(parsed, null, 2)
          );
        }
      } catch (error) {
        console.log("Erreur chargement user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // ✅ CORRECTION : Adapter à la vraie structure de l'API avec "roles" (array)
  const login = async (userData) => {
    try {
      console.log("=== DONNÉES REÇUES DE L'API ===");
      console.log(JSON.stringify(userData, null, 2));

      const newToken = userData.token;

      // ✅ CORRECTION : Sauvegarder "roles" (array) au lieu de "role" (string)
      // Robust roles extraction from multiple possible API shapes
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
          userData.user.adminCities || userData.user.account?.adminCities || [], // ✅ Ajouter adminCities
        isAdmin: userData.user.isAdmin || newRoles.includes("admin") || false,
        isSuperAdmin:
          userData.user.isSuperAdmin ||
          newRoles.includes("superAdmin") ||
          false,
      };

      console.log("=== USER À SAUVEGARDER ===");
      console.log(JSON.stringify(newUser, null, 2));

      await AsyncStorage.setItem("token", newToken);
      await AsyncStorage.setItem("user", JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.log("Erreur sauvegarde:", error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      setToken(null);
      setUser(null);
    } catch (error) {
      console.log("Erreur logout:", error);
    }
  };

  // Refresh current user data from API (useful if role changed server-side)
  const refreshUser = async () => {
    if (!token || !user?._id) return null;

    try {
      const response = await fetch(
        `https://api--tanjablabla--t4nqvl4d28d8.code.run/user/${user._id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      const apiUser = data.user || data.data || data;

      if (apiUser && apiUser._id) {
        // ✅ CORRECTION : Normaliser les données refresh aussi
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
        return updatedUser;
      }
    } catch (error) {
      console.log("Erreur refreshUser:", error);
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
        isAdmin,
        isSuperAdmin,
        login,
        logout,
        refreshUser,
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
