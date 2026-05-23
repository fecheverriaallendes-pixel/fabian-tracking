import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Transport, REGIONES_CHILE } from '../types';
import { useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';

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
  onSubmit: (data: TransportFormData) => Promise<void>;
  onCancel: () => void;
}

export function TransportForm({ initialData, onSubmit, onCancel }: TransportFormProps) {
  const [loading, setLoading] = useState(false);
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

  const handleFormSubmit = async (data: TransportFormData) => {
    setLoading(true);
    try {
      await onSubmit(data);
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

  const handleComunaChange = (comuna: string, isChecked: boolean) => {
    const currentComunas = watch('comunas') || [];
    if (isChecked) {
      setValue('comunas', [...currentComunas, comuna]);
    } else {
      setValue('comunas', currentComunas.filter(c => c !== comuna));
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Transporte</label>
          <input {...register('nombre')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Servicio</label>
          <select {...register('tipoServicio')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="normal">Normal</option>
            <option value="express">Express</option>
            <option value="cargo">Cargo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Costo Base ($)</label>
          <input type="number" {...register('costoBase', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          {errors.costoBase && <p className="text-red-500 text-xs mt-1">{errors.costoBase.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Costo por Fardo ($)</label>
          <input type="number" {...register('costoPorFardo', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          {errors.costoPorFardo && <p className="text-red-500 text-xs mt-1">{errors.costoPorFardo.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Tarifa Referencia (Texto)</label>
          <input {...register('tarifaReferencia')} placeholder="Ej: $45.000 - $60.000 (Opcional, reemplaza costo base)" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <p className="text-xs text-slate-500 mt-1">Si se completa, este texto se mostrará en lugar del costo base numérico.</p>
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
          <input type="checkbox" {...register('activo')} id="activo" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
          <label htmlFor="activo" className="text-sm font-medium text-slate-700">Transporte Activo</label>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Cobertura (Regiones y Comunas)</h3>
        <div className="space-y-4">
          {REGIONES_CHILE.map((region) => (
            <div key={region.nombre} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id={`region-${region.nombre}`}
                  checked={selectedRegiones?.includes(region.nombre)}
                  onChange={(e) => handleRegionChange(region.nombre, e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor={`region-${region.nombre}`} className="ml-2 text-sm font-bold text-slate-800">
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
                        className="h-3 w-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor={`comuna-${comuna}`} className="ml-2 text-xs text-slate-600">
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

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
        <textarea {...register('observaciones')} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
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
            Guardar Transporte
          </div>
        </button>
      </div>
    </form>
  );
}
