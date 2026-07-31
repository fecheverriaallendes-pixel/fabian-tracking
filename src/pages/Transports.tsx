import { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Transport } from '../types';
import { TransportForm } from '../components/TransportForm';
import { Plus, Edit, Trash2, MapPin, Phone, Mail, DollarSign, Package, Clock, Truck, Sparkles, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Transports() {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTransport, setCurrentTransport] = useState<Transport | undefined>(undefined);
  const { user } = useAuth();

  const fetchTransports = async () => {
    setLoading(true);
    try {
      const data = await dbService.getTransports();
      setTransports(data);
    } catch (error) {
      console.error("Error fetching transports:", error);
      toast.error("Error al cargar transportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransports();
  }, []);

  const handleCreate = async (data: any) => {
    try {
      await dbService.createTransport(data);
      toast.success("Transporte creado exitosamente");
      setIsEditing(false);
      fetchTransports();
    } catch (error) {
      console.error("Error creating transport:", error);
      toast.error("Error al crear transporte");
    }
  };

  const handleUpdate = async (data: any) => {
    if (!currentTransport?.id) return;
    try {
      await dbService.updateTransport(currentTransport.id, data);
      toast.success("Transporte actualizado exitosamente");
      setIsEditing(false);
      setCurrentTransport(undefined);
      fetchTransports();
    } catch (error) {
      console.error("Error updating transport:", error);
      toast.error("Error al actualizar transporte");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este transporte?")) return;
    try {
      await dbService.deleteTransport(id);
      toast.success("Transporte eliminado");
      fetchTransports();
    } catch (error) {
      console.error("Error deleting transport:", error);
      toast.error("Error al eliminar transporte");
    }
  };

  const startCreate = () => {
    setCurrentTransport(undefined);
    setIsEditing(true);
  };

  const startEdit = (transport: Transport) => {
    setCurrentTransport(transport);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentTransport(undefined);
  };

  if (loading && !isEditing) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="relative flex items-center justify-center">
          <div className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></div>
          <div className="relative animate-spin rounded-full h-12 w-12 border-t-2 border-r-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Truck className="w-3.5 h-3.5 mr-1" />
            Flotas de Transporte
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Transportes</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Administra en tiempo real los transportes activos y su cobertura</p>
        </div>
        {!isEditing && (
          <button
            onClick={startCreate}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/10 transition-all hover:scale-102 active:scale-98"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Transporte</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit-form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <TransportForm
              initialData={currentTransport}
              onSubmit={currentTransport ? handleUpdate : handleCreate}
              onCancel={cancelEdit}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {transports.map((transport) => (
              <motion.div 
                key={transport.id} 
                variants={cardVariants}
                className={cn(
                  "bg-white rounded-3xl shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 relative group flex flex-col justify-between",
                  transport.activo ? 'border-slate-100 hover:border-blue-400' : 'border-red-100 bg-red-50/25'
                )}
              >
                {/* Visual indicator strap */}
                <div className={cn("absolute top-0 left-0 right-0 h-1", transport.activo ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-red-450")} />

                <div className="p-6 space-y-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{transport.nombre}</h3>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          transport.activo 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-red-50 text-red-700 border-red-100'
                        )}>
                          {transport.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 capitalize">
                          {transport.tipoServicio}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => startEdit(transport)} 
                        className="p-2 text-slate-400 hover:text-blue-650 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Editar transporte"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user?.rol === 'admin' && (
                        <button 
                          onClick={() => handleDelete(transport.id!)} 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm text-slate-600 font-medium">
                    <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-100">
                      <div className="flex items-center text-slate-500">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>Tarifa / Base</span>
                      </div>
                      <span className="font-extrabold text-slate-950 font-mono">
                        {transport.tarifaReferencia ? (
                          transport.tarifaReferencia
                        ) : (
                          formatCurrency(transport.costoBase)
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-100">
                      <div className="flex items-center text-slate-500">
                        <Package className="w-4 h-4 mr-2" />
                        <span>Costo Fardo</span>
                      </div>
                      <span className="font-extrabold text-slate-950 font-mono">{formatCurrency(transport.costoPorFardo)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-100">
                      <div className="flex items-center text-slate-500">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Tiempo de Entrega</span>
                      </div>
                      <span className="font-bold text-slate-950">{transport.tiempoEntrega}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-100">
                      <div className="flex items-center text-slate-500">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>Contacto</span>
                      </div>
                      <span className="font-semibold text-slate-800">{transport.telefono || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center text-slate-500">
                        <Mail className="w-4 h-4 mr-2" />
                        <span>Email</span>
                      </div>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">{transport.email || '-'}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl space-y-3">
                    {/* Per-commune custom rates section if available */}
                    {transport.tarifasPorComuna && Object.keys(transport.tarifasPorComuna).length > 0 && (
                      <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-black uppercase tracking-wide text-emerald-900 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-emerald-600" />
                            Tarifas Diferenciadas por Comuna
                          </span>
                          <span className="text-[10px] font-bold bg-emerald-200/60 text-emerald-800 px-1.5 py-0.2 rounded-full">
                            {Object.keys(transport.tarifasPorComuna).length} asignadas
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-1">
                          {Object.entries(transport.tarifasPorComuna).map(([comuna, precio]) => (
                            <span key={comuna} className="inline-flex items-center text-[10px] font-bold bg-white text-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                              <span className="text-slate-600 mr-1">{comuna}:</span>
                              <span className="text-emerald-700 font-mono">{formatCurrency(precio)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Comunas de cobertura ({transport.comunas.length})</p>
                        <p className="text-xs font-semibold text-slate-600 line-clamp-2">
                          {transport.comunas.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {transports.length === 0 && (
              <motion.div 
                variants={cardVariants}
                className="col-span-full text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200"
              >
                <div className="bg-slate-50 p-4 rounded-full shadow-sm inline-block mb-3 border border-slate-100">
                  <Truck className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No hay transportes registrados</h3>
                <p className="text-sm text-slate-500 mt-1">Comienza creando tu primera flota de logística.</p>
                <div className="mt-6">
                  <button
                    onClick={startCreate}
                    className="inline-flex items-center px-5 py-3 border border-transparent shadow-md text-sm font-bold rounded-2xl text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    <span>Agregar Mi Primer Transporte</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
