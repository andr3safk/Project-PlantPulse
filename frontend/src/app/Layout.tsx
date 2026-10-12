import { Link, NavLink, Outlet } from "react-router";
import { Sprout, LayoutDashboard, PlusCircle, ActivitySquare, Settings as SettingsIcon, Bell, Search, Menu } from "lucide-react";
import { useState } from "react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-green-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-slate-900 border-r border-green-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-emerald-200 dark:shadow-none shadow-md">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-500 dark:from-emerald-400 dark:to-green-300 tracking-tight">
            PlantPulse
          </span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Mis Plantas" />
          <NavItem to="/diagnosis" icon={<ActivitySquare size={20} />} label="Diagnóstico Temprano" />
          <NavItem to="/add" icon={<PlusCircle size={20} />} label="Añadir Planta" />
        </nav>

        <div className="p-4 border-t border-green-100 dark:border-slate-800 mt-auto transition-colors duration-300">
          <NavItem to="/settings" icon={<SettingsIcon size={20} />} label="Configuración" />
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-green-100 dark:border-slate-800 z-50 flex items-center justify-between px-4 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <Sprout className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">PlantPulse</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 border-b border-green-100 dark:border-slate-800 shadow-lg p-4 flex flex-col gap-2 transition-colors duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <MobileNavItem to="/" icon={<LayoutDashboard size={20} />} label="Mis Plantas" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavItem to="/diagnosis" icon={<ActivitySquare size={20} />} label="Diagnóstico Temprano" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavItem to="/add" icon={<PlusCircle size={20} />} label="Añadir Planta" onClick={() => setMobileMenuOpen(false)} />
            <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
            <MobileNavItem to="/settings" icon={<SettingsIcon size={20} />} label="Configuración" onClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden mt-16 md:mt-0">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-green-100 dark:border-slate-800 hidden md:flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-300">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar plantas..." 
              className="w-full pl-9 pr-4 py-2 bg-green-50/50 dark:bg-slate-950 border border-transparent dark:border-slate-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-200 dark:focus:border-emerald-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={`relative p-2 text-slate-400 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-green-50 dark:hover:bg-slate-800 rounded-full transition-colors ${notificationsOpen ? 'bg-green-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400' : ''}`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute top-full right-12 mt-2 w-80 bg-white dark:bg-slate-900 border border-green-100 dark:border-slate-800 shadow-xl rounded-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-green-50 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notificaciones</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">2 nuevas</span>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    <div className="p-4 border-b border-green-50 dark:border-slate-800 hover:bg-green-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-800 dark:text-slate-200"><strong>Serpientina</strong> necesita agua pronto. La humedad está al 15%.</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hace 2 horas</p>
                      </div>
                    </div>
                    <div className="p-4 border-b border-green-50 dark:border-slate-800 hover:bg-green-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-800 dark:text-slate-200">Temperatura elevada en la <strong>Sala de Estar</strong> (29°C).</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hace 5 horas</p>
                      </div>
                    </div>
                    <div className="p-4 hover:bg-green-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex gap-3 opacity-70">
                      <div className="mt-1 w-2 h-2 rounded-full bg-transparent shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">Resumen semanal: Tus plantas están saludables.</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ayer</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-green-50 dark:border-slate-800 text-center">
                    <button className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:text-emerald-700 dark:hover:text-emerald-300">
                      Marcar todas como leídas
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center overflow-hidden">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" 
                alt="User" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200
        ${isActive 
          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-emerald-800/50' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-green-50/50 dark:hover:bg-slate-800/50 hover:text-emerald-600 dark:hover:text-emerald-300'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function MobileNavItem({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors
        ${isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
      `}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
