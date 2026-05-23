import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { dbService } from '../services/db';
import { Shipment, Transport, REGIONES_CHILE } from '../types';
import { Loader2, Save, X, Truck, DollarSign, Clock, Star } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

const shipmentSchema = z.object({
  cliente: z.string().min(3, 'Nombre del cliente requerido'),
  region: z.string().min(1, 'Selecciona una región'),
  comuna: z.string().min(1, 'Selecciona una comuna'),
  direccion: z.string().min(5, 'Dirección requerida'),
  cantidadFardos: z.number().min(1, 'Mínimo 1 fardo'),
  transporteId: z.string().min(1, 'Selecciona un transporte'),
  costoTotal: z.number(),
  estado: z.enum(['pendiente', 'enviado', 'entregado', 'cancelado']),
});

type ShipmentFormData = z.infer<typeof shipmentSchema>;

interface ShipmentFormProps {
  initialData?: Shipment;
  onSubmit: (data: ShipmentFormData) => Promise<void>;
  onCancel: () => void;
}

export function ShipmentForm({ initialData, onSubmit, onCancel }: ShipmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [filteredTransports, setFilteredTransports] = useState<Transport[]>([]);
  const [recommendedTransportId, setRecommendedTransportId] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: initialData || {
      estado: 'pendiente',
      cantidadFardos: 1,
      costoTotal: 0,
    },
  });

  const selectedRegion = watch('region');
  const selectedComuna = watch('comuna');
  const quantity = watch('cantidadFardos');
  const selectedTransportId = watch('transporteId');

  // Fetch active transports on mount
  useEffect(() => {
    const fetchTransports = async () => {
      const data = await dbService.getTransports();
      setTransports(data.filter(t => t.activo));
    };
    fetchTransports();
  }, []);

  // Filter transports when comuna changes
  useEffect(() => {
    if (selectedComuna && transports.length > 0) {
      const filtered = transports.filter(t => t.comunas.includes(selectedComuna));
      setFilteredTransports(filtered);

      // Simple recommendation logic: Cheapest
      if (filtered.length > 0) {
        const cheapest = filtered.reduce((prev, curr) => {
          const prevCost = prev.costoBase + (prev.costoPorFardo * (quantity || 1));
          const currCost = curr.costoBase + (curr.costoPorFardo * (quantity || 1));
          return prevCost < currCost ? prev : curr;
        });
        setRecommendedTransportId(cheapest.id!);
      } else {
        setRecommendedTransportId(null);
      }
    } else {
      setFilteredTransports([]);
      setRecommendedTransportId(null);
    }
  }, [selectedComuna, transports, quantity]);

  // Update total cost when transport or quantity changes
  useEffect(() => {
    if (selectedTransportId && quantity) {
      const transport = transports.find(t => t.id === selectedTransportId);
      if (transport) {
        const total = transport.costoBase + (transport.costoPorFardo * quantity);
        setValue('costoTotal', total);
      }
    }
  }, [selectedTransportId, quantity, transports, setValue]);

  const handleFormSubmit = async (data: ShipmentFormData) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  const availableComunas = REGIONES_CHILE.find(r => r.nombre === selectedRegion)?.comunas || [];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Información del Cliente</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <input {...register('cliente')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            {errors.cliente && <p className="text-red-500 text-xs mt-1">{errors.cliente.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Región</label>
              <select 
                {...register('region')} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => {
                  setValue('region', e.target.value);
                  setValue('comuna', ''); // Reset comuna
                }}
              >
                <option value="">Seleccionar...</option>
                {REGIONES_CHILE.map(r => (
                  <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
                ))}
              </select>
              {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comuna</label>
              <select 
                {...register('comuna')} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={!selectedRegion}
              >
                <option value="">Seleccionar...</option>
                {availableComunas.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.comuna && <p className="text-red-500 text-xs mt-1">{errors.comuna.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <input {...register('direccion')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad Fardos</label>
            <input 
              type="number" 
              {...register('cantidadFardos', { valueAsNumber: true })} 
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
            {errors.cantidadFardos && <p className="text-red-500 text-xs mt-1">{errors.cantidadFardos.message}</p>}
          </div>
        </div>

        {/* Transport Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Selección de Transporte</h3>
          
          {!selectedComuna ? (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Selecciona una comuna para ver transportes disponibles</p>
            </div>
          ) : filteredTransports.length === 0 ? (
            <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg border border-dashed border-red-300">
              <p>No hay transportes disponibles para esta comuna.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredTransports.map(transport => {
                const cost = transport.costoBase + (transport.costoPorFardo * (quantity || 1));
                const isRecommended = transport.id === recommendedTransportId;
                const isSelected = selectedTransportId === transport.id;

                return (
                  <div 
                    key={transport.id}
                    onClick={() => setValue('transporteId', transport.id!)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition-all relative",
                      isSelected 
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                    )}
                  >
                    {isRecommended && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center shadow-sm">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        MEJOR OPCIÓN
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900">{transport.nombre}</h4>
                        <div className="flex items-center text-xs text-slate-500 mt-1 space-x-3">
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {transport.tiempoEntrega}</span>
                          <span className="capitalize bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">{transport.tipoServicio}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(cost)}</p>
                        <p className="text-xs text-slate-400">Total estimado</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {errors.transporteId && <p className="text-red-500 text-xs mt-1">{errors.transporteId.message}</p>}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <div className="flex items-center">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </div>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
        >
          <div className="flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Despacho
          </div>
        </button>
      </div>
    </form>
  );
}
