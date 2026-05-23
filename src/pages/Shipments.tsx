import { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Shipment } from '../types';
import { ShipmentForm } from '../components/ShipmentForm';
import { Plus, Edit, Trash2, Package, MapPin, Calendar, Search, Truck, Filter, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [transports, setTransports] = useState<Record<string, string>>({}); // Map ID -> Name
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentShipment, setCurrentShipment] = useState<Shipment | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const { user } = useAuth();

  const fetchShipments = async () => {
    setLoading(true);
    try {
      // Fetch Transports for name mapping
      const transportsData = await dbService.getTransports();
      const transportMap: Record<string, string> = {};
      transportsData.forEach(t => {
        if (t.id) transportMap[t.id] = t.nombre;
      });
      setTransports(transportMap);

      // Fetch Shipments
      const shipmentsData = await dbService.getShipments();
      // Sort by date desc
      shipmentsData.sort((a, b) => {
          const dateA = a.fecha?.seconds || 0;
          const dateB = b.fecha?.seconds || 0;
          return dateB - dateA;
      });
      setShipments(shipmentsData);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      toast.error("Error al cargar despachos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleCreate = async (data: any) => {
    try {
      await dbService.createShipment({
        ...data,
        createdBy: user?.uid || 'unknown',
      });
      toast.success("Despacho creado exitosamente");
      setIsEditing(false);
      fetchShipments();
    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error("Error al crear despacho");
    }
  };

  const handleUpdate = async (data: any) => {
    if (!currentShipment?.id) return;
    try {
      await dbService.updateShipment(currentShipment.id, data);
      toast.success("Despacho actualizado exitosamente");
      setIsEditing(false);
      setCurrentShipment(undefined);
      fetchShipments();
    } catch (error) {
      console.error("Error updating shipment:", error);
      toast.error("Error al actualizar despacho");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este despacho?")) return;
    try {
      await dbService.deleteShipment(id);
      toast.success("Despacho eliminado");
      fetchShipments();
    } catch (error) {
      console.error("Error deleting shipment:", error);
      toast.error("Error al eliminar despacho");
    }
  };

  const startCreate = () => {
    setCurrentShipment(undefined);
    setIsEditing(true);
  };

  const startEdit = (shipment: Shipment) => {
    setCurrentShipment(shipment);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentShipment(undefined);
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = shipment.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          shipment.comuna.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || shipment.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && !isEditing) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="relative flex items-center justify-center">
          <div className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-indigo-400 opacity-75"></div>
          <div className="relative animate-spin rounded-full h-12 w-12 border-t-2 border-r-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 14 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Package className="w-3.5 h-3.5 mr-1" />
            Despachos Activos
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Despachos</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Registra, filtra y monitorea los envíos de fardos en tiempo real</p>
        </div>
        {!isEditing && (
          <button
            onClick={startCreate}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/10 transition-all hover:scale-102 active:scale-98"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Despacho</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit-shipment"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <ShipmentForm
              initialData={currentShipment}
              onSubmit={currentShipment ? handleUpdate : handleCreate}
              onCancel={cancelEdit}
            />
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Intelligent Elegant Filter Panel */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente o comuna de destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium placeholder-slate-400"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="bg-slate-100 p-2.5 rounded-xl text-slate-500 hidden sm:block">
                  <Filter className="w-4 h-4" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-semibold text-slate-700 bg-[position:right_12px_center] cursor-pointer"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="pendiente">🟠 Pendiente</option>
                  <option value="enviado">🔵 Enviado</option>
                  <option value="entregado">🟢 Entregado</option>
                  <option value="cancelado">🔴 Cancelado</option>
                </select>
              </div>
            </div>

            {/* List with staggered visual entry */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4.5">Cliente / Destino</th>
                      <th className="px-6 py-4.5">Logística & Agencia</th>
                      <th className="px-6 py-4.5">Detalles Envíos</th>
                      <th className="px-6 py-4.5">Estado</th>
                      <th className="px-6 py-4.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-slate-100 font-medium"
                  >
                    {filteredShipments.map((shipment) => (
                      <motion.tr 
                        key={shipment.id} 
                        variants={rowVariants}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-5.5">
                          <div className="font-extrabold text-slate-900 text-sm uppercase">{shipment.cliente}</div>
                          <div className="flex items-center text-xs text-slate-500 mt-1.5 font-semibold">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {shipment.comuna}, {shipment.region}
                          </div>
                        </td>
                        <td className="px-6 py-5.5">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mr-2.5 border border-blue-100 text-blue-600">
                              <Truck className="w-4 h-4" />
                            </div>
                            <span className="text-slate-800 font-bold uppercase tracking-tight text-xs">
                              {transports[shipment.transporteId] || 'Desconocido'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5.5">
                          <div className="text-slate-700 font-bold text-xs uppercase">{shipment.cantidadFardos} Fardos</div>
                          <div className="font-extrabold text-indigo-600 text-sm font-mono mt-0.5">{formatCurrency(shipment.costoTotal)}</div>
                          <div className="flex items-center text-[10px] uppercase tracking-wider text-slate-400 mt-1.5 font-bold">
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            {shipment.fecha?.seconds ? format(new Date(shipment.fecha.seconds * 1000), 'dd MMM yyyy', { locale: es }) : 'Por despachar'}
                          </div>
                        </td>
                        <td className="px-6 py-5.5">
                          <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                            shipment.estado === 'entregado' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            shipment.estado === 'enviado' ? "bg-blue-50 text-blue-700 border-blue-100" :
                            shipment.estado === 'pendiente' ? "bg-amber-50 text-amber-700 border-amber-100" :
                            "bg-rose-50 text-rose-700 border-rose-100"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full mr-2",
                              shipment.estado === 'entregado' ? "bg-emerald-500" :
                              shipment.estado === 'enviado' ? "bg-blue-500" :
                              shipment.estado === 'pendiente' ? "bg-amber-500" :
                              "bg-rose-500"
                            )} />
                            {shipment.estado}
                          </span>
                        </td>
                        <td className="px-6 py-5.5 text-right">
                          <div className="flex justify-end space-x-1.5">
                            <button 
                              onClick={() => startEdit(shipment)} 
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Editar despacho"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {user?.rol === 'admin' && (
                              <button 
                                onClick={() => handleDelete(shipment.id!)} 
                                className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all"
                                title="Eliminar despacho"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {filteredShipments.length === 0 && (
                      <motion.tr variants={rowVariants}>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                          <div className="bg-slate-50 p-4 rounded-full shadow-sm inline-block mb-3 border border-slate-100">
                            <Package className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                          </div>
                          <p className="text-sm font-semibold text-slate-500">No se encontraron despachos registrados</p>
                          <p className="text-xs text-slate-400 mt-1">Intenta ajustando los filtros de búsqueda arriba.</p>
                        </td>
                      </motion.tr>
                    )}
                  </motion.tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
