import React, { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

const STORAGE_KEY = 'mondino_zoom_level_pct';
const BASE_FONT_PX = 17; // Un poquito más grande por defecto (17px en lugar de 16px)
const MIN_ZOOM = 60;
const MAX_ZOOM = 150;
const STEP_ZOOM = 10;

function getSavedZoom(): number {
  if (typeof window === 'undefined') return 100;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 100;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return 100;
}

function applyRootZoom(zoomPct: number) {
  if (typeof document === 'undefined') return;
  const computedPx = Number(((BASE_FONT_PX * zoomPct) / 100).toFixed(2));
  document.documentElement.style.fontSize = `${computedPx}px`;
}

export const ZoomControls: React.FC = () => {
  const [zoomPct, setZoomPct] = useState<number>(() => getSavedZoom());

  useEffect(() => {
    applyRootZoom(zoomPct);
  }, [zoomPct]);

  const updateZoom = (nextPct: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextPct));
    setZoomPct(clamped);
    applyRootZoom(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
      window.dispatchEvent(new CustomEvent('mondino-zoom-change', { detail: clamped }));
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = getSavedZoom();
        setZoomPct(next);
        applyRootZoom(next);
      }
    };
    const handleCustomZoom = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === 'number') {
        setZoomPct(customEvent.detail);
      }
    };

    // En celulares, si el usuario pellizca para achicar la pantalla (cuando visualViewport está en 1.0),
    // reducimos proporcionalmente el zoom de diseño para que todo se achique ocupando siempre el 100% del ancho sin dejar franja blanca a la derecha.
    let startDist = 0;
    let startZoom = getSavedZoom();

    const getTouchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = getTouchDist(e.touches);
        startZoom = getSavedZoom();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        const vpScale = window.visualViewport?.scale ?? 1;
        if (vpScale <= 1.02) {
          const currentDist = getTouchDist(e.touches);
          const ratio = currentDist / startDist;
          if (ratio < 0.92 || (startZoom < 100 && ratio > 1.08)) {
            const target = Math.round((startZoom * ratio) / 5) * 5;
            const clamped = Math.max(MIN_ZOOM, Math.min(100, target));
            if (clamped !== getSavedZoom()) {
              updateZoom(clamped);
            }
          }
        }
      }
    };

    const handleTouchEnd = () => {
      startDist = 0;
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('mondino-zoom-change', handleCustomZoom);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('mondino-zoom-change', handleCustomZoom);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleZoomOut = () => updateZoom(zoomPct - STEP_ZOOM);
  const handleZoomIn = () => updateZoom(zoomPct + STEP_ZOOM);
  const handleReset = () => updateZoom(100);

  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs shrink-0"
      role="group"
      aria-label="Ajustar tamaño de letra y zoom de pantalla"
    >
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoomPct <= MIN_ZOOM}
        title="Achicar pantalla / Disminuir zoom (A-)"
        aria-label="Achicar pantalla o letra"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 hover:text-emerald-900 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleReset}
        title="Restablecer tamaño normal (100%)"
        aria-label="Restablecer zoom al 100%"
        className="px-1.5 h-8 text-[11px] font-mono font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-900 rounded-md transition-colors cursor-pointer select-none"
      >
        {zoomPct}%
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoomPct >= MAX_ZOOM}
        title="Agrandar pantalla / Aumentar zoom (A+)"
        aria-label="Agrandar pantalla o letra"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 hover:text-emerald-900 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
