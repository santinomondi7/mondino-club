import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CheckCircle2,
  QrCode,
  Search,
  ShieldCheck,
  TicketCheck,
  AlertCircle,
  X,
  RotateCcw,
  RefreshCw,
  ImageUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { mondinoApi } from '../services/api.ts';
import { BASE_POINTS_EXAMPLES, PURCHASE_CATEGORIES } from '../constants/index.ts';
import { BackendPointsPreview, ValidatedQrCustomer } from '../types/index.ts';
import {
  calculateClientPreviewBasePoints,
  formatCurrencyARS,
  formatPoints,
  generateIdempotencyKey,
} from '../utils/points.ts';
import { AdminCatalogMarketingView } from '../components/admin/AdminCatalogMarketingView.tsx';

export const StaffRegisterPurchasePage: React.FC = () => {
  const { adminData, promotions, settings, refreshAllData } = useAuth();

  const [mode, setMode] = useState<'compra-qr' | 'validar-canje' | 'beneficios' | 'novedades'>(
    'compra-qr'
  );
  const [qrInput, setQrInput] = useState('');
  const [validatingQr, setValidatingQr] = useState(false);
  const [customer, setCustomer] = useState<ValidatedQrCustomer | null>(null);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sale inputs (Employee NEVER enters points manually; only real sale amount + category)
  const [saleAmount, setSaleAmount] = useState<string>('100000');
  const [category, setCategory] = useState<string>('Perfumería');
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    generateIdempotencyKey('venta')
  );

  // Backend preview state
  const [preview, setPreview] = useState<BackendPointsPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redemption code validation state
  const [redemptionCodeInput, setRedemptionCodeInput] = useState('');
  const [validatingRedemption, setValidatingRedemption] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    detail: string;
    operationId?: string;
  } | null>(null);

  const extractCleanQrValue = (raw: string): string => {
    const trimmed = raw.trim();
    const match = trimmed.match(/MND-QR-[A-Z0-9-]+/i);
    if (match && match[0]) {
      return match[0].toUpperCase();
    }
    return trimmed;
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleValidateQrToken = async (tokenToValidate?: string, fromScanner = false) => {
    const rawValue = (tokenToValidate ?? qrInput).trim();
    if (!rawValue) return;
    const targetToken = extractCleanQrValue(rawValue);
    setQrInput(targetToken);
    setValidatingQr(true);
    setFeedback(null);

    try {
      const res = await mondinoApi.validateQrForStaff(targetToken);
      setCustomer(res.customer);
      setIdempotencyKey(generateIdempotencyKey('venta'));
      if (fromScanner) {
        setFeedback({
          type: 'success',
          title: `Código QR escaneado: ${res.customer.fullName}`,
          detail: `Cliente seleccionado automáticamente (${res.customer.qrToken}). Saldo actual: ${formatPoints(res.customer.pointsBalance)} pts.`,
        });
      }
    } catch (err: any) {
      // Fallback: check loaded active profiles in adminData in case of network/RPC mismatch
      const localMatch = (adminData?.profiles || []).find(
        (p) =>
          p.qrToken?.toUpperCase() === targetToken.toUpperCase() ||
          p.email?.toLowerCase() === targetToken.toLowerCase()
      );
      if (localMatch) {
        const matchedCustomer: ValidatedQrCustomer = {
          id: localMatch.id,
          firstName: localMatch.firstName,
          lastName: localMatch.lastName,
          fullName: `${localMatch.firstName} ${localMatch.lastName}`.trim() || localMatch.email,
          email: localMatch.email,
          maskedEmail: localMatch.email,
          qrToken: localMatch.qrToken,
          pointsBalance: localMatch.pointsBalance,
          status: localMatch.status,
          birthDate: localMatch.birthDate,
        };
        setCustomer(matchedCustomer);
        setIdempotencyKey(generateIdempotencyKey('venta'));
        if (fromScanner) {
          setFeedback({
            type: 'success',
            title: `Código QR escaneado: ${matchedCustomer.fullName}`,
            detail: `Cliente seleccionado automáticamente (${matchedCustomer.qrToken}). Saldo actual: ${formatPoints(matchedCustomer.pointsBalance)} pts.`,
          });
        }
      } else {
        setCustomer(null);
        setFeedback({
          type: 'error',
          title: 'No se pudo validar el código QR',
          detail: err.message || 'El código QR no corresponde a una cuenta activa.',
        });
      }
    } finally {
      setValidatingQr(false);
    }
  };

  // Attach MediaStream to <video> after it mounts and run continuous QR decoding (jsQR + BarcodeDetector)
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.srcObject = streamRef.current;
    videoEl.setAttribute('playsinline', 'true');
    videoEl.muted = true;
    videoEl.play().catch(() => {
      // Autoplay handled
    });

    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

    let nativeDetector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        const DetectorClass = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
        nativeDetector = new DetectorClass({ formats: ['qr_code'] });
      } catch {
        nativeDetector = null;
      }
    }

    let isDecoding = false;

    scanIntervalRef.current = window.setInterval(async () => {
      if (isDecoding || !videoRef.current || !streamRef.current) return;
      const v = videoRef.current;
      if (v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) return;

      isDecoding = true;
      try {
        let detectedCode: string | null = null;

        // 1. Universal pure-JS QR decoding via jsQR (works on iOS Safari, Android, Firefox, Desktop)
        if (ctx) {
          const maxDim = 640;
          const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
          const w = Math.max(1, Math.floor(v.videoWidth * scale));
          const h = Math.max(1, Math.floor(v.videoHeight * scale));
          offscreenCanvas.width = w;
          offscreenCanvas.height = h;
          ctx.drawImage(v, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const qrResult = jsQR(imageData.data, w, h, {
            inversionAttempts: 'attemptBoth',
          });
          if (qrResult && qrResult.data && qrResult.data.trim()) {
            detectedCode = qrResult.data.trim();
          }
        }

        // 2. Native BarcodeDetector fallback if jsQR didn't catch the frame
        if (!detectedCode && nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(v);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedCode = String(barcodes[0].rawValue).trim();
            }
          } catch {
            // continue
          }
        }

        if (detectedCode) {
          stopCamera();
          await handleValidateQrToken(detectedCode, true);
        }
      } finally {
        isDecoding = false;
      }
    }, 180);

    return () => {
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraActive, cameraFacingMode]);

  const startCameraWithMode = async (modeToUse: 'environment' | 'user') => {
    setFeedback(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setFeedback({
        type: 'error',
        title: 'Cámara no soportada en este navegador',
        detail: 'Podés usar el botón "Escanear desde foto" o ingresar el código manualmente.',
      });
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: modeToUse },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback if specific facingMode or resolution constraint is not supported (e.g. PC webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraFacingMode(modeToUse);
      setCameraActive(true);
    } catch {
      setFeedback({
        type: 'error',
        title: 'Permiso de cámara bloqueado o no disponible',
        detail:
          'Habilitá el permiso de cámara en tu navegador o usá "Escanear desde foto" para tomar una foto al QR del cliente.',
      });
    }
  };

  const handleStartCamera = async () => {
    await startCameraWithMode(cameraFacingMode);
  };

  const handleSwitchCamera = async () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    await startCameraWithMode(nextMode);
  };

  const handleScanFromImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFeedback(null);
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        img.src = imgUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo procesar la imagen.');

      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.floor(img.width * scale));
      const h = Math.max(1, Math.floor(img.height * scale));
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const qrResult = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });

      if (qrResult && qrResult.data) {
        stopCamera();
        await handleValidateQrToken(qrResult.data, true);
      } else {
        setFeedback({
          type: 'error',
          title: 'No se detectó un código QR en la imagen',
          detail: 'Intentá acercar más la cámara al código QR del cliente con buena iluminación.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'Error al leer imagen QR',
        detail: err?.message || 'Intentá nuevamente.',
      });
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  };

  // Fetch backend points preview whenever saleAmount, category, or selectedPromoId changes
  useEffect(() => {
    const numAmount = Number(saleAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const res = await mondinoApi.previewPointsForStaff({
          amount: numAmount,
          category,
          promotionId: selectedPromoId || undefined,
        });
        setPreview(res);
      } catch {
        const fallbackBase = calculateClientPreviewBasePoints(
          numAmount,
          settings.basePointsRateLocked
        );
        setPreview({
          amount: numAmount,
          basePoints: fallbackBase,
          promoPoints: 0,
          totalPoints: fallbackBase,
          appliedPromotion: null,
        });
      } finally {
        setLoadingPreview(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [saleAmount, category, selectedPromoId]);

  const handleConfirmPurchase = async () => {
    if (!customer || !preview || submitting) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await mondinoApi.registerPurchaseForStaff({
        idempotencyKey,
        customerId: customer.id,
        amount: Number(saleAmount),
        category,
        promotionId: selectedPromoId || undefined,
        notes,
      });

      await refreshAllData();
      setShowConfirmModal(false);
      // Update displayed customer balance and rotate idempotency key to prevent duplicate submission
      setCustomer((prev) => (prev ? { ...prev, pointsBalance: res.newBalance } : null));
      setIdempotencyKey(generateIdempotencyKey('venta'));
      setNotes('');

      setFeedback({
        type: 'success',
        title: 'Compra registrada y puntos acreditados',
        detail: `Se acreditaron +${formatPoints(res.totalPoints)} puntos (${formatPoints(res.basePoints)} base + ${formatPoints(res.promoPoints)} bonificación) a ${res.customerName}. Nuevo saldo: ${formatPoints(res.newBalance)} puntos.`,
        operationId: res.purchaseId,
      });
    } catch (err: any) {
      setShowConfirmModal(false);
      setFeedback({
        type: 'error',
        title: 'Hubo un problema al registrar la compra',
        detail: err.message || 'No se pudo completar la operación.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateRedemptionCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redemptionCodeInput.trim() || validatingRedemption) return;
    setValidatingRedemption(true);
    setFeedback(null);

    try {
      const res = await mondinoApi.validateRedemptionForStaff(redemptionCodeInput);
      await refreshAllData();
      setRedemptionCodeInput('');
      setFeedback({
        type: 'success',
        title: 'Código de canje validado en mostrador',
        detail: `El código ${res.redemptionCode} fue marcado como UTILIZADO y ya no podrá volver a emplearse.`,
        operationId: res.id,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'No se pudo validar el código de canje',
        detail: err.message,
      });
    } finally {
      setValidatingRedemption(false);
    }
  };

  const activeClients = (adminData?.profiles || []).filter(
    (p) => p.status === 'ACTIVO'
  );
  const applicablePromotions = promotions.filter(
    (p) => p.isActive && (p.category === 'Todos' || p.category === category)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
            Terminal de Mostrador — Farmacia y Perfumería Mondino
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Escaneá el QR del cliente, ingresá el monto real de la venta y acreditá 1 punto cada
            $1.000 más promociones vigentes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setMode('compra-qr')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'compra-qr' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Registrar Compra con QR
          </button>
          <button
            type="button"
            onClick={() => setMode('validar-canje')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'validar-canje' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Validar Canje
          </button>
          <button
            type="button"
            onClick={() => setMode('beneficios')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'beneficios' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Beneficios y Fotos
          </button>
          <button
            type="button"
            onClick={() => setMode('novedades')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'novedades' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Novedades y Fotos
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl border p-4 flex items-start justify-between gap-4 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-semibold">{feedback.title}</p>
              <p className="text-xs leading-relaxed">{feedback.detail}</p>
              {feedback.operationId && (
                <p className="text-[11px] font-mono text-emerald-800">
                  Operación registrada ID: {feedback.operationId}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {mode === 'compra-qr' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Paso 1: Escanear / Identificar Cliente */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  1. Escanear QR del Cliente
                </h2>
                {customer && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setQrInput('');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cambiar cliente</span>
                  </button>
                )}
              </div>

              {/* Hidden File Input for Direct Camera Capture / Photo QR Fallback */}
              <input
                ref={qrFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleScanFromImageFile}
                className="hidden"
              />

              {/* Camera Scanner Button */}
              {!cameraActive ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="w-full min-h-[48px] rounded-xl bg-emerald-950 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Activar Cámara para Escanear QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => qrFileInputRef.current?.click()}
                    className="w-full min-h-[38px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImageUp className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Tomar foto o subir imagen del QR</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video border-2 border-emerald-700 shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={(e) => {
                        e.currentTarget.play().catch(() => {});
                      }}
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Target Overlay */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
                      <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] relative">
                        <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400/80 animate-pulse" />
                      </div>
                      <span className="mt-2 px-2.5 py-1 rounded-md bg-slate-950/80 text-[11px] font-medium text-emerald-200">
                        Apuntá al código QR del socio para seleccionarlo automáticamente
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Cambiar cámara</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="min-h-[40px] rounded-xl border border-red-200 bg-red-50/60 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Detener cámara
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Token / Search Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleValidateQrToken();
                }}
                className="space-y-2 pt-2 border-t border-slate-100"
              >
                <label className="block text-xs font-medium text-slate-600">
                  Código QR leído o email del socio:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: MND-QR-CLI01-74829B"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    className="flex-1 min-h-[42px] rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-emerald-800"
                  />
                  <button
                    type="submit"
                    disabled={validatingQr}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-900 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{validatingQr ? '...' : 'Validar'}</span>
                  </button>
                </div>
              </form>

              {/* Quick Simulation Buttons for Testing QR Scanning */}
              {activeClients.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Lectura rápida de socios registrados en mostrador:
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeClients.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setQrInput(c.qrToken);
                          handleValidateQrToken(c.qrToken);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          customer?.id === c.id
                            ? 'border-emerald-800 bg-emerald-50/70 text-emerald-950'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 truncate">
                            {c.qrToken}
                          </p>
                        </div>
                        <span className="font-mono font-semibold text-emerald-900 tabular-nums shrink-0 ml-2">
                          {formatPoints(c.pointsBalance)} pts
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cliente Identificado Card */}
            {customer && (
              <div className="rounded-2xl border-2 border-emerald-800 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" />
                    Cliente verificado por QR
                  </span>
                  <span className="text-xs font-medium text-emerald-800">{customer.status}</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{customer.fullName}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{customer.maskedEmail}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Saldo actual de puntos</span>
                  <span className="text-lg font-bold text-emerald-950 font-mono tabular-nums">
                    {formatPoints(customer.pointsBalance)} puntos
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Paso 2: Introducir Monto Real de la Venta y Previsualización Backend */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  2. Introducir Monto Real de la Venta
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  El empleado solo introduce el monto y categoría. El servidor calcula
                  automáticamente los puntos base ($1.000 = 1 punto) y las promociones aplicables.
                </p>
              </div>

              {/* Monto de la Venta */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Monto total de la venta ($ ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    placeholder="100000"
                    className="w-full min-h-[54px] pl-9 pr-4 py-3 rounded-xl border border-slate-300 text-2xl font-bold font-mono text-slate-900 tabular-nums focus:outline-none focus:border-emerald-800"
                  />
                </div>

                {/* Quick Example Amounts ($1.000, $10.000, $50.000, $100.000, $250.000) */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400">Montos rápidos:</span>
                  {BASE_POINTS_EXAMPLES.map((ex) => (
                    <button
                      key={ex.amount}
                      type="button"
                      onClick={() => setSaleAmount(String(ex.amount))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums border transition-colors cursor-pointer ${
                        Number(saleAmount) === ex.amount
                          ? 'bg-emerald-900 text-white border-emerald-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {formatCurrencyARS(ex.amount)} ({formatPoints(ex.points)} pts)
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoría & Promoción Aplicable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sector / Categoría de la compra
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSelectedPromoId('');
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:outline-none focus:border-emerald-800"
                  >
                    {PURCHASE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Promoción aplicable (automática o elegida)
                  </label>
                  <select
                    value={selectedPromoId}
                    onChange={(e) => setSelectedPromoId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:outline-none focus:border-emerald-800"
                  >
                    <option value="">Aplicar mejor promoción vigente automáticamente</option>
                    {applicablePromotions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Descripción / Resumen de compra (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Fragancia importada 100ml + Protector solar dermo"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-800"
                />
              </div>

              {/* Previsualización Calculada en Backend */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-800" />
                    Cálculo oficial validado por servidor ($1.000 = 1 punto)
                  </span>
                  <span>{loadingPreview ? 'Calculando...' : '$1.000 = 1 punto'}</span>
                </div>

                {preview ? (
                  <div className="space-y-2 pt-2 border-t border-slate-200 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">CLIENTE:</span>
                      <span className="font-semibold text-slate-900">
                        {customer ? customer.fullName : 'Seleccioná o escaneá un QR primero'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">VENTA:</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrencyARS(preview.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">PUNTOS BASE ($1.000 = 1 pto):</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatPoints(preview.basePoints)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        BONIFICACIÓN
                        {preview.appliedPromotion ? ` (${preview.appliedPromotion.title})` : ''}:
                      </span>
                      <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                        +{formatPoints(preview.promoPoints)}
                      </span>
                    </div>
                    <div className="pt-2.5 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">TOTAL A ACREDITAR:</span>
                      <span className="text-2xl font-bold text-emerald-950 font-mono tabular-nums">
                        {formatPoints(preview.totalPoints)} puntos
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2">
                    Ingresá un monto mayor a $0 para calcular los puntos.
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={!customer || !preview || preview.amount <= 0}
                onClick={() => setShowConfirmModal(true)}
                className="w-full min-h-[50px] rounded-xl bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                {customer
                  ? `Revisar y Confirmar compra para ${customer.fullName}`
                  : 'Escaneá el QR del cliente para continuar'}
              </button>
            </div>
          </div>
        </div>
      ) : mode === 'validar-canje' ? (
        /* Validar Código de Canje en Mostrador */
        <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <TicketCheck className="w-5 h-5 text-emerald-800" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Validar Código de Canje de Beneficio
              </h2>
              <p className="text-xs text-slate-500">
                Ingresá el código único del cliente para marcar el beneficio como entregado e
                impedir su doble utilización.
              </p>
            </div>
          </div>

          <form onSubmit={handleValidateRedemptionCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Código único de canje
              </label>
              <input
                type="text"
                required
                placeholder="Ej: MND-A1B2C3"
                value={redemptionCodeInput}
                onChange={(e) => setRedemptionCodeInput(e.target.value.toUpperCase())}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-4 py-2.5 text-base font-mono font-bold uppercase focus:outline-none focus:border-emerald-800"
              />
            </div>
            <button
              type="submit"
              disabled={validatingRedemption}
              className="w-full min-h-[46px] rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {validatingRedemption
                ? 'Validando código...'
                : 'Confirmar entrega y marcar como UTILIZADO'}
            </button>
          </form>
        </div>
      ) : mode === 'beneficios' ? (
        <AdminCatalogMarketingView section="beneficios" />
      ) : (
        <AdminCatalogMarketingView section="novedades" />
      )}

      {/* Modal de Confirmación Antes de Acreditar */}
      {showConfirmModal && customer && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800">
                  Verificación final de operación
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5 font-display">
                  Confirmar registro de compra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">CLIENTE:</span>
                <span className="font-bold text-slate-900">{customer.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">VENTA:</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatCurrencyARS(preview.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">PUNTOS BASE:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatPoints(preview.basePoints)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">BONIFICACIÓN:</span>
                <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                  +{formatPoints(preview.promoPoints)}
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900">TOTAL A ACREDITAR:</span>
                <span className="text-xl font-bold text-emerald-950 font-mono tabular-nums">
                  {formatPoints(preview.totalPoints)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-mono">
              ID único de operación (idempotencia): {idempotencyKey}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 min-h-[46px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmPurchase}
                className="flex-1 min-h-[46px] rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
              >
                {submitting ? 'Acreditando...' : 'Confirmar compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
