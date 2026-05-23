import { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Transport } from '../types';
import { TransportForm } from '../components/TransportForm';
import { Plus, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Transportes</h1>
          <p className="text-slate-500 mt-1">Administra la flota y proveedores de logística</p>
        </div>
        {!isEditing && (
          <button
            onClick={startCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Transporte
          </button>
        )}
      </div>

      {isEditing ? (
        <TransportForm
          initialData={currentTransport}
          onSubmit={currentTransport ? handleUpdate : handleCreate}
          onCancel={cancelEdit}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {transports.map((transport) => (
            <div key={transport.id} className={`bg-white rounded-xl shadow-sm border ${transport.activo ? 'border-slate-200' : 'border-red-200 bg-red-50'} overflow-hidden transition-all hover:shadow-md`}>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{transport.nombre}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      transport.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {transport.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {transport.tipoServicio}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => startEdit(transport)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    {user?.rol === 'admin' && (
                      <button onClick={() => handleDelete(transport.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center">
                    <DollarSignIcon className="w-4 h-4 mr-2 text-slate-400" />
                    <span>
                      {transport.tarifaReferencia ? (
                        <span className="font-semibold text-slate-900">{transport.tarifaReferencia}</span>
                      ) : (
                        <span>Base: <span className="font-semibold text-slate-900">{formatCurrency(transport.costoBase)}</span></span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <PackageIcon className="w-4 h-4 mr-2 text-slate-400" />
                    <span>x Fardo: <span className="font-semibold text-slate-900">{formatCurrency(transport.costoPorFardo)}</span></span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-2 text-slate-400" />
                    <span>{transport.tiempoEntrega}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                    <span>{transport.telefono}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-slate-400" />
                    <span className="truncate">{transport.email}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {transport.comunas.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {transports.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <TruckIcon className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No hay transportes</h3>
              <p className="mt-1 text-sm text-slate-500">Comienza creando un nuevo transporte.</p>
              <div className="mt-6">
                <button
                  onClick={startCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Nuevo Transporte
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DollarSignIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function PackageIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22v-10" />
    </svg>
  )
}

function ClockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TruckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 17h4V5H2v12h3" />
      <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
      <path d="M14 17h1" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}
