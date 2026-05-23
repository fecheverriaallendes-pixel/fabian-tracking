import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck, Package, Users, Settings, LogOut, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Cobertura', href: '/cobertura', icon: Search },
  { name: 'Transportes', href: '/transportes', icon: Truck },
  { name: 'Despachos', href: '/despachos', icon: Package },
  { name: 'Usuarios', href: '/usuarios', icon: Users, adminOnly: true },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64 fixed left-0 top-0 bottom-0 shadow-xl z-50">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-blue-600">FABIAN - TRACK</h1>
        <span className="text-xs font-medium text-slate-500">Info transporte</span>
        <p className="text-xs text-slate-400 mt-1">Gestión de Logística</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && user?.rol !== 'admin') return null;
          
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group",
                isActive 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center mb-4 px-2">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            {user?.nombre?.charAt(0) || 'U'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user?.nombre}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.rol}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center px-4 py-2 text-sm font-medium text-slate-300 rounded-lg hover:bg-red-900/20 hover:text-red-400 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
