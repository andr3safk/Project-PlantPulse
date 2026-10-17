import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch, ApiError, setUnauthorizedHandler } from "../api/client";
import { LoginRequest, LoginResponse } from "../api/types";

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  // Inicializar estado desde localStorage al montar el componente
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('plantpulse_token');
        if (storedToken) {
          const decoded = decodeToken(storedToken);
          if (decoded && !isTokenExpired(storedToken)) {
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            setToken(storedToken);
            setUser({ id: payload.id, email: '', name: '' });
          } else {
            localStorage.removeItem('plantpulse_token');
          }
        }
      } catch (error) {
        console.error('Error al inicializar autenticación:', error);
        localStorage.removeItem('plantpulse_token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Función para decodificar el payload del token JWT sin dependencias externas
  const decodeToken = (token: string): { exp: number; [key: string]: any } | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      // Reemplazar - con + y _ con / para URL-safe base64
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Agregar relleno si es necesario
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      
      const decoded = atob(padded);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('plantpulse_token');
    localStorage.removeItem('plantpulse_user');
    setToken(null);
    setUser(null);
  };

  // Función para login
  const login = async (email: string, password: string): Promise<void> => {
    try {
      const loginData: LoginRequest = { email, password };
      const response = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: loginData,
      });
      
      localStorage.setItem('plantpulse_token', response.token);
      
      const payload = JSON.parse(atob(response.token.split('.')[1]));
      setToken(response.token);
      setUser({ id: payload.id, email: '', name: '' });
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Error al iniciar sesión');
    }
  };

  // Función para verificar si el token está expirado
  const isTokenExpired = (token: string): boolean => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  };

  // Efecto para verificar expiración del token periódicamente
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiration = () => {
      if (isTokenExpired(token)) {
        logout();
      }
    };

    // Verificar al montar
    checkTokenExpiration();
    
    // Verificar cada minuto
    const interval = setInterval(checkTokenExpiration, 60000);
    
    return () => clearInterval(interval);
  }, [token]);

  const isAuthenticated = !!token && !isTokenExpired(token || '');

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}