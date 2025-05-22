
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (userType: 'google' | 'apple') => void;
  logout: () => void;
  user: { name: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true); // To prevent flicker on load
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('weatherugo-auth');
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        setIsAuthenticated(authData.isAuthenticated);
        setUser(authData.user);
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
      localStorage.removeItem('weatherugo-auth');
    }
    setIsLoading(false);
  }, []);

  const login = (userType: 'google' | 'apple') => {
    const mockUser = { name: userType === 'google' ? 'Google User' : 'Apple User (Simulated)' };
    setIsAuthenticated(true);
    setUser(mockUser);
    try {
      localStorage.setItem('weatherugo-auth', JSON.stringify({ isAuthenticated: true, user: mockUser }));
    } catch (error) {
      console.error("Failed to save auth data to localStorage", error);
    }
    router.push('/');
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    try {
      localStorage.removeItem('weatherugo-auth');
    } catch (error) {
      console.error("Failed to remove auth data from localStorage", error);
    }
    if (pathname !== '/login') {
        router.push('/login');
    }
  };
  
  if (isLoading) {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
