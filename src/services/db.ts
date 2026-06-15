import { User, Transport, Shipment } from '../types';

export const dbService = {
  // Users
  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudieron obtener los usuarios');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error de conexión al obtener usuarios');
    }
  },

  verifyUser: async (email: string, password: string): Promise<User> => {
    try {
      const res = await fetch('/api/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Credenciales inválidas');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  },

  createUser: async (user: User) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo crear el usuario');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear usuario');
    }
  },

  updateUserPassword: async (uid: string, newPassword: string) => {
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, newPassword })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo cambiar la contraseña');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al cambiar contraseña');
    }
  },

  deleteUser: async (uid: string) => {
    try {
      const res = await fetch(`/api/users/${uid}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo eliminar el usuario');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar usuario');
    }
  },
  
  updateUserRole: async (uid: string, role: 'admin' | 'operador') => {
    try {
      const res = await fetch(`/api/users/${uid}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo actualizar el rol');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar rol');
    }
  },

  // Transports
  getTransports: async (): Promise<Transport[]> => {
    try {
      const res = await fetch('/api/transports');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudieron obtener los transportes');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al cargar transportes');
    }
  },

  createTransport: async (data: Omit<Transport, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/transports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo crear el transporte');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear transporte');
    }
  },

  updateTransport: async (id: string, data: Partial<Transport>) => {
    try {
      const res = await fetch(`/api/transports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo actualizar el transporte');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar transporte');
    }
  },

  deleteTransport: async (id: string) => {
    try {
      const res = await fetch(`/api/transports/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo eliminar el transporte');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar transporte');
    }
  },

  // Shipments
  getShipments: async (): Promise<Shipment[]> => {
    try {
      const res = await fetch('/api/shipments');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudieron obtener los despachos');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al cargar despachos');
    }
  },

  createShipment: async (data: Omit<Shipment, 'id' | 'fecha'>) => {
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo registrar el despacho');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al registrar despacho');
    }
  },

  updateShipment: async (id: string, data: Partial<Shipment>) => {
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo actualizar el despacho');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar despacho');
    }
  },

  deleteShipment: async (id: string) => {
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo eliminar el despacho');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar despacho');
    }
  },

  // Backup & Restore
  exportDatabase: async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo exportar la base de datos');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al exportar base de datos');
    }
  },

  importDatabase: async (data: any) => {
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo importar la base de datos');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al importar base de datos');
    }
  },

  rebuildDatabase: async () => {
    try {
      const res = await fetch('/api/rebuild-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo reconstruir la base de datos');
      }
      return await res.json();
    } catch (error: any) {
      throw new Error(error.message || 'Error al reconstruir la base de datos');
    }
  }
};
