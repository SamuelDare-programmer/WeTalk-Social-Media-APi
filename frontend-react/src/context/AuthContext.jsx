import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await axios.get('/auth/users/me');
            setUser(res.data);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

            if (!accessToken && refreshToken) {
                // Try to refresh before initial user fetch
                try {
                    const storage = localStorage.getItem('refresh_token') ? localStorage : sessionStorage;
                    const res = await axios.get('/auth/users/refresh-token', {
                        headers: { Authorization: `Bearer ${refreshToken}` }
                    });
                    const { access_token } = res.data;
                    storage.setItem('access_token', access_token);
                } catch (err) {
                    console.error("Initial refresh failed", err);
                }
            }
            await fetchUser();
        };

        initializeAuth();
    }, []);

    const login = async (accessToken, refreshToken, rememberMe = false) => {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('access_token', accessToken);
        if (refreshToken) {
            storage.setItem('refresh_token', refreshToken);
        }
        await fetchUser();
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined || context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
