import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearTokens, hasToken, setTokens } from '../auth';
import { getCurrentUser, loginUser } from '../api/client';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.data);
    } catch {
      clearTokens();
      setUser(null);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (hasToken()) {
        await refreshUser();
      }
      setLoading(false);
    };

    bootstrap();
  }, []);

  const login = async (username: string, password: string) => {
    const tokenResponse = await loginUser(username, password);
    setTokens(tokenResponse.data.access, tokenResponse.data.refresh);

    const profileResponse = await getCurrentUser();
    setUser(profileResponse.data);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
