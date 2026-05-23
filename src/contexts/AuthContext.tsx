import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DEFAULT_USER: User = {
  uid: 'fabian',
  email: 'f.echeverria.allendes@gmail.com',
  nombre: 'Fabián Maestro',
  rol: 'admin'
};

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_USER,
  loading: false,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_USER);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Al utilizar el link directo, ingresa automáticamente con privilegios de Administrador
    setUser(DEFAULT_USER);
    setLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setUser(DEFAULT_USER);
  };

  const logout = async () => {
    toast.info('Acceso de libre ingreso activo', {
      description: 'Cualquier persona que visite el enlace tiene acceso completo. No se requiere inicio ni cierre de sesión.',
      duration: 5000
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
