import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Truck, Clock, DollarSign, X } from 'lucide-react';
import { COMMUNES_CHILE } from '../lib/chile-data';
import { dbService } from '../services/db';
import { Transport } from '../types';
import { formatCurrency, cn } from '../lib/utils';

export default function CoverageSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComuna, setSelectedComuna] = useState<{c: string, r: string} | null>(null);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [availableTransports, setAvailableTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch transports on mount
  useEffect(() => {
    const fetchTransports = async () => {
      const data = await dbService.getTransports();
      setTransports(data);
      setLoading(false);
    };
    fetchTransports();
  }, []);

  // Filter communes based on search term
  const filteredCommunes = useMemo(() => {
    if (!searchTerm || selectedComuna) return [];
    const term = searchTerm.toLowerCase();
    return COMMUNES_CHILE.filter(c => 
      c.c.toLowerCase().includes(term)
    ).slice(0, 10); // Limit to 10 results for performance
  }, [searchTerm, selectedComuna]);

  // Update available transports when a commune is selected
  useEffect(() => {
    if (selectedComuna && transports.length > 0) {
      const filtered = transports.filter(t => t.comunas.includes(selectedComuna.c) && t.activo);
      setAvailableTransports(filtered);
    } else {
      setAvailableTransports([]);
    }
  }, [selectedComuna, transports]);

  const handleSelectCommune = (commune: {c: string, r: string}) => {
    setSelectedComuna(commune);
    setSearchTerm(commune.c);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedComuna(null);
    setAvailableTransports([]);
  };

  return (
    <div className="space-y-6">
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg">
        {/* Background decoration wrapper - clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Consulta de Cobertura</h1>
          <p className="text-blue-100 max-w-2xl mb-8">
            Escribe el nombre de la comuna para ver instantáneamente qué transportes llegan y sus tarifas.
          </p>

          <div className="max-w-xl relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (selectedComuna && e.target.value !== selectedComuna.c) {
                    setSelectedComuna(null);
                  }
                }}
                placeholder="Ej: Puente Alto, Concepción, Arica..."
                className="w-full pl-12 pr-12 py-4 bg-white text-slate-900 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/30 text-lg placeholder-slate-400 transition-shadow"
                autoFocus
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {!selectedComuna && filteredCommunes.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                {filteredCommunes.map((commune) => (
                  <button
                    key={`${commune.c}-${commune.r}`}
                    onClick={() => handleSelectCommune(commune)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                  >
                    <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                      {commune.c}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      {commune.r}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 min-h-[300px]">
        {selectedComuna && (
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              Resultados para <span className="text-blue-600 ml-2 px-2 py-0.5 bg-blue-50 rounded-lg border border-blue-100">{selectedComuna.c}</span>
            </h2>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {selectedComuna.r}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedComuna && availableTransports.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
              <Truck className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Sin cobertura directa</h3>
            <p className="text-slate-500 mt-1 max-w-md mx-auto">
              No encontramos transportes registrados que lleguen directamente a {selectedComuna.c}.
            </p>
          </div>
        ) : selectedComuna && availableTransports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500 stagger-100">
            {availableTransports.map((transport, index) => (
              <div 
                key={transport.id} 
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all duration-300 p-5 group relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Truck className="w-24 h-24 text-blue-600 transform rotate-12 translate-x-8 -translate-y-8" />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{transport.nombre}</h3>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-2 border",
                        transport.tipoServicio === 'express' ? "bg-purple-50 text-purple-700 border-purple-100" :
                        transport.tipoServicio === 'cargo' ? "bg-orange-50 text-orange-700 border-orange-100" :
                        "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {transport.tipoServicio}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                        <span>Tiempo</span>
                      </div>
                      <span className="font-semibold text-slate-900">{transport.tiempoEntrega}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                    <DollarSign className="w-4 h-4 mr-2 text-slate-400" />
                    <span>
                      Costo Ref: <span className="font-medium text-slate-900">
                        {transport.tarifaReferencia || formatCurrency(transport.costoBase)}
                      </span>
                    </span>
                  </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => {
                        const costo = transport.tarifaReferencia || formatCurrency(transport.costoBase);
                        const text = `✅ *${transport.nombre}* llega a *${selectedComuna.c}*\n⏱ Tiempo: ${transport.tiempoEntrega}\n💰 Costo ref: ${costo}`;
                        navigator.clipboard.writeText(text);
                        // Ideally show a toast here
                      }}
                      className="w-full py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all active:scale-95 flex items-center justify-center"
                    >
                      Copiar Respuesta
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-50">
            <Search className="mx-auto h-16 w-16 text-slate-200 mb-4" />
            <p className="text-slate-400 text-lg">Comienza escribiendo una comuna arriba...</p>
          </div>
        )}
      </div>
    </div>
  );
}
