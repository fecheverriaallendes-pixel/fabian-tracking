import { useState, ChangeEvent } from 'react';
import { dbService } from '../services/db';
import { Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await dbService.exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logitrack-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Respaldo descargado exitosamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al exportar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('ADVERTENCIA: Importar un respaldo SOBRESCRIBIRÁ todos los datos actuales. ¿Estás seguro de continuar?')) {
      event.target.value = '';
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        await dbService.importDatabase(json);
        toast.success('Datos restaurados exitosamente. Recargando...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error(error);
        toast.error('Error al importar: Archivo inválido');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500 mt-1">Administración del sistema y datos</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Data Management Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Respaldo de Datos</h2>
              <p className="text-sm text-slate-500">Descarga una copia de seguridad de toda la información</p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">
                Los datos se guardan localmente en este navegador. Te recomendamos realizar respaldos periódicos, especialmente antes de borrar el historial o cambiar de dispositivo.
              </p>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Descargar Respaldo (JSON)
          </button>
        </div>

        {/* Restore Data Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Restaurar Datos</h2>
              <p className="text-sm text-slate-500">Importa un archivo de respaldo previamente descargado</p>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 font-medium">
                ¡Atención! Esta acción reemplazará todos los datos actuales con los del archivo de respaldo. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <button
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Seleccionar Archivo de Respaldo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
