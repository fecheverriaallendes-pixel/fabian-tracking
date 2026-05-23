import { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Truck, Package, DollarSign, Clock } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Shipment } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalShipments: 0,
    activeTransports: 0,
    pendingShipments: 0,
    totalRevenue: 0,
  });
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Transports
        const transports = await dbService.getTransports();
        const activeTransports = transports.filter(t => t.activo).length;

        // Fetch Shipments
        const shipments = await dbService.getShipments();
        
        // Sort by date desc
        shipments.sort((a, b) => {
            const dateA = a.fecha?.seconds || 0;
            const dateB = b.fecha?.seconds || 0;
            return dateB - dateA;
        });

        let totalShipments = 0;
        let pendingShipments = 0;
        let totalRevenue = 0;
        const shipmentsByStatus: Record<string, number> = {};

        shipments.forEach((data) => {
          totalShipments++;
          if (data.estado === 'pendiente') pendingShipments++;
          totalRevenue += data.costoTotal || 0;

          // Chart Data Prep
          shipmentsByStatus[data.estado] = (shipmentsByStatus[data.estado] || 0) + 1;
        });

        setStats({
          totalShipments,
          activeTransports,
          pendingShipments,
          totalRevenue,
        });

        setRecentShipments(shipments.slice(0, 5));
        
        const chart = Object.keys(shipmentsByStatus).map(key => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          cantidad: shipmentsByStatus[key]
        }));
        setChartData(chart);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="text-sm text-slate-500">Última actualización: {new Date().toLocaleTimeString()}</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Despachos</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalShipments}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Transportes Activos</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.activeTransports}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <Truck className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pendientes</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.pendingShipments}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Ingresos Totales</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Estado de Despachos</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            {recentShipments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No hay actividad reciente.</p>
            ) : (
              recentShipments.map((shipment) => (
                <div key={shipment.id} className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    shipment.estado === 'entregado' ? 'bg-green-500' :
                    shipment.estado === 'pendiente' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {shipment.cliente}
                    </p>
                    <p className="text-xs text-slate-500">
                      {shipment.comuna} • {formatCurrency(shipment.costoTotal)}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 mt-1 capitalize">
                      {shipment.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
