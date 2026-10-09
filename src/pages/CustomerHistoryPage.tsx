import React, { useState } from 'react';
import { ReceiptText, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { formatCurrencyARS, formatDateTimeES, formatPoints } from '../utils/points.ts';

export const CustomerHistoryPage: React.FC = () => {
  const { profile, purchases, transactions } = useAuth();
  const [tab, setTab] = useState<'compras' | 'movimientos'>('compras');

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
            Historial de Compras y Puntos
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Consultá tus compras registradas en mostrador y el libro mayor de movimientos de puntos.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setTab('compras')}
            className={`min-h-[38px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === 'compras' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Mis Compras ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('movimientos')}
            className={`min-h-[38px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === 'movimientos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Movimientos de Puntos ({transactions.length})
          </button>
        </div>
      </div>

      {tab === 'compras' ? (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {purchases.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ReceiptText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-base font-semibold text-slate-800">
                Aún no tenés compras registradas
              </p>
              <p className="text-xs text-slate-500">
                Cada vez que presentes tu QR en Farmacia y Perfumería Mondino, el detalle de tu
                compra aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Detalle / Categoría</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4 text-right">Puntos Base (1%)</th>
                    <th className="py-3 px-4 text-right">Puntos Promo</th>
                    <th className="py-3 px-4 text-right">Total Acreditado</th>
                    <th className="py-3 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {purchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDateTimeES(pur.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">
                          {pur.notes || `Compra en ${pur.category}`}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Categoría: {pur.category} · Op #{pur.id.slice(-6)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrencyARS(pur.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                        +{formatPoints(pur.basePoints)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-800 tabular-nums">
                        {pur.promoPoints > 0 ? `+${formatPoints(pur.promoPoints)}` : '0'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-950 tabular-nums">
                        +{formatPoints(pur.totalPoints)} pts
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            pur.status === 'ANULADA' ? 'text-red-700' : 'text-emerald-800'
                          }`}
                        >
                          {pur.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <History className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-base font-semibold text-slate-800">
                Sin movimientos de puntos registrados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Tipo de Movimiento</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4">Registrado por</th>
                    <th className="py-3 px-4 text-right">Puntos</th>
                    <th className="py-3 px-4 text-right">Saldo Posterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDateTimeES(tx.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{tx.type}</td>
                      <td className="py-3.5 px-4 text-slate-600">{tx.description}</td>
                      <td className="py-3.5 px-4 text-slate-500">{tx.createdBy}</td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                          tx.amount >= 0 ? 'text-emerald-900' : 'text-red-700'
                        }`}
                      >
                        {tx.amount >= 0 ? `+${formatPoints(tx.amount)}` : formatPoints(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                        {formatPoints(tx.balanceAfter)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
