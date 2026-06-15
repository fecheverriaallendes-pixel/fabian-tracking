import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { COMMUNES_CHILE, getTransportsForCommune } from './src/lib/chile-data.js';
import dotenv from 'dotenv';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

dotenv.config();

// Firebase initialization
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let useFirestore = false;
let fdb: any = null;

// Helper to make Firestore queries fast-failing, preventing server-side hangs
function withTimeout<T>(promise: Promise<T>, timeoutMs = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firestore query timeout')), timeoutMs))
  ]);
}

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const fapp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    fdb = getFirestore(fapp);
    useFirestore = true;
    console.log('[FIREBASE SERVER] Initialized online Firestore successfully!');
  } catch (err: any) {
    console.error('[FIREBASE SERVER] Failed to initialize Firestore online SDK:', err.message);
  }
} else {
  console.log('[FIREBASE SERVER] Standing by on local SQLite fallback because Firestore credentials are not set.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Global diagnostics file logging tool to inspect browser-thrown API issues
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
      if (res.statusCode >= 400 || req.path.startsWith('/api/')) {
        try {
          const sample = (typeof body === 'string' && body.length > 0) ? body.substring(0, 150) : '';
          const logLine = `[${new Date().toISOString()}] ${req.method} ${req.path} - Status ${res.statusCode} - Sample: ${sample}\n`;
          fs.appendFileSync('server-errors.txt', logLine);
        } catch (e) {}
      }
      return originalSend.apply(this, arguments as any);
    };
    next();
  });

  // Verify online Firestore database accessibility. If it's slower than 1.5s or blocked, fall back instantly to high-availability SQLite
  if (useFirestore && fdb) {
    try {
      console.log('[FIREBASE CONNECTIVITY] Testing Firestore connection with a 1500ms timeout...');
      const checkPromise = getDocs(collection(fdb, 'transports'));
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Unreachable/sandbox socket block')), 1500));
      await Promise.race([checkPromise, timeoutPromise]);
      console.log('[FIREBASE CONNECTIVITY] Firestore online DB responded successfully. Online synchronization active.');
    } catch (err: any) {
      console.warn('[FIREBASE CONNECTIVITY] Firestore is unresponsive/blocked. Switching permanently to local high-performance SQLite fallback:', err.message);
      useFirestore = false;
    }
  }

  // Initialize SQLite database
  const db = new Database('sqlite.db');

  // Enable WAL mode for high performance
  db.pragma('journal_mode = WAL');

  // Create tables if they do not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      nombre TEXT,
      rol TEXT,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS transports (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      regiones TEXT,
      comunas TEXT,
      tipoServicio TEXT,
      costoBase INTEGER,
      costoPorFardo INTEGER,
      tarifaReferencia TEXT,
      tiempoEntrega TEXT,
      telefono TEXT,
      email TEXT,
      activo INTEGER,
      observaciones TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      cliente TEXT,
      region TEXT,
      comuna TEXT,
      direccion TEXT,
      cantidadFardos INTEGER,
      transporteId TEXT,
      transporteNombre TEXT,
      costoTotal INTEGER,
      estado TEXT,
      fecha TEXT,
      createdBy TEXT
    );
  `);

  // Safe Database Migrations for schema stability (since SQLite doesn't update column lists dynamically on existing tables)
  try {
    db.exec('ALTER TABLE users ADD COLUMN password TEXT;');
    console.log('[SCHEMA MIGRATION] "password" column added successfully to "users" table.');
  } catch (err: any) {
    if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
      console.warn('[SCHEMA MIGRATION] Note on "users.password" column check:', err.message);
    }
  }

  try {
    db.exec('ALTER TABLE shipments ADD COLUMN createdBy TEXT;');
    console.log('[SCHEMA MIGRATION] "createdBy" column added successfully to "shipments" table.');
  } catch (err: any) {
    if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
      console.warn('[SCHEMA MIGRATION] Note on "shipments.createdBy" column check:', err.message);
    }
  }

  try {
    db.exec('ALTER TABLE transports ADD COLUMN observaciones TEXT;');
    console.log('[SCHEMA MIGRATION] "observaciones" column added successfully to "transports" table.');
  } catch (err: any) {
    if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
      console.warn('[SCHEMA MIGRATION] Note on "transports.observaciones" column check:', err.message);
    }
  }

  // Seeding & Enforcing Clean Username-based Users
  const userCountRes = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCountRes.count === 0) {
    console.log('[AUTH DB] No users found. Seeding default flexible accounts...');
    const INITIAL_USERS = [
      { uid: 'fabian', email: 'f.echeverria.allendes@gmail.com', nombre: 'Fabián Maestro', rol: 'admin', password: '2024' },
      { uid: 'admin', email: 'admin@logitrack.com', nombre: 'Administrador', rol: 'admin', password: '2024' },
      { uid: 'operador', email: 'operador@logitrack.com', nombre: 'Operador User', rol: 'operador', password: '2024' },
      { uid: 'master', email: 'master@logitrack.com', nombre: 'Administrador Maestro', rol: 'admin', password: '2024' },
    ];

    const insertUser = db.prepare('INSERT INTO users (uid, email, nombre, rol, password) VALUES (?, ?, ?, ?, ?)');

    const transInsert = db.transaction((users) => {
      for (const u of users) {
        insertUser.run(u.uid, u.email, u.nombre, u.rol, u.password);
        console.log(`[AUTH DB] Seeded flexible account: username="${u.uid}" email="${u.email}" (Password: "${u.password}")`);
      }
    });
    
    transInsert(INITIAL_USERS);
    console.log('Seeded and synchronized flexible default users successfully.');
  } else {
    console.log('[AUTH DB] Users already exist in SQLite. Skipping seeding to prevent wiping modifications.');
  }

  const generateInitialTransports = () => {
    const transportMap: Record<string, any> = {};
    const baseTransports = [
      { name: "Starken", type: "normal", cost: 4000, time: "24-72 hrs", tarifaRef: "" },
      { name: "Pullman Cargo", type: "cargo", cost: 5000, time: "48-96 hrs", tarifaRef: "" },
      { name: "Blue Express", type: "express", cost: 3500, time: "24-48 hrs", tarifaRef: "" },
      { name: "Varmontt", type: "normal", cost: 4500, time: "24-48 hrs", tarifaRef: "" },
      { name: "Transportes Regionales", type: "cargo", cost: 6000, time: "72+ hrs", tarifaRef: "" },
      { name: "Correos de Chile", type: "normal", cost: 3000, time: "48-72 hrs", tarifaRef: "" },
      { name: "Rapa Nui Cargo", type: "cargo", cost: 15000, time: "7-14 días", tarifaRef: "" },
      { name: "Aricargo", type: "cargo", cost: 21000, time: "48-72 hrs", tarifaRef: "$18.000 - $24.000" },
      { name: "JT", type: "normal", cost: 18000, time: "48-72 hrs", tarifaRef: "$16.000 - $20.000" },
      { name: "Transportes Barrios", type: "cargo", cost: 14500, time: "48-72 hrs", tarifaRef: "$13.000 - $16.000" },
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

    baseTransports.forEach(t => {
      transportMap[t.name] = {
        id: uuidv4(),
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
        activo: 1,
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

    // Provide complete national coverage for any transports not explicitly restricted by region mapping
    const allRegions = Array.from(new Set(COMMUNES_CHILE.map(c => c.r)));
    const allCommunes = COMMUNES_CHILE.map(c => c.c);
    
    Object.keys(transportMap).forEach(key => {
      if (transportMap[key].comunas.length === 0) {
        transportMap[key].regiones = [...allRegions];
        transportMap[key].comunas = [...allCommunes];
      }
    });

    return Object.values(transportMap);
  };

  // Seeding Initial Transports if Empty
  const transportCountRes = db.prepare('SELECT count(*) as count FROM transports').get() as { count: number };
  if (transportCountRes.count === 0) {
    console.log('[SEED] No transports found in SQLite database. Creating 40+ default carriers...');
    const initialTransports = generateInitialTransports();
    const insertTransport = db.prepare(`
      INSERT INTO transports (
        id, nombre, regiones, comunas, tipoServicio, costoBase, costoPorFardo,
        tarifaReferencia, tiempoEntrega, telefono, email, activo, observaciones, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transInsertTransports = db.transaction((transports) => {
      for (const t of transports) {
        insertTransport.run(
          t.id,
          t.nombre,
          JSON.stringify(t.regiones),
          JSON.stringify(t.comunas),
          t.tipoServicio,
          t.costoBase,
          t.costoPorFardo,
          t.tarifaReferencia,
          t.tiempoEntrega,
          t.telefono,
          t.email,
          t.activo,
          t.observaciones || '',
          t.createdAt
        );
      }
    });
    
    transInsertTransports(initialTransports);
    console.log('Seeded', initialTransports.length, 'transports.');
  } else {
    console.log('[SEED] Transports already exist in SQLite. Skipping seeding.');
  }

  // Seeding Initial Shipments if Empty
  const shipmentCountRes = db.prepare('SELECT count(*) as count FROM shipments').get() as { count: number };
  if (shipmentCountRes.count === 0) {
    const INITIAL_SHIPMENTS = [
      {
        id: '1',
        cliente: 'Empresa A',
        region: 'Metropolitana',
        comuna: 'Santiago',
        direccion: 'Calle Falsa 123',
        cantidadFardos: 5,
        transporteId: '1',
        transporteNombre: 'Starken',
        costoTotal: 10000,
        estado: 'pendiente',
        fecha: JSON.stringify({ seconds: Date.now() / 1000 }),
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
        transporteNombre: 'Blue Express',
        costoTotal: 23000,
        estado: 'entregado',
        fecha: JSON.stringify({ seconds: (Date.now() - 86400000) / 1000 }),
        createdBy: '1',
      }
    ];

    const insertShipment = db.prepare(`
      INSERT INTO shipments (
        id, cliente, region, comuna, direccion, cantidadFardos, transporteId,
        transporteNombre, costoTotal, estado, fecha, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transInsertShipments = db.transaction((shipments) => {
      for (const s of shipments) {
        insertShipment.run(
          s.id,
          s.cliente,
          s.region,
          s.comuna,
          s.direccion,
          s.cantidadFardos,
          s.transporteId,
          s.transporteNombre,
          s.costoTotal,
          s.estado,
          s.fecha,
          s.createdBy
        );
      }
    });

    transInsertShipments(INITIAL_SHIPMENTS);
    console.log('Shipments seeded.');
  }


  /* API ENDPOINTS */

  // 1. Get Users
  app.get('/api/users', async (req, res) => {
    if (useFirestore) {
      try {
        const snapshot = await getDocs(collection(fdb, 'users'));
        const users: any[] = [];
        snapshot.forEach(docSnap => {
          const u = docSnap.data();
          users.push({ uid: docSnap.id, email: u.email, nombre: u.nombre, rol: u.rol });
        });
        return res.json(users);
      } catch (err: any) {
        console.warn('[FIREBASE] Error reading users, falling back to SQLite:', err.message);
      }
    }
    try {
      const users = db.prepare('SELECT uid, email, nombre, rol FROM users').all();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Verify User Credentials
  app.post('/api/users/verify', async (req, res) => {
    let { email, password } = req.body;
    if (email) email = email.trim();
    if (password) password = password.trim();
    console.log(`[AUTH DEBUG] Attempting verify: email="${email}", password="${password}"`);
    
    if (useFirestore) {
      try {
        // Check by doc ID
        const docRef = doc(fdb, 'users', email.toLowerCase().replace(/[^a-z0-9]/g, '_'));
        let docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          // Try username directly
          const docRef2 = doc(fdb, 'users', email);
          docSnap = await getDoc(docRef2);
        }
        
        let userData: any = null;
        if (docSnap.exists()) {
          userData = docSnap.data();
        } else {
          const qSnapshot = await getDocs(collection(fdb, 'users'));
          qSnapshot.forEach(d => {
            const data = d.data();
            if (data.email && data.email.toLowerCase() === email.toLowerCase()) {
              userData = data;
            }
          });
        }

        if (userData) {
          const match = String(userData.password).trim() === String(password).trim() || (!userData.password && String(password).trim() === '2024');
          if (match) {
            const { password: _, ...safeUser } = userData;
            return res.json(safeUser);
          }
          return res.status(401).json({ error: 'La contraseña ingresada es incorrecta' });
        }
      } catch (err: any) {
        console.warn('[FIREBASE] Auth verify error, trying SQLite fallback:', err.message);
      }
    }

    try {
      // Find case-insensitive match for either email or uid to be extremely forgiving
      const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(uid) = LOWER(?)').get(email, email) as any;
      console.log(`[AUTH DEBUG] Found user in database:`, user);
      
      if (!user) {
        console.log(`[AUTH DEBUG] User not found for: ${email}`);
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      
      // Password check matching database
      const match = String(user.password).trim() === String(password).trim() || (!user.password && String(password).trim() === '2024');
      console.log(`[AUTH DEBUG] Password check: match=${match} (user.password="${user.password}", input.password="${password}")`);
      
      if (match) {
        const { password: _, ...safeUser } = user;
        return res.json(safeUser);
      }
      
      res.status(401).json({ error: 'La contraseña ingresada es incorrecta' });
    } catch (error: any) {
      console.error(`[AUTH DEBUG] Error in verifyUser:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Create User
  app.post('/api/users', async (req, res) => {
    const { email, nombre, rol, password } = req.body;
    const uid = req.body.uid || email.toLowerCase().replace(/[^a-z0-9]/g, '_') || uuidv4();
    const newUser = { uid, email, nombre, rol, password: password || '2024' };

    if (useFirestore) {
      try {
        await setDoc(doc(fdb, 'users', uid), newUser, { merge: true });
        try {
          db.prepare('INSERT OR REPLACE INTO users (uid, email, nombre, rol, password) VALUES (?, ?, ?, ?, ?)')
            .run(uid, email, nombre, rol, newUser.password);
        } catch (e) {}
        return res.json({ uid, email, nombre, rol });
      } catch (err: any) {
        console.warn('[FIREBASE] Create user error, fallback to SQLite:', err.message);
      }
    }

    try {
      const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
      if (exists) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      db.prepare('INSERT INTO users (uid, email, nombre, rol, password) VALUES (?, ?, ?, ?, ?)')
        .run(uid, email, nombre, rol, password || '2024');
      res.json({ uid, email, nombre, rol });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Update Password
  app.post('/api/users/change-password', async (req, res) => {
    const { uid, newPassword } = req.body;
    if (useFirestore) {
      try {
        await setDoc(doc(fdb, 'users', uid), { password: newPassword }, { merge: true });
        try {
          db.prepare('UPDATE users SET password = ? WHERE uid = ?').run(newPassword, uid);
        } catch (e) {}
        return res.json({ success: true });
      } catch (err: any) {
        console.warn('[FIREBASE] Change password error, fallback to SQLite:', err.message);
      }
    }
    try {
      db.prepare('UPDATE users SET password = ? WHERE uid = ?').run(newPassword, uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Delete User
  app.delete('/api/users/:uid', async (req, res) => {
    const { uid } = req.params;
    if (useFirestore) {
      try {
        await deleteDoc(doc(fdb, 'users', uid));
        try {
          db.prepare('DELETE FROM users WHERE uid = ?').run(uid);
        } catch (e) {}
        return res.json({ success: true });
      } catch (err: any) {
        console.warn('[FIREBASE] Delete user error, fallback to SQLite:', err.message);
      }
    }
    try {
      // Prevent last admin deletion
      const admins = db.prepare("SELECT count(*) as count FROM users WHERE rol = 'admin'").get() as { count: number };
      const user = db.prepare("SELECT rol FROM users WHERE uid = ?").get(uid) as { rol: string } | undefined;
      
      if (user?.rol === 'admin' && admins.count <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el último administrador' });
      }
      db.prepare('DELETE FROM users WHERE uid = ?').run(uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Update User Role
  app.put('/api/users/:uid/role', async (req, res) => {
    const { uid } = req.params;
    const { role } = req.body;
    if (useFirestore) {
      try {
        await setDoc(doc(fdb, 'users', uid), { rol: role }, { merge: true });
        try {
          db.prepare('UPDATE users SET rol = ? WHERE uid = ?').run(role, uid);
        } catch (e) {}
        return res.json({ success: true });
      } catch (err: any) {
        console.warn('[FIREBASE] Update role error, fallback to SQLite:', err.message);
      }
    }
    try {
      db.prepare('UPDATE users SET rol = ? WHERE uid = ?').run(role, uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 7. Get Transports
  app.get('/api/transports', async (req, res) => {
    if (useFirestore) {
      try {
        const snapshot = await withTimeout(getDocs(collection(fdb, 'transports')), 1500);
        const transports: any[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          transports.push({
            id: docSnap.id,
            nombre: data.nombre,
            regiones: data.regiones || [],
            comunas: data.comunas || [],
            tipoServicio: data.tipoServicio,
            costoBase: data.costoBase,
            costoPorFardo: data.costoPorFardo,
            tarifaReferencia: data.tarifaReferencia || '',
            tiempoEntrega: data.tiempoEntrega || '',
            telefono: data.telefono || '',
            email: data.email || '',
            activo: data.activo === undefined ? true : Boolean(data.activo),
            observaciones: data.observaciones || '',
            createdAt: data.createdAt
          });
        });
        
        if (transports.length === 0) {
          console.log('[FIREBASE SEED] Firestore transports collection is empty. Auto-seeding now!');
          const initialTransports = generateInitialTransports();
          for (const t of initialTransports) {
            await setDoc(doc(fdb, 'transports', t.id), t, { merge: true });
            transports.push(t);
          }
          console.log('[FIREBASE SEED] Auto-seeded ' + transports.length + ' transports into online Firestore.');
        }
        
        return res.json(transports);
      } catch (err: any) {
        console.warn('[FIREBASE] Get transports error, falling back to SQLite:', err.message);
      }
    }
    try {
      const transports = db.prepare('SELECT * FROM transports').all() as any[];
      const parsed = transports.map(t => ({
        ...t,
        regiones: JSON.parse(t.regiones || '[]'),
        comunas: JSON.parse(t.comunas || '[]'),
        activo: Boolean(t.activo),
      }));
      res.json(parsed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 8. Create Transport
  app.post('/api/transports', async (req, res) => {
    const data = req.body;
    const id = data.id || uuidv4();
    const createdAt = new Date().toISOString();
    const newTransport = {
      id,
      nombre: data.nombre,
      regiones: data.regiones || [],
      comunas: data.comunas || [],
      tipoServicio: data.tipoServicio,
      costoBase: Number(data.costoBase),
      costoPorFardo: Number(data.costoPorFardo),
      tarifaReferencia: data.tarifaReferencia || '',
      tiempoEntrega: data.tiempoEntrega || '',
      telefono: data.telefono || '',
      email: data.email || '',
      activo: data.activo === undefined ? true : Boolean(data.activo),
      observaciones: data.observaciones || '',
      createdAt
    };

    if (useFirestore) {
      try {
        await setDoc(doc(fdb, 'transports', id), newTransport, { merge: true });
        try {
          db.prepare(`
            INSERT OR REPLACE INTO transports (
              id, nombre, regiones, comunas, tipoServicio, costoBase, costoPorFardo,
              tarifaReferencia, tiempoEntrega, telefono, email, activo, observaciones, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            newTransport.nombre,
            JSON.stringify(newTransport.regiones),
            JSON.stringify(newTransport.comunas),
            newTransport.tipoServicio,
            newTransport.costoBase,
            newTransport.costoPorFardo,
            newTransport.tarifaReferencia,
            newTransport.tiempoEntrega,
            newTransport.telefono,
            newTransport.email,
            newTransport.activo ? 1 : 0,
            newTransport.observaciones,
            createdAt
          );
        } catch (e) {}
        return res.json(newTransport);
      } catch (err: any) {
        console.warn('[FIREBASE] Create transport error, falling back to SQLite:', err.message);
      }
    }

    try {
      db.prepare(`
        INSERT INTO transports (
          id, nombre, regiones, comunas, tipoServicio, costoBase, costoPorFardo,
          tarifaReferencia, tiempoEntrega, telefono, email, activo, observaciones, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.nombre,
        JSON.stringify(data.regiones || []),
        JSON.stringify(data.comunas || []),
        data.tipoServicio,
        data.costoBase,
        data.costoPorFardo,
        data.tarifaReferencia || '',
        data.tiempoEntrega || '',
        data.telefono || '',
        data.email || '',
        data.activo ? 1 : 0,
        data.observaciones || '',
        createdAt
      );
      res.json({ id, ...data, createdAt });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 9. Update Transport
  app.put('/api/transports/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    const VALID_TRANSPORT_COLUMNS = [
      'nombre', 'regiones', 'comunas', 'tipoServicio', 'costoBase', 'costoPorFardo',
      'tarifaReferencia', 'tiempoEntrega', 'telefono', 'email', 'activo', 'observaciones'
    ];

    if (useFirestore) {
      try {
        const tRef = doc(fdb, 'transports', id);
        await setDoc(tRef, data, { merge: true });
        try {
          const keys = Object.keys(data).filter(key => VALID_TRANSPORT_COLUMNS.includes(key));
          if (keys.length > 0) {
            let setClause = '';
            const values: any[] = [];
            keys.forEach((key, idx) => {
              setClause += `${key} = ?${idx < keys.length - 1 ? ', ' : ''}`;
              let val = data[key];
              if (key === 'regiones' || key === 'comunas') {
                val = JSON.stringify(val);
              } else if (key === 'activo') {
                val = val ? 1 : 0;
              }
              values.push(val);
            });
            values.push(id);
            db.prepare(`UPDATE transports SET ${setClause} WHERE id = ?`).run(...values);
          }
        } catch (e) {}
        return res.json({ success: true });
      } catch (err: any) {
        console.warn('[FIREBASE] Update transport error, falling back to SQLite:', err.message);
      }
    }

    try {
      const keys = Object.keys(data).filter(key => VALID_TRANSPORT_COLUMNS.includes(key));
      if (keys.length === 0) return res.json({ success: true });

      let setClause = '';
      const values: any[] = [];
      keys.forEach((key, idx) => {
        setClause += `${key} = ?${idx < keys.length - 1 ? ', ' : ''}`;
        let val = data[key];
        if (key === 'regiones' || key === 'comunas') {
          val = JSON.stringify(val);
        } else if (key === 'activo') {
          val = val ? 1 : 0;
        }
        values.push(val);
      });
      values.push(id);

      db.prepare(`UPDATE transports SET ${setClause} WHERE id = ?`).run(...values);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 10. Delete Transport
  app.delete('/api/transports/:id', async (req, res) => {
    const { id } = req.params;
    if (useFirestore) {
      try {
        await deleteDoc(doc(fdb, 'transports', id));
        try {
          db.prepare('DELETE FROM transports WHERE id = ?').run(id);
        } catch (e) {}
        return res.json({ success: true });
      } catch (err: any) {
        console.warn('[FIREBASE] Delete transport error, falling back to SQLite:', err.message);
      }
    }
    try {
      db.prepare('DELETE FROM transports WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 11. Get Shipments
  app.get('/api/shipments', async (req, res) => {
    if (useFirestore) {
      try {
        const snapshot = await withTimeout(getDocs(collection(fdb, 'shipments')), 1500);
        const shipments: any[] = [];
        snapshot.forEach(docSnap => {
          const s = docSnap.data();
          shipments.push({
            id: docSnap.id,
            ...s
          });
        });
        shipments.sort((a, b) => {
          const tA = a.fecha?.seconds || 0;
          const tB = b.fecha?.seconds || 0;
          return tB - tA;
        });
        return res.json(shipments);
      } catch (err: any) {
        console.warn('[FIREBASE] Get shipments error, falling back to SQLite:', err.message);
      }
    }
    try {
      const shipments = db.prepare('SELECT * FROM shipments ORDER BY id DESC').all() as any[];
      const parsed = shipments.map(s => ({
        ...s,
        fecha: JSON.parse(s.fecha || '{}'),
      }));
      res.json(parsed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 12. Create Shipment
  app.post('/api/shipments', async (req, res) => {
    const data = req.body;
    const id = data.id || uuidv4();
    const fecha = { seconds: Math.floor(Date.now() / 1000) };
    const newShipment = {
      id,
      cliente: data.cliente,
      region: data.region,
      comuna: data.comuna,
      direccion: data.direccion,
      cantidadFardos: Number(data.cantidadFardos),
      transporteId: data.transporteId,
      transporteNombre: data.transporteNombre,
      costoTotal: Number(data.costoTotal),
      estado: data.estado || 'pendiente',
      fecha,
      createdBy: data.createdBy || 'fabian'
    };

    if (useFirestore) {
      try {
        await setDoc(doc(fdb, 'shipments', id), newShipment, { merge: true });
        try {
          db.prepare(`
            INSERT OR REPLACE INTO shipments (
              id, cliente, region, comuna, direccion, cantidadFardos, transporteId,
              transporteNombre, costoTotal, estado, fecha, createdBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            newShipment.cliente,
            newShipment.region,
            newShipment.comuna,
            newShipment.direccion,
            newShipment.cantidadFardos,
            newShipment.transporteId,
            newShipment.transporteNombre,
            newShipment.costoTotal,
            newShipment.estado,
            JSON.stringify(fecha),
            newShipment.createdBy
          );
        } catch (e) {}
        return res.json(newShipment);
      } catch (err: any) {
        console.warn('[FIREBASE] Create shipment error, falling back to SQLite:', err.message);
      }
    }

    try {
      db.prepare(`
        INSERT INTO shipments (
          id, cliente, region, comuna, direccion, cantidadFardos, transporteId,
          transporteNombre, costoTotal, estado, fecha, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.cliente,
        data.region,
        data.comuna,
        data.direccion,
        data.cantidadFardos,
        data.transporteId,
        data.transporteNombre,
        data.costoTotal,
        data.estado || 'pendiente',
        JSON.stringify(fecha),
        data.createdBy
      );
      res.json({ id, ...data, fecha });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 13. Update Shipment
  app.put('/api/shipments/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    if (useFirestore) {
      try {
        const sRef = doc(fdb, 'shipments', id);
        await setDoc(sRef, data, { merge: true });
        try {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            let setClause = '';
            const values: any[] = [];
            keys.forEach((key, idx) => {
              setClause += `${key} = ?${idx < keys.length - 1 ? ', ' : ''}`;
              let val = data[key];
              if (key === 'fecha') {
                val = JSON.stringify(val);
              }
              values.push(val);
            });
            values.push(id);
            db.prepare(`UPDATE shipments SET ${setClause} WHERE id = ?`).run(...values);
          }
        } catch (e) {}
        return res.json({ success: true });
      } catch (err: any) {
        console.warn('[FIREBASE] Update shipment error, falling back to SQLite:', err.message);
      }
    }

    try {
      const keys = Object.keys(data);
      if (keys.length === 0) return res.json({ success: true });

      let setClause = '';
      const values: any[] = [];
      keys.forEach((key, idx) => {
        setClause += `${key} = ?${idx < keys.length - 1 ? ', ' : ''}`;
        let val = data[key];
        if (key === 'fecha') {
          val = JSON.stringify(val);
        }
        values.push(val);
      });
      values.push(id);

      db.prepare(`UPDATE shipments SET ${setClause} WHERE id = ?`).run(...values);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 14. Delete Shipment
  app.delete('/api/shipments/:id', async (req, res) => {
    const { id } = req.params;
    if (useFirestore) {
      try {
        await deleteDoc(doc(fdb, 'shipments', id));
        try {
          db.prepare('DELETE FROM shipments WHERE id = ?').run(id);
        } catch (e) {}
        return res.json({ success: true });
      } catch (err: any) {
        console.warn('[FIREBASE] Delete shipment error, falling back to SQLite:', err.message);
      }
    }
    try {
      db.prepare('DELETE FROM shipments WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 15. Backup DB
  app.get('/api/backup', (req, res) => {
    try {
      const users = db.prepare('SELECT * FROM users').all();
      const transportsRow = db.prepare('SELECT * FROM transports').all() as any[];
      const shipmentsRow = db.prepare('SELECT * FROM shipments').all() as any[];

      const transports = transportsRow.map(t => ({
        ...t,
        regiones: JSON.parse(t.regiones || '[]'),
        comunas: JSON.parse(t.comunas || '[]'),
        activo: Boolean(t.activo),
      }));

      const shipments = shipmentsRow.map(s => ({
        ...s,
        fecha: JSON.parse(s.fecha || '{}'),
      }));

      res.json({
        users,
        transports,
        shipments,
        version: '1.7',
        exportedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 16. Restore DB
  app.post('/api/restore', (req, res) => {
    const data = req.body;
    try {
      if (!data.users || !data.transports || !data.shipments) {
        return res.status(400).json({ error: 'Formato de archivo inválido' });
      }

      db.transaction(() => {
        db.prepare('DELETE FROM users').run();
        db.prepare('DELETE FROM transports').run();
        db.prepare('DELETE FROM shipments').run();

        const insertUser = db.prepare('INSERT INTO users (uid, email, nombre, rol, password) VALUES (?, ?, ?, ?, ?)');
        for (const u of data.users) {
          insertUser.run(u.uid, u.email, u.nombre, u.rol, u.password || 'password123');
        }

        const insertTransport = db.prepare(`
          INSERT INTO transports (
            id, nombre, regiones, comunas, tipoServicio, costoBase, costoPorFardo,
            tarifaReferencia, tiempoEntrega, telefono, email, activo, observaciones, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of data.transports) {
          insertTransport.run(
            t.id,
            t.nombre,
            JSON.stringify(t.regiones || []),
            JSON.stringify(t.comunas || []),
            t.tipoServicio,
            t.costoBase,
            t.costoPorFardo,
            t.tarifaReferencia || '',
            t.tiempoEntrega || '',
            t.telefono || '',
            t.email || '',
            t.activo ? 1 : 0,
            t.observaciones || '',
            t.createdAt || new Date().toISOString()
          );
        }

        const insertShipment = db.prepare(`
          INSERT INTO shipments (
            id, cliente, region, comuna, direccion, cantidadFardos, transporteId,
            transporteNombre, costoTotal, estado, fecha, createdBy
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of data.shipments) {
          insertShipment.run(
            s.id,
            s.cliente,
            s.region,
            s.comuna,
            s.direccion,
            s.cantidadFardos,
            s.transporteId,
            s.transporteNombre,
            s.costoTotal,
            s.estado || 'pendiente',
            JSON.stringify(s.fecha || { seconds: Date.now() / 1000 }),
            s.createdBy || '1'
          );
        }
      })();

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 17. Safe Complete Rebuild/Reseed Database Route (Forces both SQLite and online Firestore synchronization)
  app.post('/api/rebuild-db', async (req, res) => {
    try {
      console.log('[REBUILD API] Initiating absolute database clean wipe and national carriers seeding...');
      const initialTransports = generateInitialTransports();

      const INITIAL_USERS = [
        { uid: 'fabian', email: 'f.echeverria.allendes@gmail.com', nombre: 'Fabián Maestro', rol: 'admin', password: '2024' },
        { uid: 'admin', email: 'admin@logitrack.com', nombre: 'Administrador', rol: 'admin', password: '2024' },
        { uid: 'operador', email: 'operador@logitrack.com', nombre: 'Operador User', rol: 'operador', password: '2024' },
        { uid: 'master', email: 'master@logitrack.com', nombre: 'Administrador Maestro', rol: 'admin', password: '2024' },
      ];

      // Update Firestore online collections if available
      if (useFirestore && fdb) {
        console.log('[REBUILD API] [FIRESTORE] Populating online database collections directly...');
        // Sync Users to Firestore
        for (const u of INITIAL_USERS) {
          await setDoc(doc(fdb, 'users', u.uid), u, { merge: true });
        }
        
        // Sync Transports to Firestore (using chunks/sequential check to safeguard memory constraints)
        for (const t of initialTransports) {
          await setDoc(doc(fdb, 'transports', t.id), t, { merge: true });
        }
        console.log('[REBUILD API] [FIRESTORE] Complete synchronization of 40+ transports succeeded.');
      }

      // Always clear and seed local SQLite fallback
      db.transaction(() => {
        db.prepare('DELETE FROM users').run();
        db.prepare('DELETE FROM transports').run();
        db.prepare('DELETE FROM shipments').run();

        const insertUser = db.prepare('INSERT INTO users (uid, email, nombre, rol, password) VALUES (?, ?, ?, ?, ?)');
        for (const u of INITIAL_USERS) {
          insertUser.run(u.uid, u.email, u.nombre, u.rol, u.password);
        }

        const insertTransport = db.prepare(`
          INSERT INTO transports (
            id, nombre, regiones, comunas, tipoServicio, costoBase, costoPorFardo,
            tarifaReferencia, tiempoEntrega, telefono, email, activo, observaciones, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of initialTransports) {
          insertTransport.run(
            t.id,
            t.nombre,
            JSON.stringify(t.regiones),
            JSON.stringify(t.comunas),
            t.tipoServicio,
            t.costoBase,
            t.costoPorFardo,
            t.tarifaReferencia,
            t.tiempoEntrega,
            t.telefono,
            t.email,
            t.activo,
            t.observaciones || '',
            t.createdAt
          );
        }
      })();

      console.log('[REBUILD API] Database fully built and reseeded successfully!');
      res.json({ success: true, count: initialTransports.length });
    } catch (error: any) {
      console.error('[REBUILD API] Error reconstructing:', error);
      res.status(500).json({ error: error.message });
    }
  });


  // Handle favicon.ico requests by serving the high-resolution vector logo
  app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.sendFile(path.join(process.cwd(), 'public', 'icon.svg'));
  });


  /* SERVE VITE OR STATIC BUILD */

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
