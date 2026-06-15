import { User, Transport, Shipment } from '../types';
import { COMMUNES_CHILE, getTransportsForCommune } from '../lib/chile-data';

// Persistent fallback state
let useClientFallback = false;

// Helper to safely get and set localStorage JSON structures
function getStorage<T>(key: string, initialValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (e) {
    return initialValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

// Replicate the exact transport map assembly from the server-side to guarantee client completeness
function generateClientInitialTransports(): Transport[] {
  const transportMap: Record<string, Transport> = {};
  const baseTransports = [
    { name: "Starken", type: "normal" as const, cost: 4000, time: "24-72 hrs", tarifaRef: "" },
    { name: "Pullman Cargo", type: "cargo" as const, cost: 5000, time: "48-96 hrs", tarifaRef: "" },
    { name: "Blue Express", type: "express" as const, cost: 3500, time: "24-48 hrs", tarifaRef: "" },
    { name: "Varmontt", type: "normal" as const, cost: 4500, time: "24-48 hrs", tarifaRef: "" },
    { name: "Transportes Regionales", type: "cargo" as const, cost: 6000, time: "72+ hrs", tarifaRef: "" },
    { name: "Correos de Chile", type: "normal" as const, cost: 3000, time: "48-72 hrs", tarifaRef: "" },
    { name: "Rapa Nui Cargo", type: "cargo" as const, cost: 15000, time: "7-14 días", tarifaRef: "" },
    { name: "Aricargo", type: "cargo" as const, cost: 21000, time: "48-72 hrs", tarifaRef: "$18.000 - $24.000" },
    { name: "JT", type: "normal" as const, cost: 18000, time: "48-72 hrs", tarifaRef: "$16.000 - $20.000" },
    { name: "Transportes Barrios", type: "cargo" as const, cost: 14500, time: "48-72 hrs", tarifaRef: "$13.000 - $16.000" },
    { name: "Transcargo", type: "cargo" as const, cost: 5000, time: "48-72 hrs", tarifaRef: "" },
    { name: "CyC", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Ate", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Mundaca", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Chevalier", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Diabama", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Manques", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Villa Prat", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "G&P (Gulliver)", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "TVP (Valle Puangue)", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Pullman Bus", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Envias Cargo", type: "cargo" as const, cost: 5000, time: "48-72 hrs", tarifaRef: "" },
    { name: "Ecomex", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "5 Sur", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Transantin", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Condor Bus", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Buses Nilahue", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Andimar", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Pullman del Sur", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Altas Cumbres", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Vilchez", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Talca Paris y Londres", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Buses ContiMar", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Eme Bus", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Cacem", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Buses JAC", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Transmax", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Cruz del Sur", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Zona Sur", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Transchiloé", type: "normal" as const, cost: 4000, time: "24-48 hrs", tarifaRef: "" },
  ];

  baseTransports.forEach((t) => {
    const stableId = `carrier-${t.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    transportMap[t.name] = {
      id: stableId,
      nombre: t.name,
      regiones: [] as string[],
      comunas: [] as string[],
      tipoServicio: t.type,
      costoBase: t.cost,
      costoPorFardo: Math.round(t.cost * 0.2),
      tarifaReferencia: t.tarifaRef,
      tiempoEntrega: t.time,
      telefono: "+56900000000",
      email: `contacto@${t.name.toLowerCase().replace(/\s/g, '')}.cl`,
      activo: true,
      observaciones: "",
      createdAt: new Date().toISOString(),
    };
  });

  COMMUNES_CHILE.forEach(item => {
    const transports = getTransportsForCommune(item.r, item.c);
    transports.forEach(tName => {
      if (transportMap[tName]) {
        if (!transportMap[tName].regiones.includes(item.r)) {
          transportMap[tName].regiones.push(item.r);
        }
        if (!transportMap[tName].comunas.includes(item.c)) {
          transportMap[tName].comunas.push(item.c);
        }
      }
    });
  });

  // Ensure fully-covered fallbacks if any list is empty
  const allRegions = Array.from(new Set(COMMUNES_CHILE.map(c => c.r)));
  const allCommunes = COMMUNES_CHILE.map(c => c.c);
  
  Object.keys(transportMap).forEach(key => {
    if (transportMap[key].comunas.length === 0) {
      transportMap[key].regiones = [...allRegions];
      transportMap[key].comunas = [...allCommunes];
    }
  });

  return Object.values(transportMap);
}

// Performs active localStorage setup if it hasn't been seeded yet
function initializeFallbackDB(): void {
  if (!localStorage.getItem('ft_fallback_seeded')) {
    const defaultUsers: User[] = [
      { uid: 'fabian', email: 'f.echeverria.allendes@gmail.com', nombre: 'Fabián Maestro', rol: 'admin', password: '2024' },
      { uid: 'admin', email: 'admin@logitrack.com', nombre: 'Administrador', rol: 'admin', password: '2024' },
      { uid: 'operador', email: 'operador@logitrack.com', nombre: 'Operador User', rol: 'operador', password: '2024' },
      { uid: 'master', email: 'master@logitrack.com', nombre: 'Administrador Maestro', rol: 'admin', password: '2024' }
    ];
    const defaultTransports = generateClientInitialTransports();
    const defaultShipments: Shipment[] = [
      {
        id: 'shipment-initial-1',
        cliente: 'Empresa Demo',
        region: 'RM - Metropolitana',
        comuna: 'Santiago',
        direccion: 'Av. Providencia 1450',
        cantidadFardos: 12,
        transporteId: 'carrier-starken',
        transporteNombre: 'Starken',
        costoTotal: 13600,
        estado: 'pendiente',
        fecha: { seconds: Math.floor(Date.now() / 1000) },
        createdBy: 'fabian'
      }
    ];

    setStorage('ft_users', defaultUsers);
    setStorage('ft_transports', defaultTransports);
    setStorage('ft_shipments', defaultShipments);
    localStorage.setItem('ft_fallback_seeded', 'true');
    console.log('[LOCAL STORAGE DB] Seeding high-availability browser database successfully.');
  }
}

// Intercepts connection issues and enables the fallback mode permanently in the session
function handleApiError(err: any): void {
  console.warn('[DB SERVICE] API connection unavailable or 404. Falling back to high-durability browser localStorage:', err.message || err);
  useClientFallback = true;
  initializeFallbackDB();
}

// Fallback clientside database methods
const fallbackMethods = {
  getUsers: async (): Promise<User[]> => {
    initializeFallbackDB();
    return getStorage<User[]>('ft_users', []);
  },

  verifyUser: async (email: string, password: string): Promise<User> => {
    initializeFallbackDB();
    const users = getStorage<User[]>('ft_users', []);
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) {
      throw new Error('Credenciales inválidas');
    }
    return found;
  },

  createUser: async (user: User): Promise<any> => {
    initializeFallbackDB();
    const users = getStorage<User[]>('ft_users', []);
    if (users.some(u => u.uid === user.uid || u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new Error('El usuario o email ya existe.');
    }
    const newUser = { ...user, password: user.password || '2024' };
    users.push(newUser);
    setStorage('ft_users', users);
    return { success: true, user: newUser };
  },

  updateUserPassword: async (uid: string, newPassword: string): Promise<any> => {
    initializeFallbackDB();
    const users = getStorage<User[]>('ft_users', []);
    const idx = users.findIndex(u => u.uid === uid);
    if (idx === -1) throw new Error('Usuario no encontrado');
    users[idx].password = newPassword;
    setStorage('ft_users', users);
    return { success: true };
  },

  deleteUser: async (uid: string): Promise<any> => {
    initializeFallbackDB();
    const users = getStorage<User[]>('ft_users', []);
    const filtered = users.filter(u => u.uid !== uid);
    setStorage('ft_users', filtered);
    return { success: true };
  },

  updateUserRole: async (uid: string, role: 'admin' | 'operador'): Promise<any> => {
    initializeFallbackDB();
    const users = getStorage<User[]>('ft_users', []);
    const idx = users.findIndex(u => u.uid === uid);
    if (idx === -1) throw new Error('Usuario no encontrado');
    users[idx].rol = role;
    setStorage('ft_users', users);
    return { success: true };
  },

  getTransports: async (): Promise<Transport[]> => {
    initializeFallbackDB();
    return getStorage<Transport[]>('ft_transports', []);
  },

  createTransport: async (data: Omit<Transport, 'id' | 'createdAt'>): Promise<Transport> => {
    initializeFallbackDB();
    const transports = getStorage<Transport[]>('ft_transports', []);
    const newTransport: Transport = {
      ...data,
      id: `carrier-custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    transports.push(newTransport);
    setStorage('ft_transports', transports);
    return newTransport;
  },

  updateTransport: async (id: string, data: Partial<Transport>): Promise<Transport> => {
    initializeFallbackDB();
    const transports = getStorage<Transport[]>('ft_transports', []);
    const idx = transports.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Transporte no encontrado');
    transports[idx] = { ...transports[idx], ...data };
    setStorage('ft_transports', transports);
    return transports[idx];
  },

  deleteTransport: async (id: string): Promise<any> => {
    initializeFallbackDB();
    const transports = getStorage<Transport[]>('ft_transports', []);
    const filtered = transports.filter(t => t.id !== id);
    setStorage('ft_transports', filtered);
    return { success: true };
  },

  getShipments: async (): Promise<Shipment[]> => {
    initializeFallbackDB();
    return getStorage<Shipment[]>('ft_shipments', []);
  },

  createShipment: async (data: Omit<Shipment, 'id' | 'fecha'>): Promise<Shipment> => {
    initializeFallbackDB();
    const shipments = getStorage<Shipment[]>('ft_shipments', []);
    const newShipment: Shipment = {
      ...data,
      id: `shipment-${Date.now()}`,
      fecha: { seconds: Math.floor(Date.now() / 1000) }
    };
    shipments.push(newShipment);
    setStorage('ft_shipments', shipments);
    return newShipment;
  },

  updateShipment: async (id: string, data: Partial<Shipment>): Promise<Shipment> => {
    initializeFallbackDB();
    const shipments = getStorage<Shipment[]>('ft_shipments', []);
    const idx = shipments.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Despacho no encontrado');
    shipments[idx] = { ...shipments[idx], ...data };
    setStorage('ft_shipments', shipments);
    return shipments[idx];
  },

  deleteShipment: async (id: string): Promise<any> => {
    initializeFallbackDB();
    const shipments = getStorage<Shipment[]>('ft_shipments', []);
    const filtered = shipments.filter(s => s.id !== id);
    setStorage('ft_shipments', filtered);
    return { success: true };
  },

  exportDatabase: async (): Promise<any> => {
    initializeFallbackDB();
    const users = getStorage<User[]>('ft_users', []);
    const transports = getStorage<Transport[]>('ft_transports', []);
    const shipments = getStorage<Shipment[]>('ft_shipments', []);
    return { users, transports, shipments };
  },

  importDatabase: async (data: any): Promise<any> => {
    if (data.users) setStorage('ft_users', data.users);
    if (data.transports) setStorage('ft_transports', data.transports);
    if (data.shipments) setStorage('ft_shipments', data.shipments);
    localStorage.setItem('ft_fallback_seeded', 'true');
    return { success: true };
  },

  rebuildDatabase: async (): Promise<any> => {
    localStorage.removeItem('ft_fallback_seeded');
    initializeFallbackDB();
    return { success: true, count: getStorage<Transport[]>('ft_transports', []).length };
  }
};

// Hybrid Database Service Layer with transparent request-level proxying
export const dbService = {
  getUsers: async (): Promise<User[]> => {
    if (useClientFallback) return fallbackMethods.getUsers();
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.getUsers();
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudieron obtener los usuarios');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.getUsers();
    }
  },

  verifyUser: async (email: string, password: string): Promise<User> => {
    if (useClientFallback) return fallbackMethods.verifyUser(email, password);
    try {
      const res = await fetch('/api/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.verifyUser(email, password);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Credenciales inválidas');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.verifyUser(email, password);
    }
  },

  createUser: async (user: User): Promise<any> => {
    if (useClientFallback) return fallbackMethods.createUser(user);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.createUser(user);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo crear el usuario');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.createUser(user);
    }
  },

  updateUserPassword: async (uid: string, newPassword: string): Promise<any> => {
    if (useClientFallback) return fallbackMethods.updateUserPassword(uid, newPassword);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, newPassword })
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.updateUserPassword(uid, newPassword);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo cambiar la contraseña');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.updateUserPassword(uid, newPassword);
    }
  },

  deleteUser: async (uid: string): Promise<any> => {
    if (useClientFallback) return fallbackMethods.deleteUser(uid);
    try {
      const res = await fetch(`/api/users/${uid}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.deleteUser(uid);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo eliminar el usuario');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.deleteUser(uid);
    }
  },
  
  updateUserRole: async (uid: string, role: 'admin' | 'operador'): Promise<any> => {
    if (useClientFallback) return fallbackMethods.updateUserRole(uid, role);
    try {
      const res = await fetch(`/api/users/${uid}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.updateUserRole(uid, role);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo actualizar el rol');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.updateUserRole(uid, role);
    }
  },

  getTransports: async (): Promise<Transport[]> => {
    if (useClientFallback) return fallbackMethods.getTransports();
    try {
      const res = await fetch('/api/transports');
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.getTransports();
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudieron obtener los transportes');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.getTransports();
    }
  },

  createTransport: async (data: Omit<Transport, 'id' | 'createdAt'>): Promise<Transport> => {
    if (useClientFallback) return fallbackMethods.createTransport(data);
    try {
      const res = await fetch('/api/transports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.createTransport(data);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo crear el transporte');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.createTransport(data);
    }
  },

  updateTransport: async (id: string, data: Partial<Transport>): Promise<Transport> => {
    if (useClientFallback) return fallbackMethods.updateTransport(id, data);
    try {
      const res = await fetch(`/api/transports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.updateTransport(id, data);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo actualizar el transporte');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.updateTransport(id, data);
    }
  },

  deleteTransport: async (id: string): Promise<any> => {
    if (useClientFallback) return fallbackMethods.deleteTransport(id);
    try {
      const res = await fetch(`/api/transports/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.deleteTransport(id);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo eliminar el transporte');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.deleteTransport(id);
    }
  },

  getShipments: async (): Promise<Shipment[]> => {
    if (useClientFallback) return fallbackMethods.getShipments();
    try {
      const res = await fetch('/api/shipments');
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.getShipments();
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudieron obtener los despachos');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.getShipments();
    }
  },

  createShipment: async (data: Omit<Shipment, 'id' | 'fecha'>): Promise<Shipment> => {
    if (useClientFallback) return fallbackMethods.createShipment(data);
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.createShipment(data);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo registrar el despacho');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.createShipment(data);
    }
  },

  updateShipment: async (id: string, data: Partial<Shipment>): Promise<Shipment> => {
    if (useClientFallback) return fallbackMethods.updateShipment(id, data);
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.updateShipment(id, data);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo actualizar el despacho');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.updateShipment(id, data);
    }
  },

  deleteShipment: async (id: string): Promise<any> => {
    if (useClientFallback) return fallbackMethods.deleteShipment(id);
    try {
      const res = await fetch(`/api/shipments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.deleteShipment(id);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo eliminar el despacho');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.deleteShipment(id);
    }
  },

  exportDatabase: async (): Promise<any> => {
    if (useClientFallback) return fallbackMethods.exportDatabase();
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.exportDatabase();
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo exportar la base de datos');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.exportDatabase();
    }
  },

  importDatabase: async (data: any): Promise<any> => {
    if (useClientFallback) return fallbackMethods.importDatabase(data);
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.importDatabase(data);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo importar la base de datos');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.importDatabase(data);
    }
  },

  rebuildDatabase: async (): Promise<any> => {
    if (useClientFallback) return fallbackMethods.rebuildDatabase();
    try {
      const res = await fetch('/api/rebuild-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        if (res.status === 404) {
          handleApiError(new Error('API 404 Not Found'));
          return fallbackMethods.rebuildDatabase();
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo reconstruir la base de datos');
      }
      return await res.json();
    } catch (error: any) {
      handleApiError(error);
      return fallbackMethods.rebuildDatabase();
    }
  }
};
