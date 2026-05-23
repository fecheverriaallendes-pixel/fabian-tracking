import { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Shipment } from '../types';
import { ShipmentForm } from '../components/ShipmentForm';
import { Plus, Edit, Trash2, Package, MapPin, Calendar, Search, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Despachos</h1>
          <p className="text-slate-500 mt-1">Control de envíos y estados</p>
        </div>
        {!isEditing && (
          <button
            onClick={startCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Despacho
          </button>
        )}
      </div>

      {isEditing ? (
        <ShipmentForm
          initialData={currentShipment}
          onSubmit={currentShipment ? handleUpdate : handleCreate}
          onCancel={cancelEdit}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por cliente o comuna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="enviado">Enviado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Cliente / Destino</th>
                    <th className="px-6 py-4">Transporte</th>
                    <th className="px-6 py-4">Detalles</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{shipment.cliente}</div>
                        <div className="flex items-center text-xs text-slate-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {shipment.comuna}, {shipment.region}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Truck className="w-4 h-4 mr-2 text-slate-400" />
                          <span className="text-slate-700">{transports[shipment.transporteId] || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">{shipment.cantidadFardos} fardos</div>
                        <div className="font-semibold text-blue-600">{formatCurrency(shipment.costoTotal)}</div>
                        <div className="flex items-center text-xs text-slate-400 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {shipment.fecha?.seconds ? format(new Date(shipment.fecha.seconds * 1000), 'dd MMM yyyy', { locale: es }) : 'Reciente'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                          shipment.estado === 'entregado' ? "bg-green-100 text-green-800" :
                          shipment.estado === 'pendiente' ? "bg-orange-100 text-orange-800" :
                          shipment.estado === 'enviado' ? "bg-blue-100 text-blue-800" :
                          "bg-slate-100 text-slate-800"
                        )}>
                          {shipment.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => startEdit(shipment)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          {user?.rol === 'admin' && (
                            <button onClick={() => handleDelete(shipment.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredShipments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        <Package className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                        No se encontraron despachos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
