import React, { useEffect, useRef, useState } from 'react';
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
  const { adminData, promotions, refreshAllData } = useAuth();

  const [mode, setMode] = useState<'compra-qr' | 'validar-canje' | 'beneficios' | 'novedades'>(
    'compra-qr'
  );
  const [qrInput, setQrInput] = useState('');
  const [validatingQr, setValidatingQr] = useState(false);
  const [customer, setCustomer] = useState<ValidatedQrCustomer | null>(null);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const stopCamera = () => {
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

  const handleStartCamera = async () => {
    setFeedback(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Use native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const Detector = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
        const detector = new Detector({ formats: ['qr_code'] });
        const interval = setInterval(async () => {
          if (!videoRef.current || !streamRef.current) {
            clearInterval(interval);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const rawCode = barcodes[0].rawValue;
              clearInterval(interval);
              stopCamera();
              setQrInput(rawCode);
              await handleValidateQrToken(rawCode);
            }
          } catch {
            // continue scanning
          }
        }, 500);
      }
    } catch {
      setFeedback({
        type: 'error',
        title: 'Cámara no disponible en este navegador',
        detail:
          'Podés ingresar el código QR manualmente o seleccionar el QR del cliente debajo.',
      });
    }
  };

  const handleValidateQrToken = async (tokenToValidate?: string) => {
    const targetToken = (tokenToValidate ?? qrInput).trim();
    if (!targetToken) return;
    setValidatingQr(true);
    setFeedback(null);
    try {
      const res = await mondinoApi.validateQrForStaff(targetToken);
      setCustomer(res.customer);
      setIdempotencyKey(generateIdempotencyKey('venta'));
    } catch (err: any) {
      setCustomer(null);
      setFeedback({
        type: 'error',
        title: 'No se pudo validar el código QR',
        detail: err.message || 'El código QR no corresponde a una cuenta activa.',
      });
    } finally {
      setValidatingQr(false);
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
        const fallbackBase = calculateClientPreviewBasePoints(numAmount);
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
            Escaneá el QR del cliente, ingresá el monto real de la venta y acreditá el 1% más
            promociones vigentes.
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

              {/* Camera Scanner Button */}
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="w-full min-h-[48px] rounded-xl bg-emerald-950 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activar Cámara para Escanear QR</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-full min-h-[40px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Detener cámara
                  </button>
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
                  automáticamente el 1% ($100 = 1 punto) y las promociones aplicables.
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
                    Cálculo oficial validado por servidor (Regla 1%)
                  </span>
                  <span>{loadingPreview ? 'Calculando...' : '$100 = 1 punto'}</span>
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
                      <span className="text-slate-600">PUNTOS BASE (1%):</span>
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
