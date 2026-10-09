import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Instalar App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Instalar Mondino Club en tu teléfono"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
        <span className="hidden sm:inline">{isIOS ? 'Instalar en iPhone' : 'Instalar PWA'}</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Instalar Mondino Club en tu dispositivo
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-sm text-slate-600">
              {isIOS ? (
                <>
                  <p>Para tener acceso directo a tu código QR desde la pantalla de inicio en iOS:</p>
                  <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                      Pulsá el botón <strong>Compartir</strong> en la barra inferior de Safari.
                    </li>
                    <li>
                      Seleccioná <strong>Agregar a inicio</strong>.
                    </li>
                    <li>
                      Confirmá pulsando <strong>Agregar</strong>.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    Mondino Club está configurada como aplicación web progresiva (PWA) para acceso rápido en mostrador:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                      Abrí el menú del navegador (ícono de tres puntos arriba a la derecha).
                    </li>
                    <li>
                      Seleccioná <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.
                    </li>
                  </ol>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-emerald-900 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
