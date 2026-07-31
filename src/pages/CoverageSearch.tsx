import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Truck, Clock, DollarSign, X, Check, Copy, Tag } from 'lucide-react';
import { COMMUNES_CHILE } from '../lib/chile-data';
import { dbService } from '../services/db';
import { Transport } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

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
      const filtered = transports.filter(t => 
        t.activo && (
          t.comunas.includes(selectedComuna.c) || 
          (t.tarifasPorComuna && selectedComuna.c in t.tarifasPorComuna)
        )
      );
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
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-12"
    >
      <div className="relative bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 rounded-3xl shadow-xl border border-slate-800" id="search-banner">
        {/* Glow container wrapper with overflow-hidden to clip blurs without clipping the text/dropdown */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {/* Colorful gradient glows */}
          <div className="absolute top-0 right-0 p-1 bg-gradient-to-bl from-blue-500/20 via-transparent to-transparent w-80 h-80 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 bg-pink-500/10 w-72 h-72 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-8 md:p-10 text-white space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border border-indigo-500/20">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              Soporte Inteligente
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Consulta de Cobertura</h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Escribe el nombre de cualquier comuna de Chile para ver instantáneamente qué empresas logísticas prestan sus servicios, tiempos de entrega y costos asociados.
            </p>
          </div>

          <div className="max-w-xl relative">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur group-focus-within:blur-md opacity-50 transition-all pointer-events-none" />
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
                placeholder="Busca por comuna. Ej: Puente Alto, Concepción, Coquimbo..."
                className="w-full pl-12 pr-12 py-4 bg-slate-950/80 text-white rounded-2xl shadow-inner border border-slate-800 focus:border-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-base placeholder-slate-500 transition-all font-medium"
                autoFocus
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {!selectedComuna && filteredCommunes.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 space-y-1"
                >
                  {filteredCommunes.map((commune) => (
                    <button
                      key={`${commune.c}-${commune.r}`}
                      onClick={() => handleSelectCommune(commune)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800/80 flex items-center justify-between group rounded-xl transition-all"
                    >
                      <span className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors text-sm">
                        {commune.c}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg group-hover:bg-blue-950 group-hover:text-blue-400 transition-all">
                        {commune.r}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="space-y-4 min-h-[300px]">
        {selectedComuna && (
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center">
              Transportes disponibles para: <span className="text-blue-600 ml-2 px-3 py-1 bg-blue-50 rounded-2xl border border-blue-100 font-bold">{selectedComuna.c}</span>
            </h2>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-3.5 py-1.5 rounded-full">
              {selectedComuna.r}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedComuna && availableTransports.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200"
          >
            <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4 border border-slate-100">
              <Truck className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Sin cobertura directa</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
              No encontramos transportes registrados que lleguen directamente a {selectedComuna.c} en estado activo.
            </p>
          </motion.div>
        ) : selectedComuna && availableTransports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTransports.map((transport, index) => (
              <motion.div 
                key={transport.id} 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 90, damping: 14 }}
                className="bg-white rounded-3xl border border-slate-100 hover:border-blue-400 focus-within:border-blue-400 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 p-6 group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-15 transition-all duration-300">
                  <Truck className="w-24 h-24 text-blue-600 transform rotate-12 translate-x-8 -translate-y-8" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{transport.nombre}</h3>
                      <span className={cn(
                        "inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2 border",
                        transport.tipoServicio === 'express' ? "bg-purple-50 text-purple-700 border-purple-100" :
                        transport.tipoServicio === 'cargo' ? "bg-orange-50 text-orange-700 border-orange-100" :
                        "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {transport.tipoServicio}
                      </span>
                    </div>
                  </div>

                  {/* Special Tariff Alert Banner if applicable */}
                  {selectedComuna && transport.tarifasPorComuna && typeof transport.tarifasPorComuna[selectedComuna.c] === 'number' && (
                    <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3 flex items-center justify-between text-emerald-950 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-emerald-900">Tarifa Especial {selectedComuna.c}</p>
                          <p className="text-[10px] font-semibold text-emerald-700">Precio configurado por comuna</p>
                        </div>
                      </div>
                      <span className="text-sm font-black font-mono text-emerald-800 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                        {formatCurrency(transport.tarifasPorComuna[selectedComuna.c])}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2.5 text-sm bg-slate-50/70 rounded-2xl p-4 border border-slate-100 font-medium">
                    <div className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                        <span>Estimado</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{transport.tiempoEntrega}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-slate-400" />
                        <span>{selectedComuna && transport.tarifasPorComuna && typeof transport.tarifasPorComuna[selectedComuna.c] === 'number' ? `Tarifa ${selectedComuna.c}` : 'Costo Base General'}</span>
                      </div>
                      <span className="font-extrabold text-slate-900 text-base font-mono flex items-center gap-1.5">
                        {selectedComuna && transport.tarifasPorComuna && typeof transport.tarifasPorComuna[selectedComuna.c] === 'number' ? (
                          <>
                            <span className="text-emerald-700 font-black text-lg">{formatCurrency(transport.tarifasPorComuna[selectedComuna.c])}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded border border-emerald-200">
                              Especial
                            </span>
                          </>
                        ) : (
                          transport.tarifaReferencia || formatCurrency(transport.costoBase)
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => {
                        const hasCustom = selectedComuna && transport.tarifasPorComuna && typeof transport.tarifasPorComuna[selectedComuna.c] === 'number';
                        const costo = hasCustom 
                          ? `${formatCurrency(transport.tarifasPorComuna![selectedComuna.c])} (Tarifa diferenciada)`
                          : (transport.tarifaReferencia || formatCurrency(transport.costoBase));
                        const text = `✅ *${transport.nombre}* llega a *${selectedComuna.c}*\n⏱ Tiempo: ${transport.tiempoEntrega}\n💰 Costo ref: ${costo}`;
                        navigator.clipboard.writeText(text);
                        toast.success(`Datos de ${transport.nombre} copiados al portapapeles`);
                      }}
                      className="w-full py-3 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-600/10 transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Ficha Logística</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-40">
            <Search className="mx-auto h-12 w-12 text-slate-300 mb-2 stroke-[1.5] animate-pulse" />
            <p className="text-slate-400 text-sm font-medium">Comienza escribiendo una comuna arriba en el buscador...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
