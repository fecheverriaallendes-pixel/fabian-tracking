import { User, Transport, Shipment } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { COMMUNES_CHILE, getTransportsForCommune } from '../lib/chile-data';

// Initial Mock Data
const INITIAL_USERS: User[] = [
  { uid: '1', email: 'admin@logitrack.com', nombre: 'Admin User', rol: 'admin', password: '2024' },
  { uid: '2', email: 'operador@logitrack.com', nombre: 'Operador User', rol: 'operador', password: 'password123' },
  { uid: '3', email: 'master@logitrack.com', nombre: 'Administrador Maestro', rol: 'admin', password: '2024' },
  { uid: '4', email: 'f.echeverria.allendes@gmail.com', nombre: 'Fabián Maestro', rol: 'admin', password: '2024' },
];

// Generate Transports from Logic
const generateInitialTransports = (): Transport[] => {
  const transportMap: Record<string, Transport> = {};
  
  // Define base transports
  const baseTransports = [
    { name: "Starken", type: "normal", cost: 4000, time: "24-72 hrs", tarifaRef: "" },
    { name: "Pullman Cargo", type: "cargo", cost: 5000, time: "48-96 hrs", tarifaRef: "" },
    { name: "Blue Express", type: "express", cost: 3500, time: "24-48 hrs", tarifaRef: "" },
    { name: "Varmontt", type: "normal", cost: 4500, time: "24-48 hrs", tarifaRef: "" },
    { name: "Transportes Regionales", type: "cargo", cost: 6000, time: "72+ hrs", tarifaRef: "" },
    { name: "Correos de Chile", type: "normal", cost: 3000, time: "48-72 hrs", tarifaRef: "" },
    { name: "Rapa Nui Cargo", type: "cargo", cost: 15000, time: "7-14 días", tarifaRef: "" },
    // New specific transports
    { name: "Aricargo", type: "cargo", cost: 21000, time: "48-72 hrs", tarifaRef: "$18.000 - $24.000" },
    { name: "JT", type: "normal", cost: 18000, time: "48-72 hrs", tarifaRef: "$16.000 - $20.000" },
    { name: "Transportes Barrios", type: "cargo", cost: 14500, time: "48-72 hrs", tarifaRef: "$13.000 - $16.000" },
    // Batch import from user list
    { name: "Transcargo", type: "cargo", cost: 5000, time: "48-72 hrs", tarifaRef: "" },
    { name: "CyC", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Ate", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Mundaca", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Chevalier", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Diabama", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Manques", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Villa Prat", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "G&P (Gulliver)", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "TVP (Valle Puangue)", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Pullman Bus", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Envias Cargo", type: "cargo", cost: 5000, time: "48-72 hrs", tarifaRef: "" },
    { name: "Ecomex", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "5 Sur", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Transantin", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Condor Bus", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Buses Nilahue", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Andimar", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Pullman del Sur", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Altas Cumbres", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Vilchez", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Talca Paris y Londres", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Buses ContiMar", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Eme Bus", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Cacem", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Buses JAC", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Transmax", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Cruz del Sur", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Zona Sur", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
    { name: "Transchiloé", type: "normal", cost: 4000, time: "24-48 hrs", tarifaRef: "" },
  ];

  // Initialize map
  baseTransports.forEach(t => {
    transportMap[t.name] = {
      id: uuidv4(),
      nombre: t.name,
      regiones: [],
      comunas: [],
      tipoServicio: t.type as any,
      costoBase: t.cost,
      costoPorFardo: Math.round(t.cost * 0.2),
      tarifaReferencia: t.tarifaRef, // Use the provided reference tariff
      tiempoEntrega: t.time,
      telefono: "+56900000000",
      email: `contacto@${t.name.toLowerCase().replace(/\s/g, '')}.cl`,
      activo: true,
      createdAt: new Date().toISOString(),
    };
  });

  // Populate coverage
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

  return Object.values(transportMap);
};

const INITIAL_TRANSPORTS: Transport[] = generateInitialTransports();

const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: '1',
    cliente: 'Empresa A',
    region: 'Metropolitana',
    comuna: 'Santiago',
    direccion: 'Calle Falsa 123',
    cantidadFardos: 5,
    transporteId: '1',
    transporteNombre: 'Transportes Rápidos',
    costoTotal: 10000,
    estado: 'pendiente',
    fecha: { seconds: Date.now() / 1000 }, // Mock Firestore timestamp
    createdBy: '1',
  },
  {
    id: '2',
    cliente: 'Cliente B',
    region: 'Biobío',
    comuna: 'Concepción',
    direccion: 'Av. Siempre Viva 742',
    cantidadFardos: 10,
    transporteId: '2',
    transporteNombre: 'Logística Sur',
    costoTotal: 23000,
    estado: 'entregado',
    fecha: { seconds: (Date.now() - 86400000) / 1000 }, // Yesterday
    createdBy: '1',
  }
];

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Local Storage Keys
const KEYS = {
  USERS: 'logitrack_users',
  TRANSPORTS: 'logitrack_transports',
  SHIPMENTS: 'logitrack_shipments',
  VERSION: 'logitrack_db_version',
};

const DB_VERSION = '1.7'; // Increment to force re-seed and clean users/transports

// Initialize Storage
const initStorage = () => {
  const currentVersion = localStorage.getItem(KEYS.VERSION);
  
  if (currentVersion !== DB_VERSION) {
    // Clear old data to ensure new logic and default users with passwords are applied
    localStorage.removeItem(KEYS.TRANSPORTS);
    localStorage.removeItem(KEYS.USERS);
    localStorage.setItem(KEYS.VERSION, DB_VERSION);
    console.log('Database migrated to version', DB_VERSION);
  }

  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  // Always check if TRANSPORTS is missing (it will be if we just cleared it)
  if (!localStorage.getItem(KEYS.TRANSPORTS)) {
    localStorage.setItem(KEYS.TRANSPORTS, JSON.stringify(INITIAL_TRANSPORTS));
  }
  if (!localStorage.getItem(KEYS.SHIPMENTS)) {
    localStorage.setItem(KEYS.SHIPMENTS, JSON.stringify(INITIAL_SHIPMENTS));
  }
};


initStorage();

// Generic CRUD
const getCollection = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setCollection = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Services
export const dbService = {
  // Users
  getUsers: async (): Promise<User[]> => {
    await delay(500);
    const users = getCollection<User>(KEYS.USERS);
    // Return users without passwords for security in UI
    return users.map(({ password, ...u }) => u as User);
  },

  verifyUser: async (email: string, password: string): Promise<User | null> => {
    await delay(500);
    const users = getCollection<User>(KEYS.USERS);
    const user = users.find(u => u.email === email && (u.password === password || (!u.password && password === 'password123')));
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser as User;
  },

  createUser: async (user: User) => {
    await delay(500);
    const users = getCollection<User>(KEYS.USERS);
    if (users.some(u => u.email === user.email)) {
      throw new Error('El email ya está registrado');
    }
    const newUser = { ...user, uid: uuidv4() };
    setCollection(KEYS.USERS, [...users, newUser]);
    return newUser;
  },

  updateUserPassword: async (uid: string, newPassword: string) => {
    await delay(500);
    const users = getCollection<User>(KEYS.USERS);
    const updatedUsers = users.map(u => u.uid === uid ? { ...u, password: newPassword } : u);
    setCollection(KEYS.USERS, updatedUsers);
  },

  deleteUser: async (uid: string) => {
    await delay(500);
    const users = getCollection<User>(KEYS.USERS);
    // Prevent deleting the last admin
    const admins = users.filter(u => u.rol === 'admin');
    const userToDelete = users.find(u => u.uid === uid);
    if (userToDelete?.rol === 'admin' && admins.length <= 1) {
      throw new Error('No se puede eliminar el último administrador');
    }
    setCollection(KEYS.USERS, users.filter(u => u.uid !== uid));
  },
  
  updateUserRole: async (uid: string, role: 'admin' | 'operador') => {
    await delay(300);
    const users = getCollection<User>(KEYS.USERS);
    const updatedUsers = users.map(u => u.uid === uid ? { ...u, rol: role } : u);
    setCollection(KEYS.USERS, updatedUsers);
  },

  // Transports
  getTransports: async (): Promise<Transport[]> => {
    await delay(500);
    return getCollection<Transport>(KEYS.TRANSPORTS);
  },

  createTransport: async (data: Omit<Transport, 'id' | 'createdAt'>) => {
    await delay(500);
    const transports = getCollection<Transport>(KEYS.TRANSPORTS);
    const newTransport: Transport = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setCollection(KEYS.TRANSPORTS, [...transports, newTransport]);
    return newTransport;
  },

  updateTransport: async (id: string, data: Partial<Transport>) => {
    await delay(500);
    const transports = getCollection<Transport>(KEYS.TRANSPORTS);
    const updatedTransports = transports.map(t => t.id === id ? { ...t, ...data } : t);
    setCollection(KEYS.TRANSPORTS, updatedTransports);
  },

  deleteTransport: async (id: string) => {
    await delay(500);
    const transports = getCollection<Transport>(KEYS.TRANSPORTS);
    setCollection(KEYS.TRANSPORTS, transports.filter(t => t.id !== id));
  },

  // Shipments
  getShipments: async (): Promise<Shipment[]> => {
    await delay(500);
    return getCollection<Shipment>(KEYS.SHIPMENTS);
  },

  createShipment: async (data: Omit<Shipment, 'id' | 'fecha'>) => {
    await delay(500);
    const shipments = getCollection<Shipment>(KEYS.SHIPMENTS);
    const newShipment: Shipment = {
      ...data,
      id: uuidv4(),
      fecha: { seconds: Date.now() / 1000 },
    };
    setCollection(KEYS.SHIPMENTS, [newShipment, ...shipments]);
    return newShipment;
  },

  updateShipment: async (id: string, data: Partial<Shipment>) => {
    await delay(500);
    const shipments = getCollection<Shipment>(KEYS.SHIPMENTS);
    const updatedShipments = shipments.map(s => s.id === id ? { ...s, ...data } : s);
    setCollection(KEYS.SHIPMENTS, updatedShipments);
  },

  deleteShipment: async (id: string) => {
    await delay(500);
    const shipments = getCollection<Shipment>(KEYS.SHIPMENTS);
    setCollection(KEYS.SHIPMENTS, shipments.filter(s => s.id !== id));
  },

  // Backup & Restore
  exportDatabase: async () => {
    await delay(500);
    return {
      users: getCollection<User>(KEYS.USERS),
      transports: getCollection<Transport>(KEYS.TRANSPORTS),
      shipments: getCollection<Shipment>(KEYS.SHIPMENTS),
      version: localStorage.getItem(KEYS.VERSION) || DB_VERSION,
      exportedAt: new Date().toISOString(),
    };
  },

  importDatabase: async (data: any) => {
    await delay(500);
    if (!data.users || !data.transports || !data.shipments) {
      throw new Error('Formato de archivo inválido');
    }
    
    // Validate version compatibility if needed
    
    setCollection(KEYS.USERS, data.users);
    setCollection(KEYS.TRANSPORTS, data.transports);
    setCollection(KEYS.SHIPMENTS, data.shipments);
    if (data.version) {
      localStorage.setItem(KEYS.VERSION, data.version);
    }
    
    return true;
  },
};
