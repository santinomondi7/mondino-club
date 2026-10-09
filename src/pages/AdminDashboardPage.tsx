import React from 'react';
import { AdminSection } from '../layouts/AdminLayout.tsx';
import { StaffRegisterPurchasePage } from './StaffRegisterPurchasePage.tsx';
import { AdminClientsPurchasesView } from '../components/admin/AdminClientsPurchasesView.tsx';
import { AdminCatalogMarketingView } from '../components/admin/AdminCatalogMarketingView.tsx';
import { AdminSystemAuditView } from '../components/admin/AdminSystemAuditView.tsx';

interface AdminDashboardPageProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  activeSection,
  onSelectSection,
}) => {
  if (activeSection === 'registrar-compra') {
    return <StaffRegisterPurchasePage />;
  }

  if (
    activeSection === 'clientes' ||
    activeSection === 'compras' ||
    activeSection === 'puntos'
  ) {
    return <AdminClientsPurchasesView section={activeSection} />;
  }

  if (
    activeSection === 'beneficios' ||
    activeSection === 'promociones' ||
    activeSection === 'novedades' ||
    activeSection === 'campanas'
  ) {
    return <AdminCatalogMarketingView section={activeSection} />;
  }

  return (
    <AdminSystemAuditView
      section={activeSection}
      onNavigateSection={onSelectSection}
    />
  );
};
