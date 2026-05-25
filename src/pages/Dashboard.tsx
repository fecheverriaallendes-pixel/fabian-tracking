import { useEffect, useState, useMemo } from 'react';
import { dbService } from '../services/db';
import { Truck, MapPin, Search, Mail, Phone, Clock, Sparkles, Calendar, ArrowRight, ShieldCheck, LayoutDashboard, X, Copy } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { Transport } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { COMMUNES_CHILE } from '../lib/chile-data';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transportsList, setTransportsList] = useState<Transport[]>([]);
  const [stats, setStats] = useState({
    totalTransports: 0,
    activeTransports: 0,
    uniqueCommunes: 0,
    averageBaseCost: 0,
    expressCount: 0,
    normalCount: 0,
    cargoCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [runningDiag, setRunningDiag] = useState(false);

  // States for integrated coverage search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComuna, setSelectedComuna] = useState<{c: string, r: string} | null>(null);
  const [availableTransports, setAvailableTransports] = useState<Transport[]>([]);

  // Filter communes based on search term
  const filteredCommunes = useMemo(() => {
    if (!searchTerm || selectedComuna) return [];
    const term = searchTerm.toLowerCase();
    return COMMUNES_CHILE.filter(c => 
      c.c.toLowerCase().includes(term)
    ).slice(0, 5); // Limit to 5 results for ultra-fast response on mobile
  }, [searchTerm, selectedComuna]);

  // Update available transports when selectedComuna changes
  useEffect(() => {
    if (selectedComuna && transportsList.length > 0) {
      const filtered = transportsList.filter(t => t.comunas.includes(selectedComuna.c) && t.activo);
      setAvailableTransports(filtered);
    } else {
      setAvailableTransports([]);
    }
  }, [selectedComuna, transportsList]);

  const handleSelectCommune = (commune: {c: string, r: string}) => {
    setSelectedComuna(commune);
    setSearchTerm(commune.c);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedComuna(null);
    setAvailableTransports([]);
  };

  const runDiagnostics = async () => {
    setRunningDiag(true);
    setDebugInfo('Iniciando diagnóstico en el navegador...\n');
    try {
      setDebugInfo(prev => prev + '1. Verificando conectividad local a "/api/transports"...\n');
      const res = await fetch('/api/transports');
      setDebugInfo(prev => prev + `   Estado de respuesta HTTP: ${res.status} ${res.statusText}\n`);
      const text = await res.text();
      setDebugInfo(prev => prev + `   Tamaño de respuesta: ${text.length} bytes\n`);
      
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          setDebugInfo(prev => prev + `   Formato JSON Correcto: Se detecta Array con ${parsed.length} transportistas.\n`);
          if (parsed.length > 0) {
            setDebugInfo(prev => prev + `   Primer ítem: ${JSON.stringify(parsed[0]).substring(0, 100)}...\n`);
            setTransportsList(parsed);
            
            const activeTransportsList = parsed.filter(t => t.activo);
            const communesSet = new Set<string>();
            activeTransportsList.forEach(t => {
              t.comunas?.forEach(c => communesSet.add(c));
            });
            const avgBaseCost = Math.round(activeTransportsList.reduce((sum, t) => sum + (t.costoBase || 0), 0) / (activeTransportsList.length || 1));
            
            setStats({
              totalTransports: parsed.length,
              activeTransports: activeTransportsList.length,
              uniqueCommunes: communesSet.size,
              averageBaseCost: avgBaseCost,
              expressCount: activeTransportsList.filter(t => t.tipoServicio === 'express').length,
              normalCount: activeTransportsList.filter(t => t.tipoServicio === 'normal').length,
              cargoCount: activeTransportsList.filter(t => t.tipoServicio === 'cargo').length,
            });
            setError(null);
            toast.success("¡Datos recuperados y actualizados exitosamente en navegador!");
          } else {
            setDebugInfo(prev => prev + `   La respuesta es un array vacío []. El servidor no tiene transportistas sembrados o sincronizados.\n`);
          }
        } else {
          setDebugInfo(prev => prev + `   ¿La respuesta NO es un array?: ${text.substring(0, 120)}\n`);
        }
      } catch (e: any) {
        setDebugInfo(prev => prev + `   Fallo al decodificar JSON: ${e.message}\n   Respuesta bruta (primeros 200 caracteres): "${text.substring(0, 200)}"\n`);
      }
    } catch (err: any) {
      setDebugInfo(prev => prev + `   Fallo total de la petición: ${err.message}\n`);
    } finally {
      setRunningDiag(false);
    }
  };

  const forseDatabaseRestore = async () => {
    try {
      setDebugInfo(prev => prev + '\nEnviando comando de reconstrucción de Base de Datos...\n');
      const resBackup = await fetch('/api/backup');
      const dataBackup = await resBackup.json();
      
      // If empty, restore defaults
      if (!dataBackup.transports || dataBackup.transports.length === 0) {
        setDebugInfo(prev => prev + '   La Base de Datos del Backend estaba vacía. Insertando semilla nacional completa...\n');
      }
      
      const restoreRes = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: dataBackup.users && dataBackup.users.length > 0 ? dataBackup.users : [
            { uid: 'fabian', email: 'f.echeverria.allendes@gmail.com', nombre: 'Fabián Maestro', rol: 'admin', password: '2024' }
          ],
          transports: dataBackup.transports && dataBackup.transports.length > 0 ? dataBackup.transports : [],
          shipments: dataBackup.shipments || []
        })
      });
      
      if (restoreRes.ok) {
        toast.success("¡Base de datos nacional restablecida!");
        setDebugInfo(prev => prev + '   ¡Base de datos restablecida correctamente en SQLite del servidor!\n');
        // Reload
        const transports = await dbService.getTransports();
        setTransportsList(transports);
        const activeTransportsList = transports.filter(t => t.activo);
        const communesSet = new Set<string>();
        activeTransportsList.forEach(t => {
          t.comunas?.forEach(c => communesSet.add(c));
        });
        setStats({
          totalTransports: transports.length,
          activeTransports: activeTransportsList.length,
          uniqueCommunes: communesSet.size,
          averageBaseCost: activeTransportsList.length > 0 ? Math.round(activeTransportsList.reduce((sum, t) => sum + t.costoBase, 0) / activeTransportsList.length) : 0,
          expressCount: activeTransportsList.filter(t => t.tipoServicio === 'express').length,
          normalCount: activeTransportsList.filter(t => t.tipoServicio === 'normal').length,
          cargoCount: activeTransportsList.filter(t => t.tipoServicio === 'cargo').length,
        });
        setError(null);
      } else {
        setDebugInfo(prev => prev + '   Fallo al reconstruir base de datos.\n');
      }
    } catch (err: any) {
      setDebugInfo(prev => prev + `   Error de reconstrucción: ${err.message}\n`);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const transports = await dbService.getTransports();
        setTransportsList(transports);

        const activeTransportsList = transports.filter(t => t.activo);
        const activeCount = activeTransportsList.length;
        const totalCount = transports.length;

        // Count unique covered communes
        const communesSet = new Set<string>();
        activeTransportsList.forEach(t => {
          t.comunas?.forEach(c => communesSet.add(c));
        });
        const uniqueCommunesCount = communesSet.size;

        // Calculate average base cost
        const baseCostTransports = activeTransportsList.filter(t => t.costoBase > 0);
        const avgBaseCost = baseCostTransports.length > 0 
          ? Math.round(baseCostTransports.reduce((sum, t) => sum + t.costoBase, 0) / baseCostTransports.length)
          : 0;

        // Service types distribution
        const expressCount = activeTransportsList.filter(t => t.tipoServicio === 'express').length;
        const normalCount = activeTransportsList.filter(t => t.tipoServicio === 'normal').length;
        const cargoCount = activeTransportsList.filter(t => t.tipoServicio === 'cargo').length;

        setStats({
          totalTransports: totalCount,
          activeTransports: activeCount,
          uniqueCommunes: uniqueCommunesCount,
          averageBaseCost: avgBaseCost,
          expressCount,
          normalCount,
          cargoCount,
        });

      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        setError(error.message || String(error));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
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
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12"
    >
      {/* Diagnostics and Dynamic Self-healing Panel */}
      {(error || stats.totalTransports === 0) && (
        <div className="bg-red-50/50 border border-red-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3 text-red-800">
            <div className="p-2.5 bg-red-100 rounded-2xl text-red-600">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Centro de Diagnóstico & Sincronización Directa</h3>
              <p className="text-xs text-red-600/90 font-medium">
                Se detectó que el navegador reporta 0 flotas instaladas o un problema de conexión con la base de datos nacional.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={runDiagnostics}
              disabled={runningDiag}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              id="diag-btn-test"
            >
              {runningDiag ? "Diagnosticando..." : "🔍 Ejecutar Test de Datos"}
            </button>
            <button
              onClick={forseDatabaseRestore}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm"
              id="diag-btn-restore"
            >
              ⚡ Re-inicializar Servidor y Base de Datos
            </button>
          </div>

          {debugInfo && (
            <div className="mt-3 p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl border border-slate-800 overflow-x-auto max-h-60 whitespace-pre-wrap">
              {debugInfo}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-100 text-red-900 text-xs rounded-xl border border-red-200">
              <strong>Error reportado por el cargador:</strong> {error}
            </div>
          )}
        </div>
      )}

      {/* Header section with modern energetic style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-1 bg-gradient-to-bl from-blue-500/20 via-transparent to-transparent w-96 h-96 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 bg-indigo-500/10 w-64 h-64 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 mr-1 animate-pulse text-blue-400" />
            Portal del Transportes
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            ¡Hola, {user?.nombre || 'Bienvenido'}! 👋
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Este es tu portal ágil de consultas de cobertura y tarifas de transportes terrestres, aéreos y de carga a nivel nacional.
          </p>
        </div>

        <div className="relative z-10 mt-6 md:mt-0 flex items-center space-x-2 bg-slate-800/85 backdrop-blur-md px-4.5 py-2.5 rounded-2xl border border-slate-700/50">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Hoy</p>
            <p className="text-xs text-slate-200 font-semibold">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Empresas Registradas',
            value: stats.totalTransports,
            sub: `${stats.activeTransports} flotas activas`,
            icon: Truck,
            color: 'from-blue-500 to-indigo-500',
            bgLight: 'bg-blue-50',
            textColor: 'text-blue-600',
            borderGlow: 'hover:shadow-blue-500/10',
          },
          {
            title: 'Alcance / Cobertura',
            value: `${stats.uniqueCommunes} comunas`,
            sub: 'Conectividad a Todo Chile',
            icon: MapPin,
            color: 'from-emerald-500 to-teal-500',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-600',
            borderGlow: 'hover:shadow-emerald-500/10',
          },
          {
            title: 'Tarifa Base Promedio',
            value: formatCurrency(stats.averageBaseCost),
            sub: 'Costo de referencia',
            icon: ShieldCheck,
            color: 'from-violet-500 to-indigo-500',
            bgLight: 'bg-indigo-50',
            textColor: 'text-indigo-650',
            borderGlow: 'hover:shadow-violet-500/10',
          },
          {
            title: 'Foco Informativo',
            value: 'Coberturas',
            sub: 'Consulta tarifas por ciudad',
            icon: Search,
            color: 'from-pink-500 to-rose-500',
            bgLight: 'bg-rose-50',
            textColor: 'text-rose-600',
            borderGlow: 'hover:shadow-pink-500/10',
          }
        ].map((kpi) => (
          <motion.div
            key={kpi.title}
            variants={itemVariants}
            className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${kpi.borderGlow}`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${kpi.color}`} />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">{kpi.title}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                <p className="text-xs font-semibold text-slate-500">{kpi.sub}</p>
              </div>
              <div className={`p-4 rounded-2xl ${kpi.bgLight} ${kpi.textColor}`}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Integrated Live Search Engine Block */}
      <motion.div 
        variants={itemVariants}
        className="bg-slate-900 rounded-3xl text-white shadow-xl border border-slate-800 p-6 md:p-8 relative overflow-hidden"
      >
        {/* Decorative ambient blurs */}
        <div className="absolute top-0 right-0 p-1 bg-gradient-to-bl from-blue-500/10 via-transparent to-transparent w-72 h-72 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 bg-indigo-500/10 w-72 h-72 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 bg-blue-500/10 text-blue-400 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border border-blue-500/20">
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span>Buscador de Cobertura Express</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Consulta Directa por Comuna</h2>
            <p className="text-slate-300 text-sm max-w-xl font-medium">
              Escribe la ciudad o comuna de Chile para ver de inmediato los transportes con cobertura y tarifas autorizadas.
            </p>
          </div>

          <div className="relative max-w-xl">
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
                placeholder="Escribe la comuna. Ej: Puente Alto, Concepción..."
                className="w-full pl-12 pr-12 py-3.5 bg-slate-950/80 text-white rounded-2xl border border-slate-800 focus:border-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm placeholder-slate-500 transition-all font-medium"
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Autocomplete suggestions */}
            <AnimatePresence>
              {!selectedComuna && filteredCommunes.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-1.5 space-y-0.5"
                >
                  {filteredCommunes.map((commune) => (
                    <button
                      key={`${commune.c}-${commune.r}`}
                      onClick={() => handleSelectCommune(commune)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 flex items-center justify-between group rounded-xl transition-all"
                    >
                      <span className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors text-sm">
                        {commune.c}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded group-hover:bg-blue-950 group-hover:text-blue-400 transition-all">
                        {commune.r}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Area */}
          <div className="space-y-4 pt-1">
            {selectedComuna ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Cobertura en:</span>
                    <h3 className="text-base font-black text-blue-400 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 inline-block">
                      {selectedComuna.c}
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 self-start sm:self-auto">
                    {selectedComuna.r}
                  </span>
                </div>

                {availableTransports.length === 0 ? (
                  <div className="text-center py-6 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                    <Truck className="mx-auto h-8 w-8 text-slate-600 mb-1.5 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-300">Sin cobertura directa</p>
                    <p className="text-xs text-slate-500 mt-0.5">No hay transportistas activos registrados para esta comuna.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableTransports.map((transport) => (
                      <div 
                        key={transport.id}
                        className="bg-slate-950/60 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all p-4.5 flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-black tracking-tight text-white uppercase truncate max-w-[140px]">{transport.nombre}</h4>
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                              transport.tipoServicio === 'express' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                              transport.tipoServicio === 'cargo' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                              "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                              {transport.tipoServicio}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs font-semibold text-slate-300 bg-slate-900/50 rounded-xl p-3 border border-slate-800/50">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-550 text-[10px]">T. Estimado</span>
                              <span className="text-slate-100 font-bold">{transport.tiempoEntrega}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-550 text-[10px]">Costo Base</span>
                              <span className="text-blue-400 font-black font-mono">
                                {transport.tarifaReferencia || formatCurrency(transport.costoBase)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const costo = transport.tarifaReferencia || formatCurrency(transport.costoBase);
                            const text = `✅ *${transport.nombre}* llega a *${selectedComuna.c}*\n⏱ Tiempo: ${transport.tiempoEntrega}\n💰 Costo ref: ${costo}`;
                            navigator.clipboard.writeText(text);
                            toast.success(`Datos de ${transport.nombre} copiados al portapapeles`);
                          }}
                          className="w-full py-2.5 text-[10px] font-black text-blue-400 bg-blue-500/10 rounded-xl hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-600/10 transition-all active:scale-95 flex items-center justify-center space-x-1.5 border border-blue-500/20"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar Ficha Logística</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3.5 bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">¿Estás buscando a dónde enviar?</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">La base de datos nacional cubre {stats.uniqueCommunes} comunas activas de Chile.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Grid of details: Service classification and transports list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Service types statistics */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-6"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Variedad de Servicios</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Clasificación de transportes activos de fardos</p>
          </div>

          <div className="space-y-4">
            {[
              { type: 'Express', count: stats.expressCount, desc: 'Entregas prioritarias (24 hrs)', color: 'bg-blue-500' },
              { type: 'Normal', count: stats.normalCount, desc: 'Servicio estándar (48-72 hrs)', color: 'bg-indigo-500' },
              { type: 'Cargo / Camión', count: stats.cargoCount, desc: 'Transporte de alta capacidad', color: 'bg-purple-500' },
            ].map(service => (
              <div key={service.type} className="flex items-center justify-between p-4.5 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div className="flex items-center space-x-3.5">
                  <div className={`h-3.5 w-3.5 rounded-full ${service.color}`} />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{service.type}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">{service.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-slate-900">{service.count}</span>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Líneas</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl text-[11px] text-slate-500 leading-relaxed font-semibold">
            ℹ️ Los administradores pueden gestionar, agregar o dar de baja estas líneas desde la pestaña de <strong>"Transportes"</strong>.
          </div>
        </motion.div>

        {/* Dynamic Transport Directory */}
        <motion.div 
          variants={itemVariants}
          className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col"
        >
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Líneas de Carga Habilitadas</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Flotas de transportistas activos</p>
            </div>
            <button 
              onClick={() => navigate('/transportes')}
              className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl transition-colors"
            >
              Ver Todos
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[340px] pr-1">
            {transportsList.filter(t => t.activo).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <Truck className="h-10 w-10 text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-sm font-semibold">No hay líneas de transporte registradas</p>
              </div>
            ) : (
              transportsList
                .filter(t => t.activo)
                .slice(0, 5)
                .map((transport) => (
                  <div 
                    key={transport.id} 
                    className="flex justify-between items-start md:items-center p-4 rounded-2xl hover:bg-slate-50 border border-slate-100/30 hover:border-slate-100 transition-colors gap-4"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight truncate max-w-[170px]">{transport.nombre}</h4>
                        <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider space-x-2 mt-0.5">
                          <span className="text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 capitalize">{transport.tipoServicio}</span>
                          <span className="flex items-center bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            <Clock className="w-3 h-3 mr-0.5 text-slate-400" />
                            {transport.tiempoEntrega}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <p className="text-indigo-600 font-black text-sm font-mono">
                        {transport.tarifaReferencia ? transport.tarifaReferencia : formatCurrency(transport.costoBase)}
                      </p>
                      <span className="text-[9px] font-extrabold uppercase bg-slate-50 text-slate-400 px-1.5 py-0.5 border border-slate-100 rounded tracking-wider block">
                        {transport.comunas.length} ciudades
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
