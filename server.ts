import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { COMMUNES_CHILE, getTransportsForCommune } from './src/lib/chile-data.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  // Seeding Initial Users if Empty
  const userCountRes = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCountRes.count === 0) {
    const INITIAL_USERS = [
      { uid: '1', email: 'admin@logitrack.com', nombre: 'Admin User', rol: 'admin', password: '2024' },
      { uid: '2', email: 'operador@logitrack.com', nombre: 'Operador User', rol: 'operador', password: 'password123' },
      { uid: '3', email: 'master@logitrack.com', nombre: 'Administrador Maestro', rol: 'admin', password: '2024' },
      { uid: '4', email: 'f.echeverria.allendes@gmail.com', nombre: 'Fabián Maestro', rol: 'admin', password: '2024' },
    ];

    const insertUser = db.prepare('INSERT INTO users (uid, email, nombre, rol, password) VALUES (?, ?, ?, ?, ?)');
    const transInsert = db.transaction((users) => {
      for (const u of users) {
        insertUser.run(u.uid, u.email, u.nombre, u.rol, u.password);
      }
    });
    transInsert(INITIAL_USERS);
    console.log('Admin and master users seeded successfully.');
  }

  // Seeding Initial Transports if Empty
  const transportCountRes = db.prepare('SELECT count(*) as count FROM transports').get() as { count: number };
  if (transportCountRes.count === 0) {
    console.log('Seeding initial transports...');
    
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

      return Object.values(transportMap);
    };

    const initialTransports = generateInitialTransports();
    const insertTransport = db.prepare(`
      INSERT INTO transports (
        id, nombre, regiones, comunas, tipoServicio, costoBase, costoPorFardo,
        tarifaReferencia, tiempoEntrega, telefono, email, activo, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          t.createdAt
        );
      }
    });
    
    transInsertTransports(initialTransports);
    console.log('Seeded', initialTransports.length, 'transports.');
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
  app.get('/api/users', (req, res) => {
    try {
      const users = db.prepare('SELECT uid, email, nombre, rol FROM users').all();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Verify User Credentials
  app.post('/api/users/verify', (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      // Simple password check matching mock database
      if (user.password === password || (!user.password && password === 'password123')) {
        const { password: _, ...safeUser } = user;
        return res.json(safeUser);
      }
      res.status(401).json({ error: 'Credenciales inválidas' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Create User
  app.post('/api/users', (req, res) => {
    const { email, nombre, rol, password } = req.body;
    try {
      const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
      if (exists) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      const uid = uuidv4();
      db.prepare('INSERT INTO users (uid, email, nombre, rol, password) VALUES (?, ?, ?, ?, ?)')
        .run(uid, email, nombre, rol, password || 'password123');
      res.json({ uid, email, nombre, rol });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Update Password
  app.post('/api/users/change-password', (req, res) => {
    const { uid, newPassword } = req.body;
    try {
      db.prepare('UPDATE users SET password = ? WHERE uid = ?').run(newPassword, uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Delete User
  app.delete('/api/users/:uid', (req, res) => {
    const { uid } = req.params;
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
  app.put('/api/users/:uid/role', (req, res) => {
    const { uid } = req.params;
    const { role } = req.body;
    try {
      db.prepare('UPDATE users SET rol = ? WHERE uid = ?').run(role, uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 7. Get Transports
  app.get('/api/transports', (req, res) => {
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
  app.post('/api/transports', (req, res) => {
    const data = req.body;
    try {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO transports (
          id, nombre, regiones, comunas, tipoServicio, costoBase, costoPorFardo,
          tarifaReferencia, tiempoEntrega, telefono, email, activo, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.nombre,
        JSON.stringify(data.regiones || []),
        JSON.stringify(data.comunas || []),
        data.tipoServicio,
        data.costoBase,
        data.costoPorFardo,
        data.tarifaReferencia,
        data.tiempoEntrega,
        data.telefono,
        data.email,
        data.activo ? 1 : 0,
        createdAt
      );
      res.json({ id, ...data, createdAt });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 9. Update Transport
  app.put('/api/transports/:id', (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
      const keys = Object.keys(data);
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
  app.delete('/api/transports/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM transports WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 11. Get Shipments
  app.get('/api/shipments', (req, res) => {
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
  app.post('/api/shipments', (req, res) => {
    const data = req.body;
    try {
      const id = uuidv4();
      const fecha = { seconds: Date.now() / 1000 };
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
  app.put('/api/shipments/:id', (req, res) => {
    const { id } = req.params;
    const data = req.body;
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
  app.delete('/api/shipments/:id', (req, res) => {
    const { id } = req.params;
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
            tarifaReferencia, tiempoEntrega, telefono, email, activo, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            t.tarifaReferencia,
            t.tiempoEntrega,
            t.telefono,
            t.email,
            t.activo ? 1 : 0,
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
