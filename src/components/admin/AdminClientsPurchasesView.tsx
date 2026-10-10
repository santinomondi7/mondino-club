import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Ban,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { mondinoApi } from '../../services/api.ts';
import { UserProfile, PurchaseRecord } from '../../types/index.ts';
import {
  formatCurrencyARS,
  formatDateTimeES,
  formatPoints,
} from '../../utils/points.ts';

interface AdminClientsPurchasesViewProps {
  section: 'clientes' | 'compras' | 'puntos';
}

export const AdminClientsPurchasesView: React.FC<AdminClientsPurchasesViewProps> = ({
  section,
}) => {
  const { profile, adminData, workspaceMode, refreshAllData } = useAuth();
  const isAdmin = profile?.role === 'ADMINISTRADOR' && workspaceMode === 'ADMINISTRADOR';

  // Search & filter state
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'TODOS' | 'ACTIVO' | 'SUSPENDIDO'>(
    'TODOS'
  );
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [purchaseDateFilter, setPurchaseDateFilter] = useState('');
  const [purchaseEmployeeFilter, setPurchaseEmployeeFilter] = useState('TODOS');

  // Manual adjustment modal state (Admin only)
  const [adjustTarget, setAdjustTarget] = useState<UserProfile | null>(null);
  const [adjustSign, setAdjustSign] = useState<'SUMAR' | 'RESTAR'>('SUMAR');
  const [adjustAmount, setAdjustAmount] = useState<string>('100');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Void purchase modal state (Admin only)
  const [voidTarget, setVoidTarget] = useState<PurchaseRecord | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [submittingVoid, setSubmittingVoid] = useState(false);

  // Selected client detail drawer
  const [inspectClient, setInspectClient] = useState<UserProfile | null>(null);

  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const allProfiles = adminData?.profiles || [];
  const allPurchases = adminData?.purchases || [];
  const allTransactions = adminData?.transactions || [];
  const allRedemptions = adminData?.redemptions || [];

  const filteredClients = allProfiles.filter((u) => {
    if (clientStatusFilter !== 'TODOS' && u.status !== clientStatusFilter) return false;
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return (
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.qrToken.toLowerCase().includes(q)
    );
  });

  const staffProfiles = allProfiles.filter(
    (p) => p.role === 'EMPLEADO' || p.role === 'ADMINISTRADOR'
  );

  const filteredPurchases = allPurchases.filter((p) => {
    if (purchaseEmployeeFilter !== 'TODOS' && p.employeeId !== purchaseEmployeeFilter) {
      return false;
    }
    if (purchaseDateFilter && !String(p.createdAt).startsWith(purchaseDateFilter)) {
      return false;
    }
    if (!purchaseSearch.trim()) return true;
    const q = purchaseSearch.toLowerCase();
    const cust = allProfiles.find((u) => u.id === p.customerId);
    const custName = cust ? `${cust.firstName} ${cust.lastName}`.toLowerCase() : '';
    return (
      custName.includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const handleManualAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget || submittingAdjust) return;
    setSubmittingAdjust(true);
    setBanner(null);

    const rawPts = Math.abs(Math.trunc(Number(adjustAmount) || 0));
    const delta = adjustSign === 'SUMAR' ? rawPts : -rawPts;

    try {
      const res = await mondinoApi.adjustPointsAdmin({
        customerId: adjustTarget.id,
        pointsDelta: delta,
        reason: adjustReason,
      });
      await refreshAllData();
      setAdjustTarget(null);
      setAdjustReason('');
      setBanner({
        type: 'ok',
        text: `Ajuste manual registrado (${delta > 0 ? '+' : ''}${formatPoints(delta)} pts). Nuevo saldo del cliente: ${formatPoints(res.newBalance)} puntos.`,
      });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleToggleAccountStatus = async (target: UserProfile) => {
    if (!isAdmin) return;
    const nextStatus = target.status === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    try {
      await mondinoApi.updateUserRoleStatusAdmin({
        targetProfileId: target.id,
        status: nextStatus,
      });
      await refreshAllData();
      setBanner({
        type: 'ok',
        text: `Cuenta de ${target.firstName} ${target.lastName} actualizada a ${nextStatus}.`,
      });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  const handleVoidPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget || submittingVoid) return;
    setSubmittingVoid(true);
    setBanner(null);
    try {
      await mondinoApi.voidPurchaseAdmin({
        purchaseId: voidTarget.id,
        reason: voidReason,
      });
      await refreshAllData();
      setVoidTarget(null);
      setVoidReason('');
      setBanner({
        type: 'ok',
        text: 'Compra anulada correctamente y puntos revertidos en el historial de transacciones.',
      });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    } finally {
      setSubmittingVoid(false);
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

      {/* SECTION: CLIENTES */}
      {section === 'clientes' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">
                Administración de Clientes
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Buscá socios por nombre, email o token QR, consultá su historial y realizá ajustes
                auditados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o QR..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="min-h-[40px] pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs w-64 focus:outline-none focus:border-emerald-800"
                />
              </div>

              <select
                value={clientStatusFilter}
                onChange={(e) => setClientStatusFilter(e.target.value as any)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="SUSPENDIDO">Suspendidos</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Token QR Personal</th>
                    <th className="py-3 px-4">Rol / Estado</th>
                    <th className="py-3 px-4 text-right">Saldo Puntos</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredClients.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{u.qrToken}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{u.role}</span>
                        <span className="mx-1.5">·</span>
                        <span
                          className={
                            u.status === 'ACTIVO'
                              ? 'text-emerald-800 font-semibold'
                              : 'text-red-700 font-semibold'
                          }
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-950 tabular-nums">
                        {formatPoints(u.pointsBalance)} pts
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => setInspectClient(u)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                        >
                          Ver Ficha
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustTarget(u);
                                setAdjustSign('SUMAR');
                                setAdjustAmount('100');
                                setAdjustReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-900 text-white hover:bg-emerald-800 font-semibold cursor-pointer"
                            >
                              Ajustar Puntos
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleAccountStatus(u)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-700 hover:border-red-200 font-medium cursor-pointer"
                            >
                              {u.status === 'ACTIVO' ? 'Suspender' : 'Activar'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: COMPRAS */}
      {section === 'compras' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">
                Registro Histórico de Compras
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Todas las ventas validadas en mostrador con cálculo automático de 1 punto cada $1.000
                ($1.000 = 1 punto).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar cliente o detalle..."
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="min-h-[40px] pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs w-56 focus:outline-none focus:border-emerald-800"
                />
              </div>

              <input
                type="date"
                value={purchaseDateFilter}
                onChange={(e) => setPurchaseDateFilter(e.target.value)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              />

              <select
                value={purchaseEmployeeFilter}
                onChange={(e) => setPurchaseEmployeeFilter(e.target.value)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="TODOS">Todos los operadores</option>
                {staffProfiles.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Fecha / ID</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Categoría / Detalle</th>
                    <th className="py-3 px-4">Registrado por</th>
                    <th className="py-3 px-4 text-right">Venta ($ ARS)</th>
                    <th className="py-3 px-4 text-right">Base ($1.000 = 1 pto)</th>
                    <th className="py-3 px-4 text-right">Promo</th>
                    <th className="py-3 px-4 text-right">Total Puntos</th>
                    <th className="py-3 px-4 text-right">Estado / Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPurchases.map((pur) => {
                    const cust = allProfiles.find((u) => u.id === pur.customerId);
                    const emp = allProfiles.find((u) => u.id === pur.employeeId);
                    return (
                      <tr key={pur.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="text-slate-800 tabular-nums">
                            {formatDateTimeES(pur.createdAt)}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">{pur.id}</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {cust ? `${cust.firstName} ${cust.lastName}` : pur.customerId}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-800">{pur.category}</span>
                          {pur.notes && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">{pur.notes}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {emp ? `${emp.firstName} ${emp.lastName}` : pur.employeeId}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrencyARS(pur.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                          +{formatPoints(pur.basePoints)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-800 tabular-nums">
                          +{formatPoints(pur.promoPoints)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-950 tabular-nums">
                          +{formatPoints(pur.totalPoints)} pts
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {pur.status === 'ANULADA' ? (
                            <span className="text-red-700 font-semibold" title={pur.voidedReason}>
                              ANULADA
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-emerald-800 font-semibold">COMPLETADA</span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVoidTarget(pur);
                                    setVoidReason('');
                                  }}
                                  className="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 text-[11px] font-medium cursor-pointer"
                                >
                                  Anular
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: PUNTOS (LEDGER & AJUSTES MANUALES) */}
      {section === 'puntos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">
                Ledger de Transacciones de Puntos y Ajustes
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Regla Base Inmutable: $1.000 = 1 punto. Todos los saldos están respaldados por
                movimientos auditables.
              </p>
            </div>

            {isAdmin && allProfiles.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const firstClient =
                    allProfiles.find((p) => p.role === 'CLIENTE') || allProfiles[0];
                  setAdjustTarget(firstClient);
                  setAdjustSign('SUMAR');
                  setAdjustAmount('100');
                  setAdjustReason('');
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer self-start"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Nuevo Ajuste Manual de Puntos</span>
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4">Autorizado por</th>
                    <th className="py-3 px-4 text-right">Movimiento</th>
                    <th className="py-3 px-4 text-right">Saldo Resultante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {allTransactions.map((tx) => {
                    const cust = allProfiles.find((u) => u.id === tx.customerId);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                          {formatDateTimeES(tx.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {cust ? `${cust.firstName} ${cust.lastName}` : tx.customerId}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                          {tx.type}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{tx.description}</td>
                        <td className="py-3.5 px-4 text-slate-500">{tx.createdBy}</td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                            tx.amount >= 0 ? 'text-emerald-900' : 'text-red-700'
                          }`}
                        >
                          {tx.amount >= 0 ? `+${formatPoints(tx.amount)}` : formatPoints(tx.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-800 tabular-nums">
                          {formatPoints(tx.balanceAfter)} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajuste Manual de Puntos (Admin Only, Mandatory Reason) */}
      {adjustTarget && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleManualAdjustSubmit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800">
                  Operación administrativa auditada
                </p>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  Ajuste Manual de Puntos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Seleccionar Cliente
              </label>
              <select
                value={adjustTarget.id}
                onChange={(e) => {
                  const found = allProfiles.find((p) => p.id === e.target.value);
                  if (found) setAdjustTarget(found);
                }}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.email}) — Saldo: {formatPoints(p.pointsBalance)}{' '}
                    pts
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Tipo de operación
                </label>
                <select
                  value={adjustSign}
                  onChange={(e) => setAdjustSign(e.target.value as 'SUMAR' | 'RESTAR')}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-semibold"
                >
                  <option value="SUMAR">Sumar puntos (+)</option>
                  <option value="RESTAR">Restar puntos (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Cantidad de puntos
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. Motivo obligatorio (quedará registrado en audit_logs)
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ej: Compensación por diferencia en ticket #4821 o corrección administrativa..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:border-emerald-800"
              />
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs flex justify-between">
              <span className="text-slate-600">Saldo proyectado del cliente:</span>
              <span className="font-mono font-bold text-emerald-950 tabular-nums">
                {formatPoints(
                  adjustTarget.pointsBalance +
                    (adjustSign === 'SUMAR'
                      ? Math.abs(Number(adjustAmount) || 0)
                      : -Math.abs(Number(adjustAmount) || 0))
                )}{' '}
                puntos
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="flex-1 min-h-[42px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingAdjust}
                className="flex-1 min-h-[42px] rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{submittingAdjust ? 'Guardando...' : 'Confirmar Ajuste'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Anular Compra con Motivo Obligatorio */}
      {voidTarget && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleVoidPurchaseSubmit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700">Reversión atómica de compra</p>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  Anular Compra #{voidTarget.id.slice(-6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Se revertirán <strong>-{formatPoints(voidTarget.totalPoints)} puntos</strong> de la
              cuenta del cliente y la operación quedará registrada en la auditoría.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo obligatorio de la anulación
              </label>
              <textarea
                required
                rows={3}
                placeholder="Indicá el motivo de anulación o nota de crédito..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="flex-1 min-h-[42px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingVoid}
                className="flex-1 min-h-[42px] rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{submittingVoid ? 'Anulando...' : 'Confirmar Anulación'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Ficha Completa del Cliente */}
      {inspectClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  {inspectClient.firstName} {inspectClient.lastName}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectClient.email} · QR: <span className="font-mono">{inspectClient.qrToken}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectClient(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <span className="text-slate-500 block">Saldo actual</span>
                <span className="text-lg font-bold text-emerald-950 font-mono tabular-nums">
                  {formatPoints(inspectClient.pointsBalance)} pts
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <span className="text-slate-500 block">Compras registradas</span>
                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                  {allPurchases.filter((p) => p.customerId === inspectClient.id).length}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <span className="text-slate-500 block">Canjes realizados</span>
                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                  {allRedemptions.filter((r) => r.customerId === inspectClient.id).length}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Últimos movimientos del cliente</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {allTransactions
                  .filter((t) => t.customerId === inspectClient.id)
                  .slice(0, 6)
                  .map((t) => (
                    <div key={t.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-slate-900">{t.description}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatDateTimeES(t.createdAt)} · {t.createdBy}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          t.amount >= 0 ? 'text-emerald-900' : 'text-red-700'
                        }`}
                      >
                        {t.amount >= 0 ? `+${formatPoints(t.amount)}` : formatPoints(t.amount)} pts
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
