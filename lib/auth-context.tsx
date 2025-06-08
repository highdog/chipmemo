'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, User } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: { username?: string; preferences?: Partial<User['preferences']> }) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查用户是否已登录
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authApi.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data.user);
      } else {
        // Token无效，清除本地存储
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authApi.login({ email, password });
      
      if (response.success && response.data) {
        const { token, user: userData } = response.data;
        localStorage.setItem('auth_token', token);
        setUser(userData);
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || '登录失败',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败',
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authApi.register({ username, email, password });
      
      if (response.success && response.data) {
        const { token, user: userData } = response.data;
        localStorage.setItem('auth_token', token);
        setUser(userData);
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || '注册失败',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '注册失败',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    authApi.logout();
    setUser(null);
  };

  const updateUser = async (data: { username?: string; preferences?: Partial<User['preferences']> }) => {
    try {
      const response = await authApi.updateProfile(data);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || '更新失败',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
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

// 高阶组件：保护需要认证的页面
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      // 重定向到登录页面
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }
    
    return <Component {...props} />;
  };
}