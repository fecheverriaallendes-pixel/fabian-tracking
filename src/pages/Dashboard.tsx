import { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Truck, MapPin, Search, Mail, Phone, Clock, Sparkles, Calendar, ArrowRight, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Transport } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
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

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
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
      {/* Header section with modern energetic style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-1 bg-gradient-to-bl from-blue-500/20 via-transparent to-transparent w-96 h-96 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 bg-indigo-500/10 w-64 h-64 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 mr-1 animate-pulse text-blue-400" />
            Portal del Transportes
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200">
            ¡Hola, {user?.nombre || 'Bienvenido'}! 👋
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Este es tu portal ágil de consultas de cobertura y tarifas de transportes terrestres, aéreos y de carga a nivel nacional.
          </p>
        </div>

        <div className="relative z-10 mt-6 md:mt-0 flex items-center space-x-2 bg-slate-800/85 backdrop-blur-md px-4.5 py-2.5 rounded-2xl border border-slate-700/50">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Hoy</p>
            <p className="text-xs text-slate-105 font-semibold">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
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

      {/* Main Interactive Call-To-Action to check coverage */}
      <motion.div 
        variants={itemVariants}
        onClick={() => navigate('/cobertura')}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-lg overflow-hidden relative cursor-pointer group hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        <div className="absolute top-0 right-0 p-1 bg-gradient-to-l from-white/10 to-transparent w-80 h-80 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 bg-white/10 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-blue-200">
              <Search className="w-3 h-3" />
              <span>Buscador Rápido</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Buscar Cobertura por Ciudad</h2>
            <p className="text-blue-100 text-sm max-w-xl font-medium">
              ¿Quieres saber qué tarifas de fardo u opciones de transporte llegan a una ciudad en específico? Ingresa la comuna aquí para verificar tarifas y transportes disponibles al instante.
            </p>
          </div>
          <div className="bg-white/10 group-hover:bg-white/20 p-4 rounded-2xl transition-all self-end md:self-auto flex items-center justify-center border border-white/20">
            <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1.5 transition-transform" />
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
