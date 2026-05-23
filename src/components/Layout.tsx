import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header: Sticky on smaller viewport heights/widths */}
      <header className="md:hidden flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
        <div className="flex items-center space-x-3">
          <img 
            src="/icon.svg" 
            className="w-8 h-8 rounded-lg shadow bg-slate-950 p-0.5 border border-slate-700" 
            alt="Logo" 
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-blue-400 uppercase leading-none">Fabian - Track</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Logística</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Drawer Background Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Pane */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto md:ml-64 min-h-[calc(100vh-58px)] md:min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
