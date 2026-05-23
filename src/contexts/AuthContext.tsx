import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { dbService } from '../services/db';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session
    const storedUser = localStorage.getItem('logitrack_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    if (!password) {
      throw new Error('La contraseña es requerida');
    }

    const user = await dbService.verifyUser(email, password);
    localStorage.setItem('logitrack_session', JSON.stringify(user));
    setUser(user);
  };

  const logout = async () => {
    localStorage.removeItem('logitrack_session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
