import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ShieldCheck, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { formatPoints } from '../utils/points.ts';

export const CustomerQRPage: React.FC = () => {
  const { profile, settings } = useAuth();
  const [copied, setCopied] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);

  if (!profile) return null;

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(profile.qrToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1.5">
        <p className="text-xs font-medium text-emerald-900">{settings.clubSubtitle}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">Mi QR</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Mostrá este código en Farmacia y Perfumería Mondino para registrar tu compra y sumar tus
          puntos.
        </p>
      </div>

      {/* Main QR Card */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 text-center transition-colors ${
          highContrastMode
            ? 'bg-white border-emerald-900 shadow-xl ring-4 ring-emerald-900/10'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col items-center space-y-1.5 mb-6">
          <img
            src="/images/mondino_app_logo.jpg"
            alt={settings.clubName}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-2xl object-contain bg-white border border-emerald-200 shadow-xs mb-1"
          />
          <p className="text-lg font-bold text-slate-900">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-xs text-slate-500">
            <span>Socio Activo</span>
            <span className="mx-1.5">·</span>
            <span className="font-semibold text-emerald-900 tabular-nums">
              {formatPoints(profile.pointsBalance)} puntos disponibles
            </span>
          </p>
        </div>

        {/* High-Contrast QR Container */}
        <div className="inline-flex items-center justify-center p-5 rounded-2xl bg-white border-2 border-slate-900 mx-auto">
          <QRCodeSVG
            value={profile.qrToken}
            size={236}
            level="H"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#0F172A"
          />
        </div>

        {/* Token Identifier */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          <div>
            <span className="text-[11px] text-slate-400 block">
              Identificador único de lectura en caja
            </span>
            <span className="text-sm font-mono font-semibold text-slate-900 tracking-wider select-all">
              {profile.qrToken}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyToken}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Código copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar código</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setHighContrastMode((prev) => !prev)}
              className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                highContrastMode
                  ? 'border-emerald-900 bg-emerald-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{highContrastMode ? 'Modo mostrador activo' : 'Realzar contraste'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security & Rules Information */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Código QR protegido y de identificación exclusiva
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tu código QR contiene únicamente un token criptográfico para localizar tu perfil en
              mostrador. No almacena contraseñas, saldo ni datos sensibles, y solo puede ser
              procesado desde dispositivos autorizados de Farmacia y Perfumería Mondino.
            </p>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Regla permanente de acumulación</span>
          <span className="font-semibold text-slate-900 tabular-nums">$1.000 gastados = 1 punto</span>
        </div>
      </div>
    </div>
  );
};
