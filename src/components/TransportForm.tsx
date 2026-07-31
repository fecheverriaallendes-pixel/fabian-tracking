import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Transport, REGIONES_CHILE } from '../types';
import { useState } from 'react';
import { Loader2, Save, X, DollarSign, Tag } from 'lucide-react';

const transportSchema = z.object({
  nombre: z.string().min(3, 'El nombre es requerido'),
  regiones: z.array(z.string()).min(1, 'Selecciona al menos una región'),
  comunas: z.array(z.string()).min(1, 'Selecciona al menos una comuna'),
  tipoServicio: z.enum(['express', 'normal', 'cargo']),
  costoBase: z.number().min(0),
  costoPorFardo: z.number().min(0),
  tarifaReferencia: z.string().optional(),
  tiempoEntrega: z.string().min(1, 'Requerido'),
  telefono: z.string().min(8, 'Teléfono inválido'),
  email: z.string().email('Email inválido'),
  observaciones: z.string().optional(),
  activo: z.boolean(),
});

type TransportFormData = z.infer<typeof transportSchema>;

interface TransportFormProps {
  initialData?: Transport;
  onSubmit: (data: TransportFormData & { tarifasPorComuna?: Record<string, number> }) => Promise<void>;
  onCancel: () => void;
}

export function TransportForm({ initialData, onSubmit, onCancel }: TransportFormProps) {
  const [loading, setLoading] = useState(false);
  const [tarifasPorComuna, setTarifasPorComuna] = useState<Record<string, number>>(initialData?.tarifasPorComuna || {});
  const [tarifaSearchTerm, setTarifaSearchTerm] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TransportFormData>({
    resolver: zodResolver(transportSchema),
    defaultValues: initialData || {
      activo: true,
      regiones: [],
      comunas: [],
      tipoServicio: 'normal',
      costoBase: 0,
      costoPorFardo: 0,
    },
  });

  const selectedRegiones = watch('regiones');
  const selectedComunas = watch('comunas');

  const handleFormSubmit = async (data: TransportFormData) => {
    setLoading(true);
    try {
      // Clean up tariffs for comunas that are no longer selected
      const currentSelectedSet = new Set(data.comunas);
      const cleanedTarifas: Record<string, number> = {};
      Object.entries(tarifasPorComuna).forEach(([comuna, precio]) => {
        if (currentSelectedSet.has(comuna) && typeof precio === 'number' && !isNaN(precio)) {
          cleanedTarifas[comuna] = precio;
        }
      });

      await onSubmit({
        ...data,
        tarifasPorComuna: cleanedTarifas,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChange = (region: string, isChecked: boolean) => {
    const currentRegiones = selectedRegiones || [];
    if (isChecked) {
      setValue('regiones', [...currentRegiones, region]);
    } else {
      setValue('regiones', currentRegiones.filter(r => r !== region));
      // Also remove comunas from this region
      const regionData = REGIONES_CHILE.find(r => r.nombre === region);
      if (regionData) {
        const currentComunas = watch('comunas') || [];
        setValue('comunas', currentComunas.filter(c => !regionData.comunas.includes(c)));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Transporte</label>
          <input {...register('nombre')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="Ej: Transportes Tamarindo" />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Servicio</label>
          <select {...register('tipoServicio')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium">
            <option value="normal">Normal</option>
            <option value="express">Express</option>
            <option value="cargo">Cargo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Costo Base General ($)</label>
          <input type="number" {...register('costoBase', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-slate-800" />
          {errors.costoBase && <p className="text-red-500 text-xs mt-1">{errors.costoBase.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Costo por Fardo ($)</label>
          <input type="number" {...register('costoPorFardo', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-slate-800" />
          {errors.costoPorFardo && <p className="text-red-500 text-xs mt-1">{errors.costoPorFardo.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Tarifa Referencia (Texto)</label>
          <input {...register('tarifaReferencia')} placeholder="Ej: $45.000 - $60.000 (Opcional, reemplaza costo base en catálogo)" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          <p className="text-xs text-slate-500 mt-1">Si se completa, este texto se mostrará en lugar del costo base general.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo Entrega</label>
          <input {...register('tiempoEntrega')} placeholder="Ej: 24-48 hrs" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          {errors.tiempoEntrega && <p className="text-red-500 text-xs mt-1">{errors.tiempoEntrega.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
          <input {...register('telefono')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input {...register('email')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div className="flex items-center space-x-2 pt-6">
          <input type="checkbox" {...register('activo')} id="activo" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
          <label htmlFor="activo" className="text-sm font-medium text-slate-700 cursor-pointer">Transporte Activo</label>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Cobertura (Regiones y Comunas)</h3>
        <div className="space-y-4">
          {REGIONES_CHILE.map((region) => (
            <div key={region.nombre} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id={`region-${region.nombre}`}
                  checked={selectedRegiones?.includes(region.nombre)}
                  onChange={(e) => handleRegionChange(region.nombre, e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor={`region-${region.nombre}`} className="ml-2 text-sm font-bold text-slate-800 cursor-pointer">
                  {region.nombre}
                </label>
              </div>
              
              {selectedRegiones?.includes(region.nombre) && (
                <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {region.comunas.map((comuna) => (
                    <div key={comuna} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`comuna-${comuna}`}
                        value={comuna}
                        {...register('comunas')}
                        className="h-3 w-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor={`comuna-${comuna}`} className="ml-2 text-xs text-slate-600 cursor-pointer">
                        {comuna}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {errors.regiones && <p className="text-red-500 text-xs">{errors.regiones.message}</p>}
          {errors.comunas && <p className="text-red-500 text-xs">{errors.comunas.message}</p>}
        </div>
      </div>

      {/* Per-Commune Specific Pricing Section */}
      {selectedComunas && selectedComunas.length > 0 && (
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/80 p-4 rounded-2xl border border-blue-100">
            <div>
              <h3 className="text-sm font-black text-blue-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Tarifas y Precios Diferenciados por Comuna
              </h3>
              <p className="text-xs text-blue-800/90 mt-0.5 font-medium">
                Asigna precios específicos por ciudad (ej. Paine $20.000, La Florida $8.000, Calera de Tango $10.000). Las comunas sin tarifa asignada usarán el costo base general (${watch('costoBase') || 0}).
              </p>
            </div>
            {selectedComunas.length > 4 && (
              <input
                type="text"
                placeholder="🔍 Filtrar comuna..."
                value={tarifaSearchTerm}
                onChange={(e) => setTarifaSearchTerm(e.target.value)}
                className="px-3 py-1.5 bg-white border border-blue-200 text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
              />
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 max-h-80 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedComunas
              .filter(c => !tarifaSearchTerm || c.toLowerCase().includes(tarifaSearchTerm.toLowerCase()))
              .map((comuna) => {
                const tieneTarifaEspecial = tarifasPorComuna[comuna] !== undefined;
                return (
                  <div 
                    key={comuna} 
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      tieneTarifaEspecial ? 'bg-emerald-50/50 border-emerald-300 shadow-sm' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate block" title={comuna}>
                        {comuna}
                      </span>
                      {tieneTarifaEspecial && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                          Especial
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        placeholder={`${watch('costoBase') || 0}`}
                        value={tarifasPorComuna[comuna] !== undefined ? tarifasPorComuna[comuna] : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTarifasPorComuna(prev => {
                            const next = { ...prev };
                            if (val === '' || isNaN(Number(val))) {
                              delete next[comuna];
                            } else {
                              next[comuna] = Number(val);
                            }
                            return next;
                          });
                        }}
                        className="w-24 px-2 py-1.5 text-xs font-mono font-black text-blue-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white shadow-inner"
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
        <textarea {...register('observaciones')} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </div>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-extrabold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-70 shadow-sm transition-all active:scale-98"
        >
          <div className="flex items-center">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Transporte
          </div>
        </button>
      </div>
    </form>
  );
}
