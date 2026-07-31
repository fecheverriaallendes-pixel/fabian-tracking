import { COMMUNES_CHILE } from '../lib/chile-data';

export type UserRole = 'admin' | 'operador';

export interface User {
  uid: string;
  email: string;
  nombre: string;
  rol: UserRole;
  password?: string; // For local auth
}

export interface Transport {
  id?: string;
  nombre: string;
  regiones: string[];
  comunas: string[];
  tarifasPorComuna?: Record<string, number>; // Specific tariffs per commune, e.g. { "Paine": 20000, "La Florida": 8000 }
  tipoServicio: 'express' | 'normal' | 'cargo';
  costoBase: number;
  costoPorFardo: number;
  tarifaReferencia?: string; // New field for text ranges like "$45.000 - $60.000"
  tiempoEntrega: string; // e.g., "24-48 hrs"
  telefono: string;
  email: string;
  observaciones?: string;
  activo: boolean;
  createdAt: any; // Timestamp
}

export type ShipmentStatus = 'pendiente' | 'enviado' | 'entregado' | 'cancelado';

export interface Shipment {
  id?: string;
  cliente: string;
  region: string;
  comuna: string;
  direccion: string;
  cantidadFardos: number;
  transporteId: string;
  transporteNombre?: string; // Denormalized for easier display
  costoTotal: number;
  estado: ShipmentStatus;
  fecha: any; // Timestamp
  createdBy: string;
}

// Transform flat list to hierarchical structure
const regionsMap = new Map<string, Set<string>>();

COMMUNES_CHILE.forEach(item => {
  if (!regionsMap.has(item.r)) {
    regionsMap.set(item.r, new Set());
  }
  regionsMap.get(item.r)?.add(item.c);
});

export const REGIONES_CHILE = Array.from(regionsMap.entries()).map(([region, comunasSet]) => ({
  nombre: region,
  comunas: Array.from(comunasSet).sort()
})).sort((a, b) => a.nombre.localeCompare(b.nombre));
