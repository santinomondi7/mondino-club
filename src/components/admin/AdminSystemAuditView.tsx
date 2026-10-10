import React, { useEffect, useState } from 'react';
import {
  ScanLine,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { AdminSection } from '../../layouts/AdminLayout.tsx';
import { mondinoApi } from '../../services/api.ts';
import {
  formatCurrencyARS,
  formatDateTimeES,
  formatPoints,
} from '../../utils/points.ts';
import { ImageUploaderField } from '../ImageUploaderField.tsx';

interface AdminSystemAuditViewProps {
  section: 'inicio' | 'empleados' | 'estadisticas' | 'auditoria' | 'configuracion';
  onNavigateSection: (s: AdminSection) => void;
}

export const AdminSystemAuditView: React.FC<AdminSystemAuditViewProps> = ({
  section,
  onNavigateSection,
}) => {
  const { adminData, settings, promotions, benefits, refreshAllData } = useAuth();
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Employee assignment form
  const [selectedProfileForEmp, setSelectedProfileForEmp] = useState('');
  const [empPosition, setEmpPosition] = useState('Farmacéutico/a — Atención en Mostrador');
  const [empBranch, setEmpBranch] = useState('Casa Central Mondino');

  // Settings form state
  const [clubName, setClubName] = useState(settings.clubName);
  const [clubSubtitle, setClubSubtitle] = useState(settings.clubSubtitle);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [whatsappContact, setWhatsappContact] = useState(settings.whatsappContact);
  const [address, setAddress] = useState(settings.address);
  const [openingHours, setOpeningHours] = useState(settings.openingHours);

  useEffect(() => {
    setClubName(settings.clubName);
    setClubSubtitle(settings.clubSubtitle);
    setLogoUrl(settings.logoUrl);
    setPrimaryColor(settings.primaryColor);
    setSecondaryColor(settings.secondaryColor);
    setAccentColor(settings.accentColor);
    setWhatsappContact(settings.whatsappContact);
    setAddress(settings.address);
    setOpeningHours(settings.openingHours);
  }, [settings]);

  const allProfiles = adminData?.profiles || [];
  const allPurchases = adminData?.purchases || [];
  const allTransactions = adminData?.transactions || [];
  const allRedemptions = adminData?.redemptions || [];
  const allAuditLogs = adminData?.auditLogs || [];

  const completedPurchases = allPurchases.filter((p) => p.status === 'COMPLETADA');
  const totalSalesAmount = completedPurchases.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalPointsIssued = allTransactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);
  const totalPointsRedeemed = allTransactions
    .filter((t) => t.type === 'CANJE_BENEFICIO')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileForEmp) return;
    setBanner(null);
    try {
      await mondinoApi.updateUserRoleStatusAdmin({
        targetProfileId: selectedProfileForEmp,
        role: 'EMPLEADO',
        status: 'ACTIVO',
        employeePosition: empPosition,
        employeeBranch: empBranch,
      });
      await refreshAllData();
      setSelectedProfileForEmp('');
      setBanner({
        type: 'ok',
        text: 'Usuario autorizado como EMPLEADO para escanear QR, gestionar beneficios, novedades e imágenes.',
      });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    try {
      await mondinoApi.updateSettingsAdmin({
        clubName,
        clubSubtitle,
        logoUrl,
        appLogoUrl: '/images/mondino_app_logo.jpg',
        primaryColor,
        secondaryColor,
        accentColor,
        birthdayBonusPoints: 20,
        referrerBonusPoints: 15,
        referredBonusPoints: 10,
        notificationsEnabled: true,
        whatsappContact,
        address,
        openingHours,
      });
      await refreshAllData();
      setBanner({
        type: 'ok',
        text: 'Configuración general, logotipo de la app e imagen de la web actualizados correctamente.',
      });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            banner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button type="button" onClick={() => setBanner(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION: INICIO (RESUMEN GENERAL) */}
      {section === 'inicio' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">
                Panel Administrativo — {settings.clubName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {settings.clubSubtitle} · Regla base inmutable: $1.000 = 1 punto
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigateSection('registrar-compra')}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <ScanLine className="w-4 h-4" />
                <span>Registrar Compra QR</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateSection('promociones')}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-800" />
                <span>Promociones</span>
              </button>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] text-slate-500 block">Clientes registrados</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {allProfiles.filter((p) => p.role === 'CLIENTE').length}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] text-slate-500 block">Compras registradas</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {completedPurchases.length}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] text-slate-500 block">Puntos entregados</span>
              <span className="text-2xl font-bold text-emerald-900 font-mono tabular-nums mt-1 block">
                {formatPoints(totalPointsIssued)}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] text-slate-500 block">Puntos canjeados</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {formatPoints(totalPointsRedeemed)}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] text-slate-500 block">Beneficios activos</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {benefits.filter((b) => b.isActive).length}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] text-slate-500 block">Promociones activas</span>
              <span className="text-2xl font-bold text-emerald-900 font-mono tabular-nums mt-1 block">
                {promotions.filter((p) => p.isActive).length}
              </span>
            </div>
          </div>

          {/* Recent Purchases & Recent Audit Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Últimas compras registradas en mostrador
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateSection('compras')}
                  className="text-xs font-semibold text-emerald-900 hover:underline cursor-pointer"
                >
                  Ver todas →
                </button>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {allPurchases.slice(0, 5).map((pur) => {
                  const cust = allProfiles.find((u) => u.id === pur.customerId);
                  return (
                    <div key={pur.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {cust ? `${cust.firstName} ${cust.lastName}` : pur.customerId}
                        </p>
                        <p className="text-slate-500">
                          {pur.category} · {formatCurrencyARS(pur.amount)} ·{' '}
                          {formatDateTimeES(pur.createdAt)}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-950 tabular-nums">
                        +{formatPoints(pur.totalPoints)} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Auditoría reciente
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateSection('auditoria')}
                  className="text-xs font-semibold text-emerald-900 hover:underline cursor-pointer"
                >
                  Historial →
                </button>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {allAuditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2.5 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-mono font-semibold text-slate-900">{log.action}</span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {formatDateTimeES(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-600">{log.reason}</p>
                    <p className="text-[11px] text-slate-400">
                      Operador: {log.actorEmail} ({log.actorRole})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: EMPLEADOS */}
      {section === 'empleados' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAssignEmployee}
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 self-start"
          >
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Autorizar Empleado de Farmacia
            </h2>
            <p className="text-xs text-slate-500">
              Los empleados autorizados pueden escanear códigos QR e ingresar el monto de venta en
              mostrador, pero no pueden modificar reglas globales ni realizar ajustes manuales de
              puntos.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seleccionar cuenta registrada
              </label>
              <select
                required
                value={selectedProfileForEmp}
                onChange={(e) => setSelectedProfileForEmp(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                <option value="">Seleccionar usuario...</option>
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.email}) — Rol actual: {p.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Puesto / Función
              </label>
              <input
                type="text"
                value={empPosition}
                onChange={(e) => setEmpPosition(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sucursal</label>
              <input
                type="text"
                value={empBranch}
                onChange={(e) => setEmpBranch(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-emerald-900 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
            >
              Autorizar como Empleado de Mostrador
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Personal con Permisos Operativos
            </h2>
            <div className="divide-y divide-slate-100 text-xs">
              {allProfiles
                .filter((p) => p.role === 'EMPLEADO' || p.role === 'ADMINISTRADOR')
                .map((staff) => (
                  <div
                    key={staff.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {staff.firstName} {staff.lastName}
                      </p>
                      <p className="text-slate-500">
                        {staff.email} · Rol: <strong>{staff.role}</strong> · Estado: {staff.status}
                      </p>
                    </div>
                    {staff.role === 'EMPLEADO' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await mondinoApi.updateUserRoleStatusAdmin({
                            targetProfileId: staff.id,
                            role: 'CLIENTE',
                          });
                          await refreshAllData();
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-700 cursor-pointer"
                      >
                        Revocar permiso empleado
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION: ESTADÍSTICAS */}
      {section === 'estadisticas' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              Estadísticas Operativas de Mondino Club
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Métricas reales de facturación fidelizada, emisión de puntos, canjes y clientes más
              activos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-xs text-slate-500">Volumen de ventas fidelizadas</span>
              <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {formatCurrencyARS(totalSalesAmount)}
              </p>
              <span className="text-[11px] text-slate-400">
                En {completedPurchases.length} operaciones completadas
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-xs text-slate-500">Tasa de canje sobre emisión</span>
              <p className="text-2xl font-bold text-emerald-900 font-mono tabular-nums mt-1">
                {totalPointsIssued > 0
                  ? `${((totalPointsRedeemed / totalPointsIssued) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
              <span className="text-[11px] text-slate-400">
                {formatPoints(totalPointsRedeemed)} pts canjeados de {formatPoints(totalPointsIssued)}{' '}
                pts emitidos
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-xs text-slate-500">Ticket promedio con QR</span>
              <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {completedPurchases.length > 0
                  ? formatCurrencyARS(totalSalesAmount / completedPurchases.length)
                  : '$0'}
              </p>
              <span className="text-[11px] text-slate-400">
                Promedio de compra en Farmacia y Perfumería Mondino
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clientes Más Activos */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900 font-display">
                Clientes con mayor saldo y actividad
              </h2>
              <div className="divide-y divide-slate-100 text-xs">
                {[...allProfiles]
                  .sort((a, b) => b.pointsBalance - a.pointsBalance)
                  .slice(0, 5)
                  .map((c, idx) => (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-slate-400 mr-2">0{idx + 1}.</span>
                        <span className="font-semibold text-slate-900">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="text-slate-400 ml-2">({c.email})</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-950 tabular-nums">
                        {formatPoints(c.pointsBalance)} pts
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Promociones Más Utilizadas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900 font-display">
                Promociones más utilizadas en mostrador
              </h2>
              <div className="space-y-3 text-xs">
                {promotions.map((p) => {
                  const pct =
                    p.usageLimit && p.usageLimit > 0
                      ? Math.min(100, Math.round((p.currentUsages / p.usageLimit) * 100))
                      : 25;
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-800">{p.title}</span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {p.currentUsages} aplicaciones
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-800 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: AUDITORÍA */}
      {section === 'auditoria' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              Registro de Auditoría (audit_logs)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Trazabilidad inmutable de todas las acreditaciones, ajustes manuales, canjes,
              anulaciones y cambios de configuración.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Usuario / Rol</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Entidad / ID</th>
                    <th className="py-3 px-4">Motivo / Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDateTimeES(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{log.actorEmail}</p>
                        <p className="text-[11px] text-slate-400">{log.actorRole}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {log.entityType} ({log.entityId})
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: CONFIGURACIÓN */}
      {section === 'configuracion' && (
        <form onSubmit={handleSaveSettings} className="max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              Configuración General de Mondino Club
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalizá la identidad visual, bonus de cumpleaños y referidos.
            </p>
          </div>

          {/* Permanent Base & Official Bonus Rules Locked Notice */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-900 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-emerald-950">
              <p className="font-bold">
                Reglas Oficiales de Puntos de Mondino Club: $1.000 = 1 punto · Cumpleaños +20 pts ·
                Invitar amigo +15 pts · Ser invitado +10 pts
              </p>
              <p>
                De acuerdo con la política de Farmacia y Perfumería Mondino, la regla base de $1.000
                = 1 punto y las bonificaciones fijas (20 puntos por cumpleaños, 15 puntos por
                invitar a un amigo y 10 puntos por ser invitado) están establecidas de forma
                permanente.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <img
                src="/images/mondino_app_logo.jpg"
                alt="Logotipo Oficial Farmacia Mondino"
                className="w-14 h-14 rounded-xl object-contain bg-white border border-emerald-200 shrink-0"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Logotipo Oficial de la App (Programado de forma permanente)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  El logotipo oficial de Farmacia Mondino se encuentra fijado por programación en toda la aplicación.
                </p>
              </div>
            </div>

            <ImageUploaderField
              label="Imagen Principal de Portada de la Web"
              value={logoUrl}
              onChange={setLogoUrl}
              helperText="Esta imagen se muestra en la portada de inicio de los clientes y también puede ser modificada por los empleados."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la aplicación
                </label>
                <input
                  type="text"
                  required
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subtítulo</label>
                <input
                  type="text"
                  required
                  value={clubSubtitle}
                  onChange={(e) => setClubSubtitle(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Puntos por cumpleaños (fijo)
                </label>
                <input
                  type="number"
                  disabled
                  value={20}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-slate-100 text-slate-600 px-3.5 py-2 text-xs font-mono font-bold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Puntos por invitar a un amigo (fijo)
                </label>
                <input
                  type="number"
                  disabled
                  value={15}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-slate-100 text-slate-600 px-3.5 py-2 text-xs font-mono font-bold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Puntos por ser invitado (fijo)
                </label>
                <input
                  type="number"
                  disabled
                  value={10}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-slate-100 text-slate-600 px-3.5 py-2 text-xs font-mono font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Color Primario
                </label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 p-1 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Color Secundario
                </label>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 p-1 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Color Acento
                </label>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 p-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Atención
                </label>
                <input
                  type="text"
                  value={whatsappContact}
                  onChange={(e) => setWhatsappContact(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Horarios</label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
            >
              Guardar Configuración General
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
