import { User, Transport, Shipment } from '../types';

export const dbService = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetch('/api/users');
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudieron obtener los usuarios');
    }
    return res.json();
  },

  verifyUser: async (email: string, password: string): Promise<User> => {
    const res = await fetch('/api/users/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Credenciales inválidas');
    }
    return res.json();
  },

  createUser: async (user: User) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo crear el usuario');
    }
    return res.json();
  },

  updateUserPassword: async (uid: string, newPassword: string) => {
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, newPassword }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo cambiar la contraseña');
    }
  },

  deleteUser: async (uid: string) => {
    const res = await fetch(`/api/users/${uid}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo eliminar el usuario');
    }
  },
  
  updateUserRole: async (uid: string, role: 'admin' | 'operador') => {
    const res = await fetch(`/api/users/${uid}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo actualizar el rol');
    }
  },

  // Transports
  getTransports: async (): Promise<Transport[]> => {
    const res = await fetch('/api/transports');
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudieron obtener los transportes');
    }
    return res.json();
  },

  createTransport: async (data: Omit<Transport, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/transports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo crear el transporte');
    }
    return res.json();
  },

  updateTransport: async (id: string, data: Partial<Transport>) => {
    const res = await fetch(`/api/transports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo actualizar el transporte');
    }
  },

  deleteTransport: async (id: string) => {
    const res = await fetch(`/api/transports/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo eliminar el transporte');
    }
  },

  // Shipments
  getShipments: async (): Promise<Shipment[]> => {
    const res = await fetch('/api/shipments');
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudieron obtener los despachos');
    }
    return res.json();
  },

  createShipment: async (data: Omit<Shipment, 'id' | 'fecha'>) => {
    const res = await fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo registrar el despacho');
    }
    return res.json();
  },

  updateShipment: async (id: string, data: Partial<Shipment>) => {
    const res = await fetch(`/api/shipments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo actualizar el despacho');
    }
  },

  deleteShipment: async (id: string) => {
    const res = await fetch(`/api/shipments/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo eliminar el despacho');
    }
  },

  // Backup & Restore
  exportDatabase: async () => {
    const res = await fetch('/api/backup');
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo exportar la base de datos');
    }
    return res.json();
  },

  importDatabase: async (data: any) => {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo importar la base de datos');
    }
    return true;
  },
};
