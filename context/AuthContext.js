import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.log("Erreur chargement user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // ✅ CORRECTION : Adapter à la vraie structure de l'API
  const login = async (userData) => {
    try {
      console.log("=== DONNÉES REÇUES DE L'API ===");
      console.log(JSON.stringify(userData, null, 2));

      const newToken = userData.token;

      // ✅ Les données sont dans userData.user, pas directement dans userData
      const newUser = {
        _id: userData.user._id,
        username: userData.user.username,
        avatar: userData.user.avatar, // { secure_url, public_id }
        role: userData.user.role,
        city: userData.user.city,
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

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
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
