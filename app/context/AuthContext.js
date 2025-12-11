import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Au démarrage, on vérifie si un token existe
    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await SecureStore.getItemAsync('authToken');
            if (storedToken) {
                setToken(storedToken);
                // Récupère les infos utilisateur depuis le backend
                const { data } = await api.get('/me', {
                    headers: { Authorization: `Bearer ${storedToken}` }
                });
                setUser(data.user);
            }
        } catch (error) {
            console.log('Erreur chargement auth:', error);
            await SecureStore.deleteItemAsync('authToken');
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            await SecureStore.setItemAsync('authToken', data.token);
            setToken(data.token);
            setUser(data.user);
            router.replace('/(tabs)');
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Erreur de connexion');
        }
    };

    const signup = async (userData) => {
        try {
            const { data } = await api.post('/auth/signup', userData);
            await SecureStore.setItemAsync('authToken', data.token);
            setToken(data.token);
            setUser(data.user);
            router.replace('/(tabs)');
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Erreur d\'inscription');
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('authToken');
        setToken(null);
        setUser(null);
        router.replace('/(auth)/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
