import React from 'react';
import {
  BarChart3,
  Coins,
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
  ReceiptText,
  ScanLine,
  Settings,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';
import { OfflineIndicator } from '../components/OfflineIndicator.tsx';

export type AdminSection =
  | 'inicio'
  | 'registrar-compra'
  | 'clientes'
  | 'compras'
  | 'puntos'
  | 'beneficios'
  | 'promociones'
  | 'novedades'
  | 'campanas'
  | 'empleados'
  | 'estadisticas'
  | 'auditoria'
  | 'configuracion';

interface AdminLayoutProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeSection,
  onSelectSection,
  children,
}) => {
  const { profile, settings, workspaceMode, setWorkspaceMode, logout } = useAuth();
  const isAdmin = profile?.role === 'ADMINISTRADOR' && workspaceMode === 'ADMINISTRADOR';

  const menuItems: Array<{
    id: AdminSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    adminOnly?: boolean;
  }> = [
    { id: 'registrar-compra', label: 'Registrar Compra QR', icon: ScanLine },
    { id: 'beneficios', label: 'Beneficios y Fotos', icon: Gift },
    { id: 'novedades', label: 'Novedades y Fotos', icon: Newspaper },
    { id: 'promociones', label: 'Promociones (1% + Bonus)', icon: Sparkles },
    { id: 'inicio', label: 'Resumen General', icon: LayoutDashboard, adminOnly: true },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'compras', label: 'Historial de Compras', icon: ReceiptText },
    { id: 'puntos', label: 'Puntos y Ajustes', icon: Coins, adminOnly: true },
    { id: 'campanas', label: 'Campañas Segmentadas', icon: Megaphone, adminOnly: true },
    { id: 'empleados', label: 'Empleados Autorizados', icon: UserCheck, adminOnly: true },
    { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, adminOnly: true },
    { id: 'auditoria', label: 'Auditoría de Seguridad', icon: ShieldAlert, adminOnly: true },
    { id: 'configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
  ];

  const visibleItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200">
          <img
            src={settings.appLogoUrl || '/images/mondino_app_logo.jpg'}
            alt={settings.clubName}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-xl object-cover border border-emerald-200 shadow-2xs shrink-0"
          />
          <div className="min-w-0">
            <span className="text-base font-bold tracking-tight text-emerald-950 font-display truncate block leading-tight">
              {settings.clubName}
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              {settings.clubSubtitle}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-xs font-semibold text-slate-800 truncate">
            {profile?.firstName} {profile?.lastName}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {isAdmin ? 'Panel Administrador' : 'Terminal Mostrador / Empleado'} · Regla 1%
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => setWorkspaceMode('CLIENTE')}
            className="w-full min-h-[40px] flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-800" />
            <span>Ver Vista Cliente</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full min-h-[40px] flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate">
              {visibleItems.find((i) => i.id === activeSection)?.label || 'Gestión Mondino Club'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />

            {/* Workspace Mode Switcher for Admin/Staff */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setWorkspaceMode('CLIENTE')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer"
              >
                Vista Cliente
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('EMPLEADO');
                  onSelectSection('registrar-compra');
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  workspaceMode === 'EMPLEADO'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Modo Empleado
              </button>
              {profile?.role === 'ADMINISTRADOR' && (
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('ADMINISTRADOR')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    workspaceMode === 'ADMINISTRADOR'
                      ? 'bg-emerald-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Administrador
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Horizontal Navigation Scroller for Tablet/Mobile Staff */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto flex items-center gap-1.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      <OfflineIndicator />
    </div>
  );
};
