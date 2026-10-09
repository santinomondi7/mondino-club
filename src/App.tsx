import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { CustomerLayout, CustomerTab } from './layouts/CustomerLayout.tsx';
import { AdminLayout, AdminSection } from './layouts/AdminLayout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage.tsx';
import { CustomerBenefitsPage } from './pages/CustomerBenefitsPage.tsx';
import { CustomerPromotionsNewsPage } from './pages/CustomerPromotionsNewsPage.tsx';
import { CustomerQRPage } from './pages/CustomerQRPage.tsx';
import { CustomerHistoryPage } from './pages/CustomerHistoryPage.tsx';
import { CustomerProfilePage } from './pages/CustomerProfilePage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';

const MondinoClubRouter: React.FC = () => {
  const { profile, loadingAuth, workspaceMode, settings } = useAuth();
  const [customerTab, setCustomerTab] = useState<CustomerTab>('inicio');
  const [adminSection, setAdminSection] = useState<AdminSection>('registrar-compra');

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700 p-6">
        <img
          src={settings.appLogoUrl || '/images/mondino_app_logo.jpg'}
          alt={settings.clubName}
          referrerPolicy="no-referrer"
          className="w-16 h-16 rounded-2xl object-cover border border-emerald-200 shadow-sm mb-3"
        />
        <div className="w-8 h-8 rounded-full border-3 border-emerald-900 border-t-transparent animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-900">Cargando {settings.clubName}...</p>
        <p className="text-xs text-slate-500 mt-1">{settings.clubSubtitle}</p>
      </div>
    );
  }

  if (!profile) {
    return <LoginPage />;
  }

  // Staff / Admin Workspace Mode
  if (
    (profile.role === 'ADMINISTRADOR' || profile.role === 'EMPLEADO') &&
    (workspaceMode === 'ADMINISTRADOR' || workspaceMode === 'EMPLEADO')
  ) {
    const effectiveSection =
      workspaceMode === 'EMPLEADO' &&
      adminSection !== 'registrar-compra' &&
      adminSection !== 'beneficios' &&
      adminSection !== 'novedades' &&
      adminSection !== 'promociones' &&
      adminSection !== 'clientes' &&
      adminSection !== 'compras'
        ? 'registrar-compra'
        : adminSection;

    return (
      <AdminLayout
        activeSection={effectiveSection}
        onSelectSection={(sec) => setAdminSection(sec)}
      >
        <AdminDashboardPage
          activeSection={effectiveSection}
          onSelectSection={(sec) => setAdminSection(sec)}
        />
      </AdminLayout>
    );
  }

  // Customer Workspace Mode
  return (
    <CustomerLayout activeTab={customerTab} onSelectTab={setCustomerTab}>
      {customerTab === 'inicio' && <CustomerDashboardPage onNavigate={setCustomerTab} />}
      {customerTab === 'beneficios' && <CustomerBenefitsPage />}
      {customerTab === 'novedades' && <CustomerPromotionsNewsPage />}
      {customerTab === 'mi-qr' && <CustomerQRPage />}
      {customerTab === 'historial' && <CustomerHistoryPage />}
      {customerTab === 'perfil' && <CustomerProfilePage />}
    </CustomerLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MondinoClubRouter />
    </AuthProvider>
  );
}
