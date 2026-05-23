import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck, Package, Users, Settings, LogOut, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Cobertura', href: '/cobertura', icon: Search },
  { name: 'Transportes', href: '/transportes', icon: Truck },
  { name: 'Usuarios', href: '/usuarios', icon: Users, adminOnly: true },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className={cn(
      "flex flex-col h-full bg-slate-900 text-white w-64 fixed left-0 top-0 bottom-0 shadow-xl z-50 transition-transform duration-300 ease-in-out md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-5 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img 
            src="/icon.svg" 
            className="w-10 h-10 rounded-xl shadow-lg border border-slate-700 bg-slate-950 p-1 shrink-0" 
            alt="Logo" 
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-sm font-black tracking-wider text-blue-400 uppercase leading-none">FABIAN - TRACK</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">LOGÍSTICA</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          title="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && user?.rol !== 'admin') return null;
          
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
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
            <p className="text-xs text-slate-405 capitalize">{user?.rol}</p>
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
